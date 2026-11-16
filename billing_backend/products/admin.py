
from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "barcode",
        "sku",
        "category",
        "selling_price",
        "stock_quantity",
        "is_active",
    )

    list_filter = (
        "category",
        "is_active",
    )

    search_fields = (
        "name",
        "barcode",
        "sku",
    )

    list_editable = (
        "selling_price",
        "stock_quantity",
        "is_active",
    )
