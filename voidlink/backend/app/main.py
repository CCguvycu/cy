import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db
from app.core.security import hash_password
from app.api import auth, chat, models, files, system

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    await init_db()

    # Seed admin user
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == settings.ADMIN_USERNAME))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print(f"[VoidLink] Admin user '{settings.ADMIN_USERNAME}' created")

    # Ensure upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"[VoidLink] Backend started on {settings.HOST}:{settings.PORT}")
    yield
    print("[VoidLink] Backend shutting down")


app = FastAPI(
    title="VoidLink API",
    description="Remote AI model access system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(models.router)
app.include_router(files.router)
app.include_router(system.router)


@app.get("/")
async def root():
    return {
        "service": "VoidLink",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


@app.get("/health")
async def health():
    from app.services.ollama_service import check_ollama_health
    ollama_ok = await check_ollama_health()
    return {
        "status": "healthy",
        "ollama": "connected" if ollama_ok else "disconnected",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
