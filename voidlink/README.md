# VoidLink — Remote AI Interface

> Control your locally hosted AI models from anywhere.  
> Cyberpunk aesthetic. Zero telemetry. Local-first.

---

## Architecture

```
VoidLink
├── backend/          # Python FastAPI server
│   ├── app/
│   │   ├── api/      # Route handlers (auth, chat, models, files, system)
│   │   ├── core/     # Config, DB, Security
│   │   ├── models/   # SQLAlchemy ORM models
│   │   └── services/ # Business logic (Ollama, conversations, system stats)
│   ├── requirements.txt
│   └── run.py
├── mobile/           # React Native Expo app
│   ├── app/          # Expo Router screens
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── services/     # API client
│   │   ├── store/        # Zustand state
│   │   └── utils/        # Theme, helpers
│   └── package.json
└── docker/           # Docker + Nginx configs
```

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installed and running
- At least one model pulled: `ollama pull llama3`

### 2. Backend Setup

```bash
cd voidlink/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your SECRET_KEY and ADMIN_PASSWORD

# Start the server
python run.py
```

The API will be available at `http://localhost:8000`  
Default admin credentials: `admin / changeme` (change in .env!)

### 3. Mobile App Setup

```bash
cd voidlink/mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Scan QR with Expo Go app or use emulator
```

### 4. Connect Mobile to Backend

1. Open VoidLink app
2. Enter your server URL: `http://YOUR_LOCAL_IP:8000`
3. Login with admin credentials
4. Start chatting!

---

## Docker Deployment

```bash
cd voidlink/docker

# Copy and configure environment
cp .env.docker .env
nano .env   # Set SECRET_KEY and ADMIN_PASSWORD

# Build and start
docker compose up -d

# View logs
docker compose logs -f voidlink-backend

# With Nginx (HTTPS)
docker compose --profile with-nginx up -d
```

---

## Remote Access via Tailscale

Tailscale provides secure WireGuard-based connectivity with no port forwarding required.

### Setup

```bash
# Install Tailscale on your server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4

# Update backend .env
TAILSCALE_HOSTNAME=your-machine-name
```

### Mobile Connection

Use your Tailscale IP/hostname in the VoidLink app:
```
http://100.x.x.x:8000
```
or with MagicDNS:
```
http://your-machine.tailnet.ts.net:8000
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token` | Login (OAuth2 form) |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/pair-device` | Pair a new device |
| GET | `/api/auth/qr-code?server_url=...` | Generate pairing QR |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/send` | Send message (SSE streaming) |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}` | Get conversation with messages |
| POST | `/api/chat/conversations` | Create conversation |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |
| GET | `/api/chat/folders` | List folders |
| POST | `/api/chat/folders` | Create folder |
| WS | `/api/chat/ws/{token}` | WebSocket chat |

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/` | List installed models |
| GET | `/api/models/supported` | List supported models |
| GET | `/api/models/characters` | List character modes |
| POST | `/api/models/pull` | Download model (admin) |
| DELETE | `/api/models/{name}` | Delete model (admin) |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | CPU/RAM/GPU/Disk stats |
| WS | `/api/system/stats/stream/{token}` | Live stats WebSocket |
| POST | `/api/system/terminal` | Execute command (admin) |
| PUT | `/api/system/settings` | Update user settings |
| GET | `/api/system/discovery` | LAN discovery info |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/` | List files |
| GET | `/api/files/{user_id}/{filename}` | Download file |
| DELETE | `/api/files/{filename}` | Delete file |

---

## Building APK

### Prerequisites

```bash
npm install -g eas-cli
eas login
```

### Development APK (sideloadable)

```bash
cd voidlink/mobile
eas build --platform android --profile preview
```

### Production APK / AAB

```bash
# APK
eas build --platform android --profile preview

# Play Store AAB
eas build --platform android --profile production
```

### Local Build (no EAS account)

```bash
# Install Android SDK + NDK first
npx expo run:android --variant release
```

The APK will be output to `android/app/build/outputs/apk/release/`.

---

## Supported AI Models

| Model | Size | Best For |
|-------|------|----------|
| llama3 | 4.7GB | General purpose, fast |
| llama3:70b | 40GB | High quality, needs GPU |
| mistral | 4.1GB | Fast reasoning, code |
| deepseek-r1 | varies | Deep reasoning chains |
| deepseek-coder | varies | Code generation |
| qwen2 | 4.4GB | Multilingual, general |
| qwen2:72b | 41GB | High quality multilingual |
| codellama | 3.8GB | Code specialist |
| phi3 | 2.3GB | Edge devices, fast |

Pull any model:
```bash
ollama pull llama3
ollama pull mistral
ollama pull qwen2
```

---

## Security

### Architecture

- **JWT tokens** with configurable expiry (default: 30 days)
- **bcrypt** password hashing
- **Device pairing** with unique per-device tokens
- **QR code linking** for easy secure device enrollment
- **Rate limiting** on all API endpoints
- **File type validation** on uploads
- **Command allowlist** in terminal (only safe read-only commands)
- **Path traversal protection** on file downloads
- **No telemetry** — all data stays local

### Hardening Checklist

- [ ] Change default `ADMIN_PASSWORD` in `.env`
- [ ] Set a strong random `SECRET_KEY` (32+ chars)
- [ ] Use Tailscale or VPN instead of exposing port to internet
- [ ] Enable Nginx with TLS if exposing publicly
- [ ] Set `DEBUG=false` in production
- [ ] Restrict `ALLOWED_ORIGINS` to your app's IP

### Generate a secure SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Character Modes

| Mode | Description |
|------|-------------|
| default | Helpful AI assistant |
| hacker | Elite cyberpunk coder persona |
| coder | Expert programmer, code-focused |
| researcher | Analytical, balanced perspectives |
| creative | Outside-the-box, metaphor-heavy |
| assistant | Professional and formal |

---

## Obsidian Integration

To sync VoidLink conversations to your Obsidian vault:

1. Mount your vault directory in the Docker container:
   ```yaml
   volumes:
     - /path/to/obsidian/vault:/app/obsidian
   ```
2. Use the terminal endpoint to write markdown files:
   ```
   $ echo "# Chat Export" > /app/obsidian/VoidLink/export.md
   ```

Or use the Obsidian community plugin **"Local REST API"** to push conversations via webhook.

---

## LAN Auto-Discovery

The `/api/system/discovery` endpoint returns the server's local IP and hostname. The mobile app can scan the local network to find VoidLink instances automatically.

---

## Troubleshooting

**Ollama not connecting**
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check the URL in .env
OLLAMA_BASE_URL=http://localhost:11434
```

**Can't connect from phone**
```bash
# Find your local IP
ip addr show   # Linux
ifconfig       # macOS

# Use this IP in the mobile app
http://192.168.x.x:8000
```

**Docker: Ollama not reachable**
```bash
# Use host.docker.internal
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

**WebSocket disconnects**
- Increase Nginx `proxy_read_timeout`
- Check firewall allows port 8000

---

## License

MIT License. Build freely, run locally, share openly.

---

*VoidLink — Access the void from anywhere.*
