
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Create a one-time production Django superuser."

    def handle(self, *args, **options):
        username = os.environ.get(
            "ADMIN_USERNAME", ""
        ).strip()

        email = os.environ.get(
            "ADMIN_EMAIL", ""
        ).strip()

        password = os.environ.get(
            "ADMIN_PASSWORD", ""
        )

        if not username or not email or not password:
            raise CommandError(
                "ADMIN_USERNAME, ADMIN_EMAIL and "
                "ADMIN_PASSWORD are required."
            )

        if len(password) < 12:
            raise CommandError(
                "ADMIN_PASSWORD must contain "
                "at least 12 characters."
            )

        User = get_user_model()

        with transaction.atomic():
            if User.objects.filter(
                username=username
            ).exists():
                raise CommandError(
                    "This username already exists. "
                    "No account was changed."
                )

            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Production superuser created successfully."
            )
        )
