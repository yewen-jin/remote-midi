# Deployment Guide — MIDI Relay Server

## Production setup (Krystal.io VPS)

This guide covers the actual production environment:

- **nginx** runs as a Docker container (shared with other apps, TLS already configured)
- **Node.js apps** are managed by **PM2 on the host** — not Docker, not systemd
- nginx routes to apps via host IP and port (e.g. `proxy_pass http://127.0.0.1:3500`)

If your setup is different (bare nginx, systemd, etc.) see the [Alternative setups](#alternative-setups) section below.

---

## Deploy steps

### 1. Clone the repository on your VPS

```bash
git clone <your-repo-url> ~/midi-relay
cd ~/midi-relay
```

### 2. Install production dependencies

```bash
npm install --production
```

### 3. Configure environment

```bash
cp .env.example .env   # if one exists, otherwise create it:
cat > .env << 'EOF'
PORT=3500
HOST=127.0.0.1
WS_PATH=/midi
PING_INTERVAL_MS=15000
PING_TIMEOUT_MS=30000
MAX_ROOMS=50
MAX_CLIENTS_PER_ROOM=20
EOF
chmod 600 .env
```

### 4. Add nginx location blocks

Open whichever config file controls your domain's `server {}` block inside the nginx container and add the contents of `deploy/nginx-location.conf`:

```nginx
# WebSocket endpoint
location /midi {
    proxy_pass http://127.0.0.1:3500;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}

# Health check
location /health {
    proxy_pass http://127.0.0.1:3500;
    proxy_set_header Host $host;
}
```

Reload nginx:

```bash
docker exec <nginx-container-name> nginx -s reload
```

### 5. Start with PM2

```bash
pm2 start server/index.js --name midi-relay
pm2 save
```

If you haven't set up PM2 to survive reboots yet:

```bash
pm2 startup   # prints a command — copy and run it as instructed
pm2 save
```

### 6. Verify

```bash
# Check PM2 status
pm2 list

# Health check via localhost
curl http://127.0.0.1:3500/health

# Health check via your domain (tests nginx proxy)
curl https://your-domain.com/health

# WebSocket test
npx wscat -c wss://your-domain.com/midi
# Type: {"type":"join","room":"test","role":"sender"}
# Expected: {"type":"joined","room":"test","role":"sender","members":1}
```

---

## Updating

```bash
cd ~/midi-relay
git pull
npm install --production
pm2 restart midi-relay
```

## Viewing logs

```bash
pm2 logs midi-relay          # live logs
pm2 logs midi-relay --lines 100  # last 100 lines
```

## Troubleshooting

- **pm2 shows errored** — `pm2 logs midi-relay` to see the error
- **Port conflict** — `ss -tlnp | grep 3500` to see what's using it
- **WebSocket fails through nginx** — ensure the `Upgrade` and `Connection` headers are set in the nginx location block
- **502 Bad Gateway** — PM2 process is not running; `pm2 restart midi-relay`

---

## Alternative setups

### Docker (without PM2)

A `Dockerfile` and `deploy/docker-compose.service.yml` are provided. Add the service block to your existing `docker-compose.yml` and run:

```bash
docker compose up -d midi-relay
```

`restart: unless-stopped` handles crashes and reboots.

### Systemd (bare nginx, no Docker)

`deploy/midi-relay.service` is provided for a traditional systemd setup. See the original instructions at the bottom of this file if needed — but for Krystal.io, PM2 is the right tool.

### Full nginx config (new domain, no existing nginx)

Use `deploy/nginx-site.conf` as a starting point. Replace `relay.example.com` with your domain and obtain a TLS certificate:

```bash
sudo certbot --nginx -d your-domain.com
```
