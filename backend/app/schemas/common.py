import re
from typing import Annotated

from pydantic import BeforeValidator, Field

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not _EMAIL_RE.match(email):
        raise ValueError("invalid email address")
    return email


# Allows demo domains like @itros.local that strict EmailStr rejects.
LoginEmail = Annotated[str, BeforeValidator(_normalize_email), Field(min_length=3)]
