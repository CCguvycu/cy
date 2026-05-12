# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for VoidLink Desktop
Bundles the tray app + entire FastAPI backend into one EXE.

Build with:
    cd voidlink/desktop
    pip install -r requirements-desktop.txt
    pip install -r ../backend/requirements.txt
    pyinstaller voidlink.spec
"""

import os
from pathlib import Path

ROOT = Path(SPECPATH).parent
BACKEND = ROOT / 'backend'

block_cipher = None

# Collect all backend Python files
backend_datas = [
    (str(BACKEND / 'app'), 'app'),
]

# Hidden imports needed by FastAPI / SQLAlchemy / jose etc.
hidden_imports = [
    # FastAPI
    'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
    'fastapi.middleware.trustedhost', 'fastapi.staticfiles',
    'fastapi.responses', 'fastapi.security',
    # Uvicorn
    'uvicorn', 'uvicorn.config', 'uvicorn.main', 'uvicorn.server',
    'uvicorn.protocols', 'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto', 'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan', 'uvicorn.lifespan.on',
    # SQLAlchemy async
    'sqlalchemy', 'sqlalchemy.ext.asyncio', 'sqlalchemy.dialects.sqlite',
    'aiosqlite',
    # Auth / crypto
    'jose', 'jose.jwt', 'passlib', 'passlib.context', 'passlib.handlers',
    'passlib.handlers.bcrypt',
    # Pydantic
    'pydantic', 'pydantic_settings', 'pydantic.v1',
    # HTTP
    'httpx', 'httpx._transports', 'httpx._transports.default',
    # Misc
    'multipart', 'aiofiles', 'psutil', 'qrcode', 'PIL',
    'slowapi', 'slowapi.util', 'slowapi.errors',
    # Tray / UI
    'pystray', 'pystray._win32',
    'PIL', 'PIL.Image', 'PIL.ImageDraw',
    'tkinter', 'tkinter.messagebox',
    # Windows
    'win32api', 'win32con', 'win32gui',
]

a = Analysis(
    ['tray_app.py'],
    pathex=[str(BACKEND), str(ROOT / 'desktop')],
    binaries=[],
    datas=backend_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'numpy', 'pandas', 'scipy', 'jupyter', 'IPython'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='VoidLink',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,       # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico',     # App icon (create with icon_gen.py)
    version='version_info.txt',
    uac_admin=False,     # No UAC prompt needed
)
