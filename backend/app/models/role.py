"""User role enumeration."""

import enum


class RoleEnum(str, enum.Enum):
    CITIZEN = "citizen"
    WORKER = "worker"
    DEPARTMENT_ADMIN = "department_admin"
    CITY_ADMIN = "city_admin"
    SUPER_ADMIN = "super_admin"
