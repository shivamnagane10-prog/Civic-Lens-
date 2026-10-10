import json
from typing import List
from fastapi import WebSocket
from datetime import datetime, timezone

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict):
        message = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        text = json.dumps(message, default=str)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

ws_manager = WebSocketManager()
