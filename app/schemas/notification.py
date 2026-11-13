from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    organization_id: int
    actor_id: int | None
    task_id: int | None
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    limit: int
    offset: int

class UnreadCountResponse(BaseModel):
    unread_count: int

class MarkAllReadResponse(BaseModel):
    updated_count: int
