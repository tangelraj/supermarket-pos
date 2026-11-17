
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils.dateparse import parse_datetime

from products.models import Category, Product
from sales.models import Sale, SaleItem
from customer_management.models import Customer


class Command(BaseCommand):
    help = "Safely restore local POS records into PostgreSQL."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True)
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--confirm-database", default="")

    def handle(self, *args, **options):
        path = Path(options["file"])

        if not path.is_file():
            raise CommandError("Backup JSON file not found.")

        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, list):
            raise CommandError("Invalid fixture format.")

        expected = {
            "products.category": 10,
            "products.product": 8,
            "sales.sale": 5,
            "sales.saleitem": 11,
            "customer_management.customer": 1,
        }

        counts = Counter(row["model"] for row in data)

        if dict(counts) != expected:
            raise CommandError(
                f"Unexpected fixture counts: {dict(counts)}"
            )

        if connection.vendor != "postgresql":
            raise CommandError(
                "This command only runs against PostgreSQL."
            )

        database_name = connection.settings_dict["NAME"]
        database_host = connection.settings_dict["HOST"]

        self.stdout.write(f"Database: {database_name}")
        self.stdout.write(f"Host: {database_host}")

        if options["apply"]:
            if options["confirm_database"] != database_name:
                raise CommandError(
                    "Database confirmation missing or incorrect."
                )

        grouped = {
            model: [
                row for row in data
                if row["model"] == model
            ]
            for model in expected
        }

        try:
            with transaction.atomic():
                # Lock imported model tables to prevent
                # concurrent writes during the merge.
                with connection.cursor() as cursor:
                    cursor.execute(
                        "LOCK TABLE "
                        "products_category, products_product, "
                        "sales_sale, sales_saleitem, "
                        "customer_management_customer "
                        "IN SHARE ROW EXCLUSIVE MODE"
                    )

                stats = Counter()

                categories = self.restore_categories(
                    grouped["products.category"], stats
                )

                products = self.restore_products(
                    grouped["products.product"],
                    categories,
                    stats,
                )

                sales = self.restore_sales(
                    grouped["sales.sale"], stats
                )

                self.restore_items(
                    grouped["sales.saleitem"],
                    sales,
                    products,
                    stats,
                )

                self.restore_customers(
                    grouped["customer_management.customer"],
                    stats,
                )

                self.stdout.write("\nRestoration summary:")
                for key, value in sorted(stats.items()):
                    self.stdout.write(f"{key}: {value}")

                if options["apply"]:
                    self.stdout.write(
                        self.style.SUCCESS(
                            "All records committed successfully."
                        )
                    )
                else:
                    transaction.set_rollback(True)
                    self.stdout.write(
                        self.style.WARNING(
                            "DRY RUN SUCCESSFUL. "
                            "All changes rolled back."
                        )
                    )

        except Exception as error:
            raise CommandError(
                f"Restoration stopped; transaction rolled back: "
                f"{error}"
            ) from error

    def parse_timestamp(self, value, label):
        parsed = parse_datetime(value)
        if parsed is None:
            raise ValueError(f"Invalid timestamp: {label}")
        return parsed

    def restore_categories(self, records, stats):
        mapping = {}

        for row in records:
            fields = row["fields"]
            name = fields["name"]

            category = Category.objects.filter(
                name=name
            ).first()

            if category is None:
                category = Category.objects.create(
                    name=name,
                    description=fields.get("description", ""),
                )
                stats["categories_created"] += 1
            else:
                stats["categories_existing"] += 1

            if row.get("pk") is None:
                raise ValueError(
                    "Category source ID is missing."
                )

            mapping[row["pk"]] = category

        return mapping

    def restore_products(self, records, categories, stats):
        mapping = {}

        for row in records:
            fields = row["fields"]
            barcode = fields["barcode"]
            sku = fields["sku"]

            barcode_match = Product.objects.filter(
                barcode=barcode
            ).first()

            sku_match = Product.objects.filter(
                sku=sku
            ).first()

            if barcode_match and sku_match:
                if barcode_match.pk != sku_match.pk:
                    raise ValueError(
                        f"Barcode/SKU conflict for {sku}"
                    )

            product = barcode_match or sku_match

            if product is not None:
                if (
                    product.barcode != barcode
                    or product.sku != sku
                ):
                    raise ValueError(
                        f"Product identity conflict for {sku}"
                    )

                # Existing products and their stock are
                # intentionally left unchanged.
                stats["products_existing"] += 1

            else:
                old_category = fields["category"]

                if old_category not in categories:
                    raise ValueError(
                        f"Missing category ID {old_category}"
                    )

                values = {
                    key: value
                    for key, value in fields.items()
                    if key not in {
                        "category",
                        "created_at",
                        "updated_at",
                    }
                }

                product = Product.objects.create(
                    category=categories[old_category],
                    **values,
                )

                updates = {}
                for name in ("created_at", "updated_at"):
                    if fields.get(name):
                        updates[name] = self.parse_timestamp(
                            fields[name], f"{sku}.{name}"
                        )

                if updates:
                    Product.objects.filter(
                        pk=product.pk
                    ).update(**updates)

                stats["products_created"] += 1

            if row.get("pk") is None:
                raise ValueError("Product source ID missing.")

            mapping[row["pk"]] = product

        return mapping

    def restore_sales(self, records, stats):
        mapping = {}

        for row in records:
            fields = row["fields"]
            invoice = fields["invoice_number"]

            if Sale.objects.filter(
                invoice_number=invoice
            ).exists():
                raise ValueError(
                    f"Invoice already exists: {invoice}. "
                    "No changes made. Review before retrying."
                )

            sale = Sale.objects.create(
                invoice_number=invoice,
                payment_method=fields["payment_method"],
                subtotal=Decimal(fields["subtotal"]),
                tax_amount=Decimal(fields["tax_amount"]),
                total_amount=Decimal(fields["total_amount"]),
            )

            if fields.get("created_at"):
                timestamp = self.parse_timestamp(
                    fields["created_at"], invoice
                )

                Sale.objects.filter(
                    pk=sale.pk
                ).update(created_at=timestamp)

            if row.get("pk") is None:
                raise ValueError("Sale source ID missing.")

            mapping[row["pk"]] = sale
            stats["sales_created"] += 1

        return mapping

    def restore_items(
        self, records, sales, products, stats
    ):
        for row in records:
            fields = row["fields"]

            old_sale_id = fields["sale"]
            old_product_id = fields["product"]

            if old_sale_id not in sales:
                raise ValueError(
                    f"Missing sale ID {old_sale_id}"
                )

            if old_product_id not in products:
                raise ValueError(
                    f"Missing product ID {old_product_id}"
                )

            SaleItem.objects.create(
                sale=sales[old_sale_id],
                product=products[old_product_id],
                product_name=fields["product_name"],
                quantity=fields["quantity"],
                unit_price=Decimal(fields["unit_price"]),
                line_total=Decimal(fields["line_total"]),
            )

            stats["sale_items_created"] += 1

    def restore_customers(self, records, stats):
        for row in records:
            fields = row["fields"]
            phone = fields["phone"]

            customer = Customer.objects.filter(
                phone=phone
            ).first()

            if customer is not None:
                # Do not overwrite today's customer data.
                stats["customers_existing"] += 1
                continue

            customer = Customer.objects.create(
                name=fields["name"],
                phone=phone,
                email=fields.get("email"),
                address=fields.get("address", ""),
            )

            updates = {}
            for name in ("created_at", "updated_at"):
                if fields.get(name):
                    updates[name] = self.parse_timestamp(
                        fields[name], f"customer.{name}"
                    )

            if updates:
                Customer.objects.filter(
                    pk=customer.pk
                ).update(**updates)

            stats["customers_created"] += 1
