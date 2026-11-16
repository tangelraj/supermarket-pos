
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_protect
from config.auth_views import (
    SessionView,
    StaffLoginView,
    StaffLogoutView,
)

def health_check(request):
    return JsonResponse({
        "status": "success",
        "message": "Supermarket Billing API is running"
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path("api/", include("products.urls")),
    path("api/sales/", include("sales.urls")),
    path(
    "api/customers/",
    include("customer_management.urls"),
    ),
    path(
    "api/auth/session/",
    SessionView.as_view(),
    name="auth-session",
),
path(
    "api/auth/login/",
    StaffLoginView.as_view(),
    name="auth-login",
),
path(
    "api/auth/logout/",
    StaffLogoutView.as_view(),
    name="auth-logout",
),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
