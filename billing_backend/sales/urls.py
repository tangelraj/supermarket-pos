
from django.urls import path
from .views import CheckoutView, SalesHistoryView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("history/", SalesHistoryView.as_view(), name="sales-history"),
]
