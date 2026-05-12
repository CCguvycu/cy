"""
VoidLink Desktop Tray Application
Manages the backend server, Ollama, and provides a system tray interface.
Zero-setup: auto-installs Ollama, auto-generates config, auto-starts everything.
"""

import sys
import os
import threading
import subprocess
import time
import socket
import json
import logging
import webbrowser
import platform
import urllib.request
import urllib.error
import secrets
import shutil
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    APP_DIR = Path(sys.executable).parent
    BUNDLE_DIR = Path(sys._MEIPASS)
else:
    APP_DIR = Path(__file__).parent.parent / 'backend'
    BUNDLE_DIR = Path(__file__).parent.parent / 'backend'

DATA_DIR = Path(os.environ.get('APPDATA', Path.home())) / 'VoidLink'
DATA_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = DATA_DIR / 'voidlink.log'
CONFIG_FILE = DATA_DIR / 'config.json'
DB_PATH = DATA_DIR / 'voidlink.db'
UPLOADS_DIR = DATA_DIR / 'uploads'
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger('voidlink')

# ── Config ───────────────────────────────────────────────────────────────────

def load_or_create_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)

    cfg = {
        'secret_key': secrets.token_urlsafe(32),
        'admin_password': secrets.token_urlsafe(16),
        'port': 8000,
        'first_run': True,
    }
    with open(CONFIG_FILE, 'w') as f:
        json.dump(cfg, f, indent=2)
    log.info(f"Created config at {CONFIG_FILE}")
    return cfg


def write_env(cfg: dict):
    env_path = DATA_DIR / '.env'
    port = cfg.get('port', 8000)
    env_content = f"""HOST=0.0.0.0
PORT={port}
DEBUG=false
SECRET_KEY={cfg['secret_key']}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
ADMIN_USERNAME=admin
ADMIN_PASSWORD={cfg['admin_password']}
OLLAMA_BASE_URL=http://localhost:11434
DATABASE_URL=sqlite+aiosqlite:///{DB_PATH}
UPLOAD_DIR={UPLOADS_DIR}
ALLOWED_ORIGINS=*
RATE_LIMIT_PER_MINUTE=120
MONITOR_INTERVAL=5
"""
    env_path.write_text(env_content)
    return env_path


# ── Network helpers ───────────────────────────────────────────────────────────

def get_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'


def is_port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def wait_for_server(port: int, timeout: int = 30) -> bool:
    log.info(f"Waiting for server on port {port}...")
    for _ in range(timeout * 2):
        if is_port_open('127.0.0.1', port):
            return True
        time.sleep(0.5)
    return False


# ── Ollama management ─────────────────────────────────────────────────────────

OLLAMA_WINDOWS_URL = "https://ollama.com/download/OllamaSetup.exe"
OLLAMA_MAC_URL = "https://ollama.com/download/Ollama-darwin.zip"

def find_ollama() -> str | None:
    """Return path to ollama executable or None."""
    # Check PATH
    ollama = shutil.which('ollama')
    if ollama:
        return ollama
    # Common Windows install locations
    candidates = [
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'Ollama' / 'ollama.exe',
        Path('C:/Program Files/Ollama/ollama.exe'),
        Path(Path.home() / 'AppData' / 'Local' / 'Programs' / 'Ollama' / 'ollama.exe'),
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return None


def is_ollama_running() -> bool:
    try:
        req = urllib.request.urlopen('http://localhost:11434/', timeout=3)
        return req.status == 200
    except Exception:
        return False


def start_ollama(ollama_path: str):
    log.info("Starting Ollama...")
    try:
        subprocess.Popen(
            [ollama_path, 'serve'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0,
        )
        # Wait up to 15 seconds
        for _ in range(30):
            if is_ollama_running():
                log.info("Ollama started")
                return True
            time.sleep(0.5)
    except Exception as e:
        log.error(f"Failed to start Ollama: {e}")
    return False


def download_ollama(progress_callback=None):
    """Download and install Ollama silently."""
    if platform.system() != 'Windows':
        return False

    installer_path = DATA_DIR / 'OllamaSetup.exe'
    log.info("Downloading Ollama installer...")

    try:
        def reporthook(count, block_size, total_size):
            if progress_callback and total_size > 0:
                pct = int(count * block_size * 100 / total_size)
                progress_callback(min(pct, 100))

        urllib.request.urlretrieve(OLLAMA_WINDOWS_URL, installer_path, reporthook)
        log.info("Running Ollama installer silently...")

        result = subprocess.run(
            [str(installer_path), '/S'],  # Silent install
            timeout=120,
        )
        installer_path.unlink(missing_ok=True)
        return result.returncode == 0
    except Exception as e:
        log.error(f"Ollama download/install failed: {e}")
        return False


def ensure_default_model():
    """Pull phi3 (smallest) if no models installed."""
    try:
        req = urllib.request.urlopen('http://localhost:11434/api/tags', timeout=5)
        data = json.loads(req.read())
        if not data.get('models'):
            log.info("No models found. Pulling phi3 (smallest model)...")
            subprocess.Popen(
                ['ollama', 'pull', 'phi3'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
    except Exception:
        pass


# ── Backend server ────────────────────────────────────────────────────────────

_server_process = None
_server_thread = None


def start_backend_server(env_path: Path, port: int):
    """Start the FastAPI backend in a thread."""
    global _server_process

    if getattr(sys, 'frozen', False):
        # Run embedded uvicorn directly in-process
        _run_uvicorn_inprocess(env_path, port)
    else:
        # Dev mode: spawn python subprocess
        python = sys.executable
        main_path = BUNDLE_DIR / 'app' / 'main.py'
        env = {**os.environ, 'DOTENV_PATH': str(env_path)}
        _server_process = subprocess.Popen(
            [python, '-m', 'uvicorn', 'app.main:app',
             '--host', '0.0.0.0', '--port', str(port), '--no-access-log'],
            cwd=str(BUNDLE_DIR),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def _run_uvicorn_inprocess(env_path: Path, port: int):
    """Run uvicorn inside the frozen process."""
    # Load .env manually
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ[k.strip()] = v.strip()

    # Add bundled app to path
    sys.path.insert(0, str(BUNDLE_DIR))

    import uvicorn
    config = uvicorn.Config(
        'app.main:app',
        host='0.0.0.0',
        port=port,
        log_level='warning',
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


def stop_backend():
    global _server_process
    if _server_process:
        _server_process.terminate()
        _server_process = None


# ── Tray icon ─────────────────────────────────────────────────────────────────

def create_tray_icon_image(status: str = 'starting'):
    """Generate a simple colored icon using PIL."""
    from PIL import Image, ImageDraw

    size = 64
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    colors = {
        'starting': (255, 170, 0),
        'running': (0, 255, 136),
        'error': (255, 68, 68),
        'stopped': (136, 136, 170),
    }
    color = colors.get(status, colors['starting'])

    # Hexagon shape
    cx, cy, r = size // 2, size // 2, size // 2 - 4
    import math
    points = [(cx + r * math.cos(math.pi / 2 + i * math.pi / 3),
               cy + r * math.sin(math.pi / 2 + i * math.pi / 3))
              for i in range(6)]
    draw.polygon(points, fill=color)

    # Letter V
    draw.line([(20, 18), (32, 46)], fill='black', width=4)
    draw.line([(44, 18), (32, 46)], fill='black', width=4)

    return img


def build_tray_menu(cfg: dict, status_ref: list):
    import pystray

    port = cfg.get('port', 8000)
    local_ip = get_local_ip()
    server_url = f"http://{local_ip}:{port}"

    def open_browser(_):
        webbrowser.open(f"http://localhost:{port}/docs")

    def copy_server_url(_):
        try:
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()
            root.clipboard_clear()
            root.clipboard_append(server_url)
            root.update()
            root.destroy()
        except Exception:
            pass

    def show_credentials(_):
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            messagebox.showinfo(
                "VoidLink Credentials",
                f"Server URL:\n{server_url}\n\n"
                f"Username: admin\n"
                f"Password: {cfg['admin_password']}\n\n"
                f"Enter these in the VoidLink mobile app."
            )
            root.destroy()
        except Exception:
            pass

    def open_log(_):
        if platform.system() == 'Windows':
            os.startfile(str(LOG_FILE))

    def quit_app(icon):
        icon.stop()
        stop_backend()
        os.kill(os.getpid(), 9)

    status_str = 'Running' if status_ref[0] == 'running' else status_ref[0].title()

    return pystray.Menu(
        pystray.MenuItem(f"VoidLink  [{status_str}]", None, enabled=False),
        pystray.MenuItem(f"{server_url}", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Show Credentials", show_credentials),
        pystray.MenuItem("Copy Server URL", copy_server_url),
        pystray.MenuItem("Open API Docs", open_browser),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("View Log", open_log),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit VoidLink", quit_app),
    )


# ── Startup wizard (first run) ────────────────────────────────────────────────

def show_first_run_dialog(cfg: dict, server_url: str):
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo(
            "VoidLink is Ready!",
            f"VoidLink is running!\n\n"
            f"📱 Open the VoidLink app on your phone\n\n"
            f"Server URL:\n{server_url}\n\n"
            f"Username:  admin\n"
            f"Password:  {cfg['admin_password']}\n\n"
            f"💡 Tip: VoidLink will appear in your\n"
            f"system tray (bottom-right) from now on.\n\n"
            f"Your credentials are saved in:\n{CONFIG_FILE}"
        )
        root.destroy()

        # Mark first run done
        cfg['first_run'] = False
        with open(CONFIG_FILE, 'w') as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        log.error(f"First run dialog failed: {e}")


def show_ollama_install_dialog() -> bool:
    """Ask user if they want to install Ollama. Returns True if yes."""
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        result = messagebox.askyesno(
            "Install Ollama?",
            "VoidLink needs Ollama to run AI models.\n\n"
            "Ollama is free, open-source, and runs AI locally on your PC.\n\n"
            "Download and install Ollama now? (~80MB)\n\n"
            "This will happen automatically in the background."
        )
        root.destroy()
        return result
    except Exception:
        return True  # Default to yes if dialog fails


def show_downloading_dialog():
    try:
        import tkinter as tk
        root = tk.Tk()
        root.title("VoidLink Setup")
        root.geometry("350x120")
        root.resizable(False, False)
        root.configure(bg='#0a0a0f')

        tk.Label(root, text="Installing Ollama...", bg='#0a0a0f',
                 fg='#00ff88', font=('Consolas', 12, 'bold')).pack(pady=15)

        progress_var = tk.StringVar(value="Starting download...")
        tk.Label(root, textvariable=progress_var, bg='#0a0a0f',
                 fg='#8888aa', font=('Consolas', 10)).pack()

        return root, progress_var
    except Exception:
        return None, None


# ── Main entrypoint ───────────────────────────────────────────────────────────

def main():
    import pystray

    log.info("VoidLink Desktop starting...")

    cfg = load_or_create_config()
    port = cfg.get('port', 8000)
    env_path = write_env(cfg)
    local_ip = get_local_ip()
    server_url = f"http://{local_ip}:{port}"

    status_ref = ['starting']

    # Create initial tray icon
    icon_img = create_tray_icon_image('starting')
    tray = pystray.Icon(
        'VoidLink',
        icon_img,
        'VoidLink — Starting...',
        menu=build_tray_menu(cfg, status_ref),
    )

    def setup(icon):
        icon.visible = True
        _startup(icon, cfg, env_path, port, local_ip, server_url, status_ref)

    tray.run(setup)


def _startup(icon, cfg, env_path, port, local_ip, server_url, status_ref):
    import pystray

    def update_icon(status: str, tooltip: str):
        status_ref[0] = status
        icon.icon = create_tray_icon_image(status)
        icon.title = tooltip
        icon.menu = build_tray_menu(cfg, status_ref)

    update_icon('starting', 'VoidLink — Starting...')

    # ── Step 1: Ensure Ollama is available ───────────────────────────────────
    ollama_path = find_ollama()

    if not ollama_path:
        log.info("Ollama not found")
        if show_ollama_install_dialog():
            dlg_root, dlg_var = show_downloading_dialog()

            def progress(pct):
                if dlg_var:
                    dlg_var.set(f"Downloading... {pct}%")
                    if dlg_root:
                        dlg_root.update()

            if dlg_root:
                dlg_root.after(100, lambda: None)

            success = download_ollama(progress)

            if dlg_root:
                dlg_root.destroy()

            if success:
                ollama_path = find_ollama()
                log.info(f"Ollama installed at {ollama_path}")
            else:
                update_icon('error', 'VoidLink — Ollama install failed')
                _show_error("Ollama installation failed. Please install manually from ollama.com")
                return
        else:
            update_icon('error', 'VoidLink — Ollama required')
            return

    # ── Step 2: Start Ollama if not running ──────────────────────────────────
    if not is_ollama_running():
        update_icon('starting', 'VoidLink — Starting Ollama...')
        ok = start_ollama(ollama_path)
        if not ok:
            log.warning("Could not start Ollama, continuing anyway...")

    # ── Step 3: Start backend server ─────────────────────────────────────────
    update_icon('starting', 'VoidLink — Starting server...')

    server_thread = threading.Thread(
        target=start_backend_server,
        args=(env_path, port),
        daemon=True,
    )
    server_thread.start()

    # ── Step 4: Wait for server ready ────────────────────────────────────────
    ready = wait_for_server(port, timeout=30)
    if not ready:
        update_icon('error', 'VoidLink — Server failed to start')
        log.error("Server did not start in time")
        return

    update_icon('running', f'VoidLink — Running  •  {server_url}')
    log.info(f"VoidLink running at {server_url}")

    # ── Step 5: Pull default model if needed ────────────────────────────────
    threading.Thread(target=ensure_default_model, daemon=True).start()

    # ── Step 6: First run welcome dialog ────────────────────────────────────
    if cfg.get('first_run', True):
        threading.Thread(
            target=show_first_run_dialog,
            args=(cfg, server_url),
            daemon=True,
        ).start()


def _show_error(msg: str):
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("VoidLink Error", msg)
        root.destroy()
    except Exception:
        log.error(msg)


if __name__ == '__main__':
    main()
