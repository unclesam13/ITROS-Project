from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str
    code: str
    field_errors: dict | None = None


class PaginatedMeta(BaseModel):
    page: int
    page_size: int
    total: int


class MessageResponse(BaseModel):
    message: str
