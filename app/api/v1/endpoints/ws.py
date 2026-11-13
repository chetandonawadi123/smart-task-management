import logging
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

async def get_websocket_user(
    db: Session,
    token: str
) -> User | None:
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))

        user = db.scalar(select(User).where(User.id == user_id))
        if user is None or not user.is_active:
            return None
        return user
    except (jwt.InvalidTokenError, TypeError, ValueError, Exception):
        return None

@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
    db: Session = Depends(get_db)
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await get_websocket_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            # Keep connection alive, listen for disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(user.id, websocket)
