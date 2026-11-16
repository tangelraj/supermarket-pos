
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404

from rest_framework import generics, serializers, status
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


# Read-only access during local development
ReadPermission = AllowAny if settings.DEBUG else IsAuthenticated


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [ReadPermission]

    def get_queryset(self):
        queryset = Product.objects.filter(
            is_active=True
        ).select_related("category")

        search = self.request.query_params.get("search", "")
        barcode = self.request.query_params.get("barcode", "")

        if barcode:
            queryset = queryset.filter(barcode=barcode)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("name")


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [ReadPermission]


class RestockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class ProductRestockView(APIView):
    # Only authenticated staff can modify inventory
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            product = get_object_or_404(
                Product,
                pk=pk,
                is_active=True,
            )

            Product.objects.filter(pk=product.pk).update(
                stock_quantity=F("stock_quantity") + quantity
            )

            product.refresh_from_db()

        return Response(
            {
                "message": "Stock updated successfully",
                "product_id": product.id,
                "product_name": product.name,
                "added_quantity": quantity,
                "stock_quantity": product.stock_quantity,
            },
            status=status.HTTP_200_OK,
        )
