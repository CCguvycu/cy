from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.user import User
from app.services.ollama_service import (
    get_available_models,
    pull_model,
    delete_model,
    check_ollama_health,
    CHARACTER_MODES,
    SUPPORTED_MODELS,
)

router = APIRouter(prefix="/api/models", tags=["models"])


class PullModelRequest(BaseModel):
    model_name: str


class DeleteModelRequest(BaseModel):
    model_name: str


@router.get("/")
async def list_models(current_user: User = Depends(get_current_user)):
    models = await get_available_models()
    return {"models": models, "ollama_healthy": await check_ollama_health()}


@router.get("/supported")
async def list_supported_models(current_user: User = Depends(get_current_user)):
    return {"models": list(SUPPORTED_MODELS.values())}


@router.get("/characters")
async def list_character_modes(current_user: User = Depends(get_current_user)):
    return {
        "modes": [
            {"id": k, "name": k.title(), "prompt": v}
            for k, v in CHARACTER_MODES.items()
        ]
    }


@router.post("/pull")
async def pull_model_endpoint(
    req: PullModelRequest,
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    async def stream():
        async for line in pull_model(req.model_name):
            yield line + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@router.delete("/{model_name}")
async def remove_model(
    model_name: str,
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    ok = await delete_model(model_name)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete model")
    return {"success": True}


@router.get("/health")
async def ollama_health():
    healthy = await check_ollama_health()
    return {"ollama_healthy": healthy}
