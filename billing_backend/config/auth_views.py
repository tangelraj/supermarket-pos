
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser


# ============================================================
# SESSION CHECK + CSRF TOKEN
# GET /api/auth/session/
# ============================================================

@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        user = request.user

        authenticated = bool(
            user.is_authenticated
            and user.is_active
            and user.is_staff
        )

        csrf_token = get_token(request)

        return Response({
            "authenticated": authenticated,
            "username": (
                user.username if authenticated else None
            ),
            "csrfToken": csrf_token,
        })


# ============================================================
# STAFF LOGIN
# POST /api/auth/login/
# ============================================================

@method_decorator(csrf_protect, name="dispatch")
class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        if (
            not isinstance(username, str)
            or not isinstance(password, str)
            or not username.strip()
            or not password
        ):
            return Response(
                {"detail": "Username and password are required."},
                status=400,
            )

        user = authenticate(
            request,
            username=username.strip(),
            password=password,
        )

        if (
            user is None
            or not user.is_active
            or not user.is_staff
        ):
            return Response(
                {"detail": "Invalid staff credentials."},
                status=401,
            )

        login(request, user)

        # Login rotates the CSRF token.
        # Return the new token for subsequent protected requests.
        new_csrf_token = get_token(request)

        return Response({
            "message": "Login successful.",
            "authenticated": True,
            "username": user.username,
            "csrfToken": new_csrf_token,
        })


# ============================================================
# STAFF LOGOUT
# POST /api/auth/logout/
# ============================================================

@method_decorator(csrf_protect, name="dispatch")
class StaffLogoutView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        logout(request)

        return Response({
            "message": "Logged out successfully.",
            "authenticated": False,
        })
