
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminUser]


class CustomerDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminUser]
