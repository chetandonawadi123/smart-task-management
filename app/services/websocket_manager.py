import logging
import asyncio
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.loop = None

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, user_id: int, websocket: WebSocket):
        if not self.loop:
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Total connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.append(connection)

            for conn in disconnected:
                self.disconnect(user_id, conn)

    def send_event_sync(self, user_id: int, event: dict):
        if not self.loop:
            try:
                self.loop = asyncio.get_event_loop()
            except RuntimeError:
                return

        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.send_personal_message(user_id, event),
                self.loop
            )

manager = ConnectionManager()
