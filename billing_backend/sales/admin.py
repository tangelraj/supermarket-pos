
from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    can_delete = False
    readonly_fields = [
        "product",
        "product_name",
        "quantity",
        "unit_price",
        "line_total",
    ]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "payment_method",
        "total_amount",
        "created_at",
    ]

    search_fields = ["invoice_number"]
    list_filter = ["payment_method", "created_at"]
    readonly_fields = [
        "invoice_number",
        "payment_method",
        "subtotal",
        "tax_amount",
        "total_amount",
        "created_at",
    ]
    inlines = [SaleItemInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
