import os
import uuid
import aiofiles
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "text/plain", "text/markdown", "application/pdf",
    "application/json", "text/csv",
}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return {
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "url": f"/api/files/{current_user.id}/{filename}",
    }


@router.get("/{user_id}/{filename}")
async def get_file(
    user_id: int,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Sanitize filename to prevent path traversal
    safe_name = Path(filename).name
    file_path = Path(settings.UPLOAD_DIR) / str(user_id) / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(file_path))


@router.get("/")
async def list_files(current_user: User = Depends(get_current_user)):
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    if not upload_dir.exists():
        return {"files": []}

    files = []
    for f in upload_dir.iterdir():
        if f.is_file():
            stat = f.stat()
            files.append({
                "filename": f.name,
                "size_bytes": stat.st_size,
                "url": f"/api/files/{current_user.id}/{f.name}",
            })

    return {"files": files}


@router.delete("/{filename}")
async def delete_file(filename: str, current_user: User = Depends(get_current_user)):
    safe_name = Path(filename).name
    file_path = Path(settings.UPLOAD_DIR) / str(current_user.id) / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_path.unlink()
    return {"success": True}
