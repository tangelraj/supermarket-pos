
from django.db import models
from decimal import Decimal


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    name = models.CharField(max_length=200)
    barcode = models.CharField(
        max_length=100,
        unique=True
    )
    sku = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True
    )

    purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    gst_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    hsn_code = models.CharField(
        max_length=20,
        blank=True
    )

    stock_quantity = models.PositiveIntegerField(
        default=0
    )

    low_stock_threshold = models.PositiveIntegerField(
        default=10
    )

    expiry_date = models.DateField(
        blank=True,
        null=True
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.low_stock_threshold
