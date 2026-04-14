# Operations Guide — Speakers Corner MIDI Relay

Practical notes on testing, deployment, and usage based on the actual setup.

---

## Production environment

- **VPS:** Krystal.io
- **Domain:** `midi.datadadaist.space` (subdomain of `datadadaist.space`)
- **nginx:** runs as a Docker container (shared with other apps, TLS already configured)
- **Node.js apps:** managed by PM2 on the host — not Docker
- **nginx routing:** via host IP/port (`proxy_pass http://127.0.0.1:3500`)
- **Existing subdomain pattern:** `chat.datadadaist.space` already points to the same VPS — use that config as the reference when adding `midi.datadadaist.space`

### Adding the subdomain

1. **DNS** — add an A record at your DNS provider:
   ```
   Type:  A
   Name:  midi
   Value: <VPS IP>   # find with: curl ifconfig.me
   TTL:   3600
   ```

2. **nginx** — find the `chat.datadadaist.space` config and copy it as a template:
   ```bash
   docker exec <nginx-container> cat /etc/nginx/conf.d/chat.conf
   # or wherever your nginx configs live
   ```
   Replace `chat.datadadaist.space` → `midi.datadadaist.space`, swap the proxy location with `deploy/nginx-location.conf`, and add a static files location for the browser client:
   ```nginx
   location / {
       root /opt/midi-relay/client/browser;
       index index.html;
   }
   ```

3. **TLS** — obtain a cert the same way you did for `chat`:
   ```bash
   certbot certonly -d midi.datadadaist.space
   # or however certbot is configured in your nginx container
   ```

4. **Reload nginx:**
   ```bash
   docker exec <nginx-container> nginx -s reload
   ```

5. **Verify:**
   ```bash
   curl https://midi.datadadaist.space/health
   ```

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

## Arduino serial bridge

The Arduino receiver (`client/node/arduino-receiver.js`) connects to the relay as a receiver and forwards incoming MIDI bytes to an Arduino (or any microcontroller) over a serial port. This is useful for controlling robotic installations, LED rigs, or any hardware that reads MIDI from its serial input.

### Prerequisites

Install the `serialport` npm package (already included in `package.json`):

```bash
npm install serialport
```

### Usage

List available serial ports:

```bash
node client/node/arduino-receiver.js --list
```

Connect to the relay and forward MIDI to an Arduino:

```bash
# Explicit port
node client/node/arduino-receiver.js \
  --url wss://your-domain.com/midi \
  --room speakers-corner-2026 \
  --port /dev/ttyUSB0 \
  --baud 9600

# Auto-detect (uses the first available serial port)
node client/node/arduino-receiver.js \
  --url wss://your-domain.com/midi \
  --room speakers-corner-2026
```

### CLI options

| Flag | Default | Description |
|------|---------|-------------|
| `--url` | `ws://127.0.0.1:3500/midi` | Relay WebSocket URL |
| `--room` | `speakers-corner-2026` | Room name to join |
| `--name` | `arduino-1` | Display name shown to other clients |
| `--port` | *(auto-detect)* | Serial port path (e.g. `/dev/ttyUSB0`, `COM3`) |
| `--baud` | `9600` | Baud rate for the serial connection |
| `--list` | | List available serial ports and exit |
| `-h`, `--help` | | Show help message |

### Reconnection behaviour

- **Relay connection:** reconnects with exponential backoff (1 s to 30 s cap), same as all other clients.
- **Serial port:** if the Arduino is unplugged or the serial port closes unexpectedly, the script retries with exponential backoff until the port reappears.
- **Startup order does not matter:** the script tolerates the Arduino not being plugged in yet. It will keep trying until the serial port is available.

### What the Arduino sketch needs to do

The Arduino receives raw MIDI bytes on its hardware serial port. A minimal sketch:

```cpp
void setup() {
  Serial.begin(9600);  // Must match --baud rate
}

void loop() {
  if (Serial.available()) {
    byte midiByte = Serial.read();
    // Process the MIDI byte, e.g.:
    //   0x90 = Note On (channel 1)
    //   0x80 = Note Off (channel 1)
    //   0xB0 = Control Change (channel 1)
    // The second byte is the note/controller number,
    // the third byte is the velocity/value.
    processMidi(midiByte);
  }
}

void processMidi(byte b) {
  // Your MIDI handling logic here
  // e.g. drive a servo, switch a relay, control LEDs
}
```

> **Tip:** For more robust MIDI parsing on the Arduino, consider the [MIDI Library](https://github.com/FortySevenEffects/arduino_midi_library) or [Arduino MIDI Library](https://www.arduino.cc/reference/en/libraries/midi-library/) which handle running status, SysEx, and other edge cases.

> **Baud rate:** 9600 is the default for simplicity. Standard MIDI baud rate is 31250 — use `--baud 31250` if your Arduino sketch expects that. Make sure both sides match.

---

## MIDI device requirements

- **Sender:** needs a MIDI input device (keyboard, controller) or virtual MIDI port
- **Receiver:** needs a MIDI output device (synth, hardware) or DAW virtual port (IAC Driver on macOS, loopMIDI on Windows)
- **Browser:** Web MIDI only works in Chrome, Edge, and Opera — not Firefox or Safari
