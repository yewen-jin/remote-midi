# Deployment Guide — MIDI Relay Server

Step-by-step instructions for deploying the MIDI relay server on a Linux VPS (Debian/Ubuntu).

## Prerequisites

- A VPS with a public IP address
- A domain name pointing to the VPS (e.g. `relay.example.com`)
- SSH access with sudo privileges
- Node.js 20 LTS or later installed

## 1. Create a service user

```bash
sudo useradd --system --create-home --home-dir /opt/midi-relay --shell /usr/sbin/nologin midi-relay
```

## 2. Clone the repository

```bash
sudo -u midi-relay git clone https://github.com/speakers-corner/midi-relay.git /opt/midi-relay
cd /opt/midi-relay
```

## 3. Install dependencies

```bash
sudo -u midi-relay npm install --production
```

## 4. Create the environment file

```bash
sudo tee /opt/midi-relay/.env << 'EOF'
PORT=3500
HOST=127.0.0.1
WS_PATH=/midi
PING_INTERVAL_MS=15000
PING_TIMEOUT_MS=30000
LOG_LEVEL=info
MAX_ROOMS=50
MAX_CLIENTS_PER_ROOM=20
EOF

sudo chown midi-relay:midi-relay /opt/midi-relay/.env
sudo chmod 600 /opt/midi-relay/.env
```

## 5. Create the logs directory

```bash
sudo -u midi-relay mkdir -p /opt/midi-relay/logs
```

## 6. Install the systemd service

```bash
sudo cp /opt/midi-relay/deploy/midi-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable midi-relay
sudo systemctl start midi-relay
```

## 7. Verify the service is running

```bash
sudo systemctl status midi-relay
curl http://127.0.0.1:3500/health
```

You should see a JSON response like:

```json
{ "status": "ok", "uptime": 5, "rooms": 0, "connections": 0 }
```

## 8. Set up Nginx

Install Nginx if not already present:

```bash
sudo apt install nginx
```

Copy the Nginx configuration:

```bash
sudo cp /opt/midi-relay/deploy/nginx-site.conf /etc/nginx/sites-available/midi-relay
sudo ln -s /etc/nginx/sites-available/midi-relay /etc/nginx/sites-enabled/
```

Edit the file and replace `relay.example.com` with your actual domain:

```bash
sudo nano /etc/nginx/sites-available/midi-relay
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Obtain a TLS certificate

Using certbot with the Nginx plugin:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d relay.example.com
```

Certbot will automatically configure the TLS certificates in the Nginx config.

## 10. Verify the full setup

From any machine with internet access:

```bash
# Health check
curl https://relay.example.com/health

# WebSocket test (install wscat: npm install -g wscat)
wscat -c wss://relay.example.com/midi
# Then type: {"type":"join","room":"test","role":"sender"}
# You should receive a joined confirmation
```

## Updating

To deploy a new version:

```bash
cd /opt/midi-relay
sudo -u midi-relay git pull
sudo -u midi-relay npm install --production
sudo systemctl restart midi-relay
```

## Viewing logs

```bash
# Live logs
sudo journalctl -u midi-relay -f

# Last 100 lines
sudo journalctl -u midi-relay -n 100
```

## Troubleshooting

- **Service won't start:** Check `journalctl -u midi-relay -e` for error details
- **WebSocket connection fails:** Ensure Nginx has the `proxy_set_header Upgrade` directives
- **Certificate issues:** Run `sudo certbot renew --dry-run` to test renewal
- **Port conflicts:** Verify nothing else is using port 3500: `sudo ss -tlnp | grep 3500`
