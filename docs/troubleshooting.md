# Troubleshooting Guide

Common issues and diagnostic steps for the MIDI relay system.

## Connection Issues

### Cannot connect to the relay server

1. **Check the URL** — Ensure you are using `wss://` (not `ws://`) and the correct domain
2. **Check your internet** — Try loading any website to confirm connectivity
3. **Check the server** — Ask the operator to verify the health endpoint: `curl https://relay.example.com/health`
4. **Firewall** — Ensure your network allows outbound connections on port 443 (HTTPS/WSS). Most networks do
5. **Browser console** — Open the developer console (F12) and look for WebSocket errors

### Connection drops repeatedly

- **Unstable network** — The client will auto-reconnect. If drops are frequent, check your Wi-Fi or try a wired connection
- **Server restart** — The operator may have restarted the server. Connections will resume automatically
- **Idle timeout** — The relay sends pings every 15 seconds to prevent this. If you still see timeouts, check whether a proxy or corporate firewall is closing idle connections

### "Room is full" error

The room has reached its maximum capacity (default: 20 clients). Ask the operator to increase `MAX_CLIENTS_PER_ROOM` or use a different room name.

## MIDI Issues

### No MIDI devices listed (browser)

- **Browser support** — Web MIDI is only supported in Chrome, Edge, and Opera. Firefox and Safari do not support it
- **Permissions** — When prompted, click "Allow" to grant MIDI access. If you denied it, clear the site permission and refresh
- **SysEx permission** — Some devices require SysEx access. The client requests this automatically, but your browser may show an additional prompt
- **Device not connected** — Plug in your MIDI device and click "Refresh" in the MIDI Device section
- **Drivers** — On Windows, ensure your MIDI device drivers are installed. On macOS and Linux, most USB MIDI devices work without additional drivers

### MIDI notes are not reaching the receiver

1. **Check roles** — The sender must be in "Sender" role, and the receiver in "Receiver" role
2. **Check the room** — Both clients must be in the same room. Verify the room name matches exactly (case-sensitive)
3. **Check the activity log** — The sender should show outgoing MIDI bytes (→), and the receiver should show incoming bytes (←)
4. **Check the device selection** — Ensure the sender has selected a MIDI input and the receiver has selected a MIDI output
5. **Check the status panel** — Verify that both senders and receivers show non-zero counts

### High latency

The latency display in the browser client shows the round-trip time to the relay server.

- **Under 50ms** — Normal, expected for most connections
- **50–150ms** — Acceptable for most purposes, may be noticeable for fast passages
- **Over 150ms** — Check your network. Try a wired connection instead of Wi-Fi. Consider a relay server closer to both endpoints

Latency is measured at the application level (WebSocket round-trip) and does not include local MIDI hardware latency.

### MIDI data is corrupted or missing notes

- **Running status** — The relay does not interpret MIDI bytes. If a client implementation strips or modifies running status bytes, notes may be lost. The relay is a transparent pipe
- **SysEx messages** — Long SysEx messages should pass through intact. If they are truncated, check for buffer size limits in the MIDI library
- **Clock messages** — Timing clock (0xF8) messages are forwarded at full speed. If sync drifts, the issue is likely network jitter, not the relay

## Server-Side Issues

### Service will not start

```bash
sudo journalctl -u midi-relay -e
```

Common causes:
- **Port conflict** — Another process is using port 3500: `sudo ss -tlnp | grep 3500`
- **Missing dependencies** — Run `npm install` in the project directory
- **Wrong Node version** — Requires Node.js 20 or later: `node --version`
- **Permission denied** — The service user needs read access to the project files

### Health check returns an error

```bash
curl -v http://127.0.0.1:3500/health
```

- If this works but the external URL does not, the issue is in Nginx or TLS
- If this also fails, the relay service is not running: `sudo systemctl status midi-relay`

### Nginx returns 502 Bad Gateway

- The relay service is not running or not listening on the expected port
- Check `sudo systemctl status midi-relay` and `sudo ss -tlnp | grep 3500`

### WebSocket upgrade fails through Nginx

Ensure the Nginx config includes the WebSocket upgrade headers:
```
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Reload Nginx after any config changes: `sudo systemctl reload nginx`

## Getting Help

If you cannot resolve an issue:
1. Note the exact error message or behaviour
2. Check the activity log and browser console for details
3. Contact the event organiser with the information above
