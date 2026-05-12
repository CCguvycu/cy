# VoidLink Secure Deployment Guide

## Option 1: Local LAN (Easiest)

Best for home use where phone and server are on the same network.

```bash
# 1. Start backend
cd voidlink/backend
python run.py

# 2. Find your LAN IP
hostname -I | awk '{print $1}'

# 3. In mobile app, connect to:
#    http://192.168.x.x:8000
```

No additional configuration needed.

---

## Option 2: Tailscale (Recommended for Remote)

Secure, encrypted tunnel. Works from anywhere. No port forwarding.

### Server Setup

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate
sudo tailscale up

# Get your stable IP
tailscale ip -4
# Example: 100.64.1.2

# (Optional) Enable MagicDNS for hostname access
# In Tailscale admin panel → DNS → Enable MagicDNS
```

### Phone Setup

1. Install Tailscale app on your phone
2. Login with same Tailscale account
3. In VoidLink app, connect to:
   ```
   http://100.64.1.2:8000
   ```
   or with MagicDNS:
   ```
   http://my-server.tail12345.ts.net:8000
   ```

---

## Option 3: Cloudflare Tunnel (Public HTTPS)

Expose with free HTTPS, no open ports.

```bash
# Install cloudflared
brew install cloudflared   # macOS
# or download from cloudflare.com/products/tunnel

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create voidlink

# Create config file
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: ai.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run voidlink

# Or as system service
cloudflared service install
```

Update `.env`:
```
ALLOWED_ORIGINS=https://ai.yourdomain.com
```

---

## Option 4: Self-Hosted HTTPS with Nginx + Let's Encrypt

For a production setup with your own domain.

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d ai.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

Copy generated certs to `docker/certs/`:
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/certs/key.pem
```

Start with Nginx:
```bash
docker compose --profile with-nginx up -d
```

---

## GPU Acceleration

### NVIDIA GPU with Ollama

```bash
# Verify GPU is detected
nvidia-smi

# Ollama automatically uses GPU when available
# Check GPU usage
ollama run llama3 "test"
# Look for GPU memory usage in nvidia-smi
```

### Docker with GPU

```yaml
# docker-compose.yml addition
services:
  voidlink-backend:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

---

## Systemd Service (Linux Auto-Start)

```ini
# /etc/systemd/system/voidlink.service
[Unit]
Description=VoidLink AI Backend
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/voidlink/backend
Environment=PATH=/home/your-username/voidlink/backend/venv/bin
ExecStart=/home/your-username/voidlink/backend/venv/bin/python run.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable voidlink
sudo systemctl start voidlink
sudo systemctl status voidlink
```

---

## Monitoring

Check system stats endpoint:
```bash
curl http://localhost:8000/api/system/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Health check:
```bash
curl http://localhost:8000/health
```

---

## Backup

```bash
# Backup database and uploads
tar -czf voidlink-backup-$(date +%Y%m%d).tar.gz \
  voidlink/backend/voidlink.db \
  voidlink/backend/uploads/

# Restore
tar -xzf voidlink-backup-YYYYMMDD.tar.gz
```
