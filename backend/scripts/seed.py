"""Seed demo organization, users, and departments."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.entities import Department, Organization, User
from app.models.enums import UserRole


def seed() -> None:
    db = SessionLocal()
    try:
        if db.query(Organization).first():
            print("Seed skipped: data already exists")
            return

        org = Organization(name="ITROS Demo Office")
        db.add(org)
        db.flush()

        admin_dept = Department(organization_id=org.id, name="Administration")
        ops_dept = Department(organization_id=org.id, name="Operations")
        db.add_all([admin_dept, ops_dept])
        db.flush()

        password = hash_password(settings.seed_demo_password)
        users = [
            User(
                organization_id=org.id,
                department_id=admin_dept.id,
                email="admin@itros.local",
                password_hash=password,
                full_name="Admin User",
                role=UserRole.admin,
            ),
            User(
                organization_id=org.id,
                department_id=ops_dept.id,
                email="manager@itros.local",
                password_hash=password,
                full_name="Manager User",
                role=UserRole.manager,
            ),
            User(
                organization_id=org.id,
                department_id=ops_dept.id,
                email="employee@itros.local",
                password_hash=password,
                full_name="Employee One",
                role=UserRole.employee,
            ),
            User(
                organization_id=org.id,
                department_id=ops_dept.id,
                email="employee2@itros.local",
                password_hash=password,
                full_name="Employee Two",
                role=UserRole.employee,
            ),
        ]
        db.add_all(users)
        db.commit()
        print("Seed complete. Demo password:", settings.seed_demo_password)
        print("Users: admin@itros.local, manager@itros.local, employee@itros.local")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
