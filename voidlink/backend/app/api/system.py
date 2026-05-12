import asyncio
import json
import subprocess
import shlex
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.security import get_current_user, decode_token
from app.core.config import settings
from app.models.user import User
from app.services.system_service import get_full_system_stats
from app.services.user_service import update_user_settings

router = APIRouter(prefix="/api/system", tags=["system"])

ALLOWED_COMMANDS = {
    "ls", "pwd", "echo", "cat", "grep", "find", "ps",
    "df", "du", "free", "top", "htop", "uname", "hostname",
    "whoami", "date", "uptime", "ollama",
}


class TerminalRequest(BaseModel):
    command: str


class UserSettingsUpdate(BaseModel):
    system_prompt: Optional[str] = None
    character_mode: Optional[str] = None
    memory_enabled: Optional[bool] = None
    memory_context: Optional[str] = None


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    return await get_full_system_stats()


@router.websocket("/stats/stream/{token}")
async def stream_stats(websocket: WebSocket, token: str):
    await websocket.accept()
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    try:
        while True:
            stats = await get_full_system_stats()
            await websocket.send_text(json.dumps(stats))
            await asyncio.sleep(settings.MONITOR_INTERVAL)
    except WebSocketDisconnect:
        pass


@router.post("/terminal")
async def execute_terminal(
    req: TerminalRequest,
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Terminal access requires admin")

    try:
        parts = shlex.split(req.command)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid command: {e}")

    if not parts:
        raise HTTPException(status_code=400, detail="Empty command")

    base_cmd = parts[0]
    if base_cmd not in ALLOWED_COMMANDS:
        raise HTTPException(
            status_code=403,
            detail=f"Command '{base_cmd}' not in allowed list. Allowed: {', '.join(sorted(ALLOWED_COMMANDS))}",
        )

    try:
        result = subprocess.run(
            parts,
            capture_output=True,
            text=True,
            timeout=15,
            cwd="/",
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_settings(
    req: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        updates = {k: v for k, v in req.model_dump().items() if v is not None}
        user = await update_user_settings(db, current_user.id, **updates)
        return {
            "system_prompt": user.system_prompt,
            "character_mode": user.character_mode,
            "memory_enabled": user.memory_enabled,
        }


@router.get("/discovery")
async def lan_discovery():
    import socket
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "unknown"

    return {
        "service": "VoidLink",
        "version": "1.0.0",
        "hostname": hostname,
        "local_ip": local_ip,
        "port": settings.PORT,
        "tailscale_hostname": settings.TAILSCALE_HOSTNAME,
    }
