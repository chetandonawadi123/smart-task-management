from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime

def _clean_comment(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Comment cannot be empty or whitespace-only")
    return cleaned

class TaskCommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    comment: str = Field(min_length=1, max_length=5000)

    @field_validator("comment")
    @classmethod
    def comment_must_not_be_blank(cls, value: str) -> str:
        return _clean_comment(value)

class TaskCommentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    comment: str = Field(min_length=1, max_length=5000)

    @field_validator("comment")
    @classmethod
    def comment_must_not_be_blank(cls, value: str) -> str:
        return _clean_comment(value)

class TaskCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    user_id: int
    comment: str
    created_at: datetime

class TaskCommentListResponse(BaseModel):
    items: list[TaskCommentResponse]
    total: int
    limit: int
    offset: int
