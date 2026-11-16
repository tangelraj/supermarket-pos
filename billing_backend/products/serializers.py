
from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "barcode",
            "sku",
            "category",
            "category_name",
            "description",
            "image",
            "purchase_price",
            "selling_price",
            "gst_percentage",
            "hsn_code",
            "stock_quantity",
            "low_stock_threshold",
            "expiry_date",
            "is_active",
        ]
