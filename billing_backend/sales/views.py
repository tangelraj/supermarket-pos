
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics
from .models import Sale

from products.models import Product
from .models import Sale, SaleItem


class CheckoutView(APIView):
    # Local testing only. Require authentication in production.
    permission_classes = [
        AllowAny if settings.DEBUG else IsAuthenticated
    ]

    def post(self, request):
        items = request.data.get("items")
        payment_method = request.data.get("payment_method")

        if payment_method not in ["cash", "upi", "card"]:
            return Response(
                {"error": "Invalid payment method"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(items, list) or not items:
            return Response(
                {"error": "Cart cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        quantities = {}

        for item in items:
            if not isinstance(item, dict):
                return Response(
                    {"error": "Invalid cart item"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            product_id = item.get("product_id")
            quantity = item.get("quantity")

            if (
                isinstance(product_id, bool)
                or not isinstance(product_id, int)
                or product_id <= 0
                or isinstance(quantity, bool)
                or not isinstance(quantity, int)
                or quantity <= 0
            ):
                return Response(
                    {"error": "Invalid product or quantity"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            quantities[product_id] = (
                quantities.get(product_id, 0) + quantity
            )

        try:
            with transaction.atomic():
                products = {
                    p.id: p
                    for p in Product.objects.filter(
                        id__in=quantities.keys(),
                        is_active=True
                    ).order_by("id")
                }

                if len(products) != len(quantities):
                    return Response(
                        {"error": "Product unavailable"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                subtotal = Decimal("0.00")
                sale_lines = []

                for product_id, quantity in sorted(
                    quantities.items()
                ):
                    product = products[product_id]

                    if product.stock_quantity < quantity:
                        return Response(
                            {
                                "error": (
                                    f"Insufficient stock for "
                                    f"{product.name}"
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    price = product.selling_price
                    line_total = price * quantity
                    subtotal += line_total

                    sale_lines.append(
                        (product, quantity, price, line_total)
                    )

                # Temporary: prices are treated as final.
                # GST calculation will be added separately.
                tax_amount = Decimal("0.00")
                total_amount = subtotal

                # Conditional updates prevent overselling.
                for product, quantity, price, line_total in sale_lines:
                    updated = Product.objects.filter(
                        pk=product.pk,
                        stock_quantity__gte=quantity
                    ).update(
                        stock_quantity=F("stock_quantity") - quantity
                    )

                    if updated != 1:
                        raise ValueError(
                            f"Stock changed for {product.name}. "
                            "Please refresh and try again."
                        )

                sale = Sale.objects.create(
                    payment_method=payment_method,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    total_amount=total_amount
                )

                for product, quantity, price, line_total in sale_lines:
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        product_name=product.name,
                        quantity=quantity,
                        unit_price=price,
                        line_total=line_total
                    )

                return Response(
                    {
                        "message": "Sale saved successfully",
                        "sale_id": sale.id,
                        "invoice_number": sale.invoice_number,
                        "payment_method": sale.payment_method,
                        "subtotal": str(sale.subtotal),
                        "tax_amount": str(sale.tax_amount),
                        "total_amount": str(sale.total_amount),
                        "items": [
                            {
                                "product": p.name,
                                "quantity": q,
                                "unit_price": str(price),
                                "line_total": str(line)
                            }
                            for p, q, price, line in sale_lines
                        ]
                    },
                    status=status.HTTP_201_CREATED
                )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_409_CONFLICT
            )

class SalesHistoryView(generics.ListAPIView):
    permission_classes = [
        AllowAny if settings.DEBUG else IsAuthenticated
    ]

    def get(self, request, *args, **kwargs):
        sales = (
            Sale.objects
            .prefetch_related("items")
            .order_by("-created_at")
        )

        data = []

        for sale in sales:
            data.append({
                "id": sale.id,
                "invoice_number": sale.invoice_number,
                "payment_method": sale.payment_method,
                "subtotal": str(sale.subtotal),
                "tax_amount": str(sale.tax_amount),
                "total_amount": str(sale.total_amount),
                "created_at": sale.created_at.isoformat(),
                "items": [
                    {
                        "product": item.product_name,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "line_total": str(item.line_total),
                    }
                    for item in sale.items.all()
                ],
            })

        return Response(data)
