from fastapi import HTTPException, status


class AppHTTPException(HTTPException):
    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(status_code=status_code, detail={"detail": detail, "code": code})


def unauthorized(detail: str = "Invalid credentials") -> AppHTTPException:
    return AppHTTPException(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", detail)


def forbidden(detail: str = "Access denied") -> AppHTTPException:
    return AppHTTPException(status.HTTP_403_FORBIDDEN, "FORBIDDEN", detail)


def not_found(detail: str = "Resource not found") -> AppHTTPException:
    return AppHTTPException(status.HTTP_404_NOT_FOUND, "NOT_FOUND", detail)


def routing_failed(detail: str = "No eligible assignee") -> AppHTTPException:
    return AppHTTPException(status.HTTP_409_CONFLICT, "ROUTING_FAILED", detail)
