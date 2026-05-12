from datetime import timedelta
from typing import Optional
import io
import qrcode

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    generate_device_token,
    generate_qr_payload,
    get_current_user,
)
from app.core.config import settings
from app.models.user import User
from app.models.device import Device
from app.services.user_service import authenticate_user, create_user, get_user_by_username

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_admin: bool


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class DevicePairRequest(BaseModel):
    device_name: str
    device_type: str = "mobile"
    platform: Optional[str] = None
    push_token: Optional[str] = None


@router.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        is_admin=user.is_admin,
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = await create_user(db, req.username, req.password, req.email)
    token = create_access_token({"sub": user.username})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        is_admin=user.is_admin,
    )


@router.post("/pair-device")
async def pair_device(
    req: DevicePairRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device_token = generate_device_token()
    device = Device(
        user_id=current_user.id,
        name=req.device_name,
        token=device_token,
        device_type=req.device_type,
        platform=req.platform,
        push_token=req.push_token,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    access_token = create_access_token(
        {"sub": current_user.username, "device_id": device.id},
        expires_delta=timedelta(days=365),
    )
    return {"device_id": device.id, "device_token": device_token, "access_token": access_token}


@router.get("/qr-code")
async def get_qr_code(
    server_url: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device_token = generate_device_token()
    device = Device(
        user_id=current_user.id,
        name="QR Paired Device",
        token=device_token,
        device_type="mobile",
    )
    db.add(device)
    await db.commit()

    payload = generate_qr_payload(device_token, server_url)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "memory_enabled": current_user.memory_enabled,
        "character_mode": current_user.character_mode,
        "system_prompt": current_user.system_prompt,
    }
