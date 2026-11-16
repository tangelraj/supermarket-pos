
from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "address",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_phone(self, value):
        value = value.strip()

        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                "Enter a valid 10-digit phone number."
            )

        return value
