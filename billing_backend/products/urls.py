
from django.urls import path
from .views import (
    ProductListView,
    CategoryListView,
    ProductRestockView,
)

urlpatterns = [
    path(
        "products/",
        ProductListView.as_view(),
        name="product-list",
    ),
    path(
        "categories/",
        CategoryListView.as_view(),
        name="category-list",
    ),
    path(
        "products/<int:pk>/restock/",
        ProductRestockView.as_view(),
        name="product-restock",
    ),
]
