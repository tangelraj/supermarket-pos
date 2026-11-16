
import uuid
from django.db import models
from products.models import Product


class Sale(models.Model):
    PAYMENT_CHOICES = [
        ("cash", "Cash"),
        ("upi", "UPI"),
        ("card", "Card"),
    ]

    invoice_number = models.CharField(
        max_length=40,
        unique=True,
        editable=False
    )

    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_CHOICES
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = (
                f"INV-{uuid.uuid4().hex[:12].upper()}"
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.invoice_number


class SaleItem(models.Model):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT
    )

    product_name = models.CharField(max_length=200)

    quantity = models.PositiveIntegerField()

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"
