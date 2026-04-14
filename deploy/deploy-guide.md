# Deployment Guide — MIDI Relay Server

## Production setup (Krystal.io VPS)

This guide covers the actual production environment:

- **nginx** — `nginxproxy/nginx-proxy` Docker container at `/srv/reverse-proxy/`
- **TLS** — `nginxproxy/acme-companion` container, auto-provisions Let's Encrypt certs
- **Routing** — containers declare `VIRTUAL_HOST` env var; nginx-proxy picks them up automatically
- **Relay** — runs as a Docker container on the `proxy` network (same pattern as `chatroom-web`)

Traffic flow:
```
internet → nginx-proxy (443/TLS) → midi-relay container (3500) → WebSocket clients
```

No PM2, no host networking, no firewall changes needed.

---

## Deploy steps

### 1. Clone the repository on the VPS

```bash
git clone <your-repo-url> ~/remote-midi
```

### 2. Add DNS A record

At your DNS provider, add:

```
Type:  A
Name:  midi
Value: <VPS IP>    # find with: curl ifconfig.me
TTL:   3600
```

### 3. Add the service to docker-compose.yml

In `/srv/reverse-proxy/docker-compose.yml`, add under `services:`:

```yaml
  midi-relay:
    build: /home/<username>/remote-midi
    container_name: midi-relay
    restart: unless-stopped
    networks: [proxy]
    environment:
      PORT: 3500
      HOST: 0.0.0.0
      WS_PATH: /midi
      PING_INTERVAL_MS: 15000
      PING_TIMEOUT_MS: 30000
      MAX_ROOMS: 50
      MAX_CLIENTS_PER_ROOM: 20
      VIRTUAL_HOST: <url>
      VIRTUAL_PORT: 3500
      LETSENCRYPT_HOST: <url>
      LETSENCRYPT_EMAIL: <your-email>
    expose:
      - "3500"
```

> `VIRTUAL_PORT: 3500` tells nginx-proxy which port the relay listens on (default is 80).

### 4. Build and start

```bash
cd /srv/reverse-proxy
docker compose up -d --build midi-relay
```

nginx-proxy detects the new container and provisions a TLS certificate automatically. Allow a minute for the cert to be issued.

### 5. Verify

```bash
# Health check via domain
curl https://<url>/health

# Browser client — open in Chrome
# https://<url>

# WebSocket test (if wscat available)
npx wscat -c wss://<url>/midi
# Type: {"type":"join","room":"test","role":"sender"}
# Expected: {"type":"joined","room":"test","role":"sender","members":1}
```

---

## Updating

After pulling changes to `~/remote-midi`:

```bash
cd ~/remote-midi
git pull
cd /srv/reverse-proxy
docker compose up -d --build midi-relay
```

> `--build` is required — Docker copies files at build time, so a `git pull` alone won't update the running container.

## Viewing logs

```bash
docker logs midi-relay           # all logs
docker logs midi-relay --tail 50 # last 50 lines
docker logs midi-relay -f        # follow (live)
```

## Troubleshooting

- **Container won't start** — `docker logs midi-relay` to see the error
- **502 Bad Gateway** — container is not running; `docker compose up -d midi-relay`
- **503 Service Unavailable** — nginx-proxy hasn't detected the container yet; wait a moment then check `docker ps | grep midi-relay`
- **TLS cert not provisioned** — `docker logs acme-companion` to see cert errors; ensure DNS A record is pointing to the VPS
- **WebSocket connection fails** — nginx-proxy handles WebSocket upgrade automatically via `VIRTUAL_HOST`; check `docker logs nginx-proxy` for errors

---

## Alternative setups

### PM2 on the host (without Docker for the relay)

If you prefer PM2, use `ecosystem.config.cjs` in the repo root. Note: this requires the host firewall to allow Docker bridge → host traffic on port 3500, since nginx-proxy still runs in Docker.

```bash
pm2 start ~/remote-midi/ecosystem.config.cjs
pm2 save
```

### Systemd (bare nginx, no Docker)

`deploy/midi-relay.service` is provided for a traditional systemd setup with bare nginx.

### Full nginx config (new domain, no existing nginx)

Use `deploy/nginx-site.conf` as a starting point. Replace `relay.example.com` with your domain and obtain a TLS certificate:

```bash
sudo certbot --nginx -d your-domain.com
```
