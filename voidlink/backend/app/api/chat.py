import json
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, decode_token
from app.models.user import User
from app.services.ollama_service import chat_stream, generate_title, CHARACTER_MODES
from app.services.conversation_service import (
    create_conversation,
    get_conversation,
    list_conversations,
    update_conversation_title,
    delete_conversation,
    add_message,
    get_messages_for_context,
    create_folder,
    list_folders,
    delete_folder,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    model: str = "llama3"
    message: str
    system_prompt: Optional[str] = None
    character_mode: Optional[str] = None
    temperature: float = 0.7
    folder_id: Optional[int] = None
    attachments: Optional[List[str]] = None


class ConversationCreate(BaseModel):
    model: str = "llama3"
    title: str = "New Chat"
    folder_id: Optional[int] = None
    system_prompt: Optional[str] = None


class FolderCreate(BaseModel):
    name: str
    color: str = "#00ff88"


@router.post("/send")
async def send_message(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Resolve or create conversation
    if req.conversation_id:
        conv = await get_conversation(db, req.conversation_id, current_user.id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = await create_conversation(
            db,
            current_user.id,
            req.model,
            folder_id=req.folder_id,
            system_prompt=req.system_prompt,
        )

    # Save user message
    await add_message(db, conv.id, "user", req.message, attachments=req.attachments)

    # Build context messages
    history = await get_messages_for_context(db, conv.id)
    messages = [{"role": m.role, "content": m.content} for m in history if m.role in ("user", "assistant")]

    # Resolve system prompt
    sys_prompt = req.system_prompt or current_user.system_prompt
    if req.character_mode and req.character_mode in CHARACTER_MODES:
        sys_prompt = CHARACTER_MODES[req.character_mode]
    elif current_user.character_mode and current_user.character_mode in CHARACTER_MODES:
        sys_prompt = CHARACTER_MODES[current_user.character_mode]

    # Inject memory
    if current_user.memory_enabled and current_user.memory_context:
        memory_block = f"\n[User Memory]\n{current_user.memory_context}"
        sys_prompt = (sys_prompt or "") + memory_block

    full_response = []

    async def stream_response():
        nonlocal full_response
        try:
            async for chunk in chat_stream(req.model, messages, sys_prompt, req.temperature):
                full_response.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk, 'conversation_id': conv.id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            full_text = "".join(full_response)
            if full_text:
                await add_message(db, conv.id, "assistant", full_text, model=req.model)
                # Auto-generate title on first message
                if len(history) <= 1:
                    title = await generate_title(req.model, req.message)
                    await update_conversation_title(db, conv.id, current_user.id, title)
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Conversation-ID": str(conv.id),
        },
    )


@router.get("/conversations")
async def get_conversations(
    folder_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convs = await list_conversations(db, current_user.id, folder_id, limit, offset)
    return [
        {
            "id": c.id,
            "title": c.title,
            "model": c.model,
            "folder_id": c.folder_id,
            "is_pinned": c.is_pinned,
            "total_tokens": c.total_tokens,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]


@router.get("/conversations/{conv_id}")
async def get_conversation_detail(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await get_conversation(db, conv_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": conv.id,
        "title": conv.title,
        "model": conv.model,
        "system_prompt": conv.system_prompt,
        "folder_id": conv.folder_id,
        "is_pinned": conv.is_pinned,
        "total_tokens": conv.total_tokens,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "model": m.model,
                "tokens": m.tokens,
                "attachments": m.attachments,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in conv.messages
        ],
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


@router.delete("/conversations/{conv_id}")
async def remove_conversation(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = await delete_conversation(db, conv_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@router.post("/conversations")
async def new_conversation(
    req: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await create_conversation(db, current_user.id, req.model, req.title, req.folder_id, req.system_prompt)
    return {"id": conv.id, "title": conv.title, "model": conv.model}


@router.get("/folders")
async def get_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folders = await list_folders(db, current_user.id)
    return [{"id": f.id, "name": f.name, "color": f.color} for f in folders]


@router.post("/folders")
async def new_folder(
    req: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder = await create_folder(db, current_user.id, req.name, req.color)
    return {"id": folder.id, "name": folder.name, "color": folder.color}


@router.delete("/folders/{folder_id}")
async def remove_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = await delete_folder(db, folder_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"success": True}


# WebSocket endpoint for real-time streaming
@router.websocket("/ws/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    await websocket.accept()
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            model = data.get("model", "llama3")
            messages = data.get("messages", [])
            system_prompt = data.get("system_prompt")
            temperature = data.get("temperature", 0.7)

            full_response = []
            async for chunk in chat_stream(model, messages, system_prompt, temperature):
                full_response.append(chunk)
                await websocket.send_text(json.dumps({"type": "chunk", "content": chunk}))

            await websocket.send_text(json.dumps({
                "type": "done",
                "full_response": "".join(full_response),
            }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
