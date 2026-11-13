from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Project name is required")
        return cleaned

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ProjectCreate(ProjectWrite):
    pass


class ProjectUpdate(ProjectWrite):
    pass


class ProjectResponse(BaseModel):
    id: int
    organization_id: int
    owner_id: int
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
