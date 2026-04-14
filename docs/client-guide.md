# Client Connection Guide — Speakers Corner

This guide explains how to connect to the MIDI relay server using the browser client.

## What you need

- A modern web browser (Chrome, Edge, or Opera — Firefox does not support Web MIDI)
- A MIDI controller or instrument connected to your computer (for sending)
- A MIDI-capable device or virtual MIDI port (for receiving)
- The relay server URL and room name (provided by the event organiser)

## Connecting with the browser client

### Step 1: Open the client

Open the `index.html` file in your browser, or navigate to the hosted URL if one has been provided.

### Step 2: Configure the connection

- **Relay URL:** Enter the WebSocket URL of the relay server (e.g. `wss://relay.example.com/midi`)
- **Room:** Enter the room name. Everyone in the same room can send and receive MIDI together
- **Role:** Choose **Sender** if you are playing a MIDI instrument, or **Receiver** if you are controlling a robot or playback device
- **Name (optional):** A friendly name so others can identify your connection

### Step 3: Select your MIDI device

- If you are a **sender**, select your MIDI input device (e.g. your keyboard or controller)
- If you are a **receiver**, select your MIDI output device (e.g. a virtual MIDI port or hardware device)

If no devices appear, check that:
1. Your MIDI device is plugged in and powered on
2. You are using a browser that supports Web MIDI (Chrome, Edge, or Opera)
3. You granted MIDI permission when the browser asked

Click **Refresh** if you plugged in a device after opening the page.

### Step 4: Connect

Click **Connect**. The status panel will update to show:
- **Connection:** Connected (green)
- **Room:** The room you joined
- **Senders/Receivers:** How many people are in the room

### Step 5: Play

If you are a sender, play your MIDI instrument — the notes will appear in the activity log and be forwarded to all receivers in the room.

If you are a receiver, incoming MIDI data will be forwarded to your selected output device automatically.

## If the connection drops

The client will automatically reconnect. You will see "Reconnecting…" messages in the activity log. The reconnection delay increases gradually (1s, 2s, 4s, up to 30s) to avoid overwhelming the server.

## Using the Node.js clients

For headless or server-side use, Node.js clients are provided:

```bash
# Sender
node client/node/sender.js --url wss://relay.example.com/midi --room speakers-corner-2026 --name piano-1

# Receiver
node client/node/receiver.js --url wss://relay.example.com/midi --room speakers-corner-2026 --name robot-arm-1

# List available MIDI devices (requires easymidi)
node client/node/sender.js --list
node client/node/receiver.js --list
```

## Troubleshooting

- **"Web MIDI API is not supported"** — Use Chrome, Edge, or Opera. Firefox does not support Web MIDI.
- **No MIDI devices listed** — Ensure your device is connected and you have granted browser MIDI permissions.
- **Connection keeps dropping** — Check your internet connection. The relay server may also be restarting.
- **High latency** — Check the latency display in the status panel. Values under 50ms are normal. Higher values may indicate network issues.

For more detailed troubleshooting, see [troubleshooting.md](troubleshooting.md).
