# Deployment Guide — MIDI Relay Server

## Production setup (Krystal.io VPS)

This guide covers the actual production environment:

- **nginx** — `nginxproxy/nginx-proxy` Docker container at `/srv/reverse-proxy/`
- **TLS** — `nginxproxy/acme-companion` container, auto-provisions Let's Encrypt certs
- **Routing** — containers declare `VIRTUAL_HOST` env var; nginx-proxy picks them up automatically
- **Node.js apps** — managed by **PM2 on the host**, not Docker
- **Existing pattern** — `chat.datadadaist.space` uses `chatroom-web` container; MIDI relay follows the same pattern

Traffic flow:
```
internet → nginx-proxy (443) → midi-relay-web container (80) → host PM2 (127.0.0.1:3500)
```

The `midi-relay-web` container is a plain nginx that proxies to the host via `host.docker.internal:3500`. nginx-proxy handles TLS termination and routing.

If your setup is different (bare nginx, systemd, etc.) see the [Alternative setups](#alternative-setups) section below.

---

## Deploy steps

### 1. Clone the repository on the VPS

```bash
git clone <your-repo-url> ~/remote-midi
cd ~/remote-midi
```

### 2. Install production dependencies

```bash
npm install --production
```

### 3. Start with PM2

```bash
pm2 start ~/remote-midi/server/index.js --name midi-relay --node-args="--env-file=/home/<username>/remote-midi/.env"
pm2 save
```

> **Important:** Node.js does not read `.env` files automatically. The `--node-args="--env-file=..."` flag tells Node to load it. Without this, the server may inherit stray environment variables (e.g. `PORT` from another app).

If PM2 isn't set up to survive reboots:

```bash
pm2 startup   # prints a command — copy and run it as instructed
pm2 save
```

Verify it's running:

```bash
pm2 list
ss -tlnp | grep 3500   # confirm it's on the right port
curl http://127.0.0.1:3500/health
```

### 4. Add DNS A record

At your DNS provider, add:

```
Type:  A
Name:  midi
Value: <VPS IP>    # find with: curl ifconfig.me
TTL:   3600
```

### 5. Create the nginx container config

Create `/srv/reverse-proxy/nginx-config/midi-relay-web.conf`:

```nginx
server {
    listen 80;

    # Serve browser client (static files)
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }

    # WebSocket relay
    location /midi {
        proxy_pass http://host.docker.internal:3500;
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
        proxy_pass http://host.docker.internal:3500;
        proxy_set_header Host $host;
    }
}
```

### 6. Add the service to docker-compose.yml

In `/srv/reverse-proxy/docker-compose.yml`, add under `services:`:

```yaml
  midi-relay-web:
    image: nginx:alpine
    container_name: midi-relay-web
    restart: unless-stopped
    networks: [proxy]
    environment:
      VIRTUAL_HOST: <url> 
      LETSENCRYPT_HOST: <url> 
      LETSENCRYPT_EMAIL: <your-email>
    volumes:
      - /home/<username>/remote-midi/client/browser:/usr/share/nginx/html:ro
      - /srv/reverse-proxy/nginx-config/midi-relay-web.conf:/etc/nginx/conf.d/default.conf:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### 7. Start the container

```bash
cd /srv/reverse-proxy
docker compose up -d midi-relay-web
```

nginx-proxy and acme-companion will detect the new container and automatically provision a TLS certificate for `midi.datadadaist.space`. Allow a minute for the cert to be issued.

### 8. Verify

```bash
# Health check via domain (tests full nginx proxy chain)
curl https://midi.datadadaist.space/health

# Browser client
# Open https://midi.datadadaist.space in Chrome — the UI should load

# WebSocket test (if wscat available)
npx wscat -c wss://midi.datadadaist.space/midi
# Type: {"type":"join","room":"test","role":"sender"}
# Expected: {"type":"joined","room":"test","role":"sender","members":1}
```

---

## Updating

```bash
cd ~/remote-midi
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
- **Port conflict** — `ss -tlnp | grep 3500` to see what's using it; also check `ss -tlnp | grep node` to see what port Node actually bound to
- **Wrong port** — if the server starts on port 3000 or another port, PM2 is likely inheriting `PORT` from another app's environment. Ensure PM2 was started with `--node-args="--env-file=..."` so the `.env` file takes precedence
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
