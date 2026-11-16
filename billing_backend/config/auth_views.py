
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import (
    ensure_csrf_cookie,
    csrf_protect,
)
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        user = request.user

        return Response({
            "authenticated": bool(
                user.is_authenticated
                and user.is_active
                and user.is_staff
            ),
            "username": (
                user.username
                if user.is_authenticated
                and user.is_staff
                else None
            ),
        })


@method_decorator(csrf_protect, name="dispatch")
class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        if not isinstance(username, str) or not isinstance(password, str):
            return Response(
                {"detail": "Invalid credentials."},
                status=400,
            )

        user = authenticate(
            request,
            username=username,
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

        return Response({
            "message": "Login successful",
            "username": user.username,
            "authenticated": True,
        })


@method_decorator(csrf_protect, name="dispatch")
class StaffLogoutView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        logout(request)

        return Response({
            "message": "Logged out successfully",
        })
