# Operations Guide — Speakers Corner MIDI Relay

Practical notes on testing, deployment, and usage based on the actual setup.

---

## Production environment

- **VPS:** Krystal.io
- **nginx:** runs as a Docker container (shared with other apps, TLS already configured)
- **Node.js apps:** managed by PM2 on the host — not Docker
- **nginx routing:** via host IP/port (`proxy_pass http://127.0.0.1:3500`)

---

## Testing locally

### 1. Start the relay server

```bash
npm start
```

### 2. Serve the browser client

```bash
python3 -m http.server 8080 --directory client/browser/
```

> `npx serve` does not work on this NixOS setup — the nix flake uses a slim Node variant without npm/npx. Use Python instead.

### 3. Open in browser

Go to `http://localhost:8080` in **Chrome, Edge, or Opera** (Firefox does not support Web MIDI).

> The client must be served over HTTP — opening `index.html` directly as `file://` won't work because of ES module restrictions.

Set the relay URL to:
```
ws://127.0.0.1:3500/midi
```

### 4. Test sender → receiver

Open two tabs:
- **Tab 1:** role = Sender, connect
- **Tab 2:** role = Receiver, same room name, connect

Incoming MIDI bytes appear automatically in the receiver's activity log. No extra steps needed on the receiver side — once connected, it just receives.

---

## How it works

**Sender** connects and joins a room → sends MIDI bytes as binary WebSocket frames.

**Receiver** connects and joins the same room → relay forwards all binary frames to it automatically.

The receiver is purely passive after connecting. Data arrives as the sender transmits it.

---

## URLs

| Environment | Relay URL | Notes |
|-------------|-----------|-------|
| Local testing | `ws://127.0.0.1:3500/midi` | No TLS needed locally |
| Production | `wss://your-domain.com/midi` | WSS = WebSocket over TLS |

The format is always `ws://` or `wss://` — not `http://`.

---

## Deploying on the VPS

### 1. Clone and install

```bash
git clone <repo-url> /opt/midi-relay
cd /opt/midi-relay
npm install --production
```

### 2. Add nginx location blocks

Add the contents of `deploy/nginx-location.conf` to your domain's `server {}` block in the nginx container config, then reload:

```bash
docker exec <nginx-container> nginx -s reload
```

### 3. Start with PM2

```bash
pm2 start server/index.js --name midi-relay
pm2 save
```

If PM2 isn't set up to survive reboots:
```bash
pm2 startup   # run the command it prints
pm2 save
```

### 4. Verify

```bash
pm2 list
curl https://your-domain.com/health
```

### Updating

```bash
cd /opt/midi-relay
git pull
npm install --production
pm2 restart midi-relay
```

### Logs

```bash
pm2 logs midi-relay
```

---

## Serving the browser client from the VPS

Add a static files location block to nginx alongside the `/midi` block:

```nginx
location / {
    root /opt/midi-relay/client/browser;
    index index.html;
}
```

Then:
- `https://your-domain.com` → browser client page (anyone can open this in Chrome)
- `wss://your-domain.com/midi` → relay WebSocket endpoint

Users go to your domain, enter the room name, choose their role, and connect — no local files needed.

---

## Receiving MIDI

Once a client connects as **Receiver**, data arrives automatically — nothing else to do. Options:

| Method | How |
|--------|-----|
| Browser tab | Open client page, role = Receiver, connect. Bytes appear in the activity log. |
| Browser → MIDI device | Same as above, but select a MIDI output device in the UI to forward bytes to hardware or a DAW virtual port. |
| Node.js (headless) | `node client/node/receiver.js --url wss://your-domain.com/midi --room your-room` |

---

## MIDI device requirements

- **Sender:** needs a MIDI input device (keyboard, controller) or virtual MIDI port
- **Receiver:** needs a MIDI output device (synth, hardware) or DAW virtual port (IAC Driver on macOS, loopMIDI on Windows)
- **Browser:** Web MIDI only works in Chrome, Edge, and Opera — not Firefox or Safari
