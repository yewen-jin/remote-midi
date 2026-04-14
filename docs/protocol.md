# Wire Protocol Specification

This document describes the WebSocket protocol used between clients and the MIDI relay server.

## Transport

- **Protocol:** WebSocket (RFC 6455) over TLS (WSS)
- **Endpoint:** `wss://relay.example.com/midi`
- **Two frame types:**
  - **Text frames** — JSON control messages
  - **Binary frames** — raw MIDI bytes

## Connection Lifecycle

1. Client opens a WebSocket connection to the relay endpoint
2. Client sends a `join` message (text frame) to enter a room
3. Server responds with a `joined` confirmation
4. Server broadcasts a `room-update` to all room members
5. Sender transmits MIDI data as binary frames
6. Server forwards binary frames to all receivers in the room
7. WebSocket-level ping/pong maintains the connection (every 15s)
8. On disconnect, the server removes the client and broadcasts a `room-update`

## Control Messages (Text Frames)

All control messages are JSON objects with a `type` field.

### `join` — Join a room

Sent by the client to join or switch rooms.

```json
{
  "type": "join",
  "room": "speakers-corner-2026",
  "role": "sender",
  "name": "piano-1"
}
```

| Field | Type   | Required | Description                  |
| ----- | ------ | -------- | ---------------------------- |
| type  | string | yes      | Must be `"join"`             |
| room  | string | yes      | Room name to join            |
| role  | string | yes      | `"sender"` or `"receiver"`   |
| name  | string | no       | Display name for this client |

If the client is already in a room, they are removed from the old room before joining the new one.

### `joined` — Join confirmation

Sent by the server after a successful join.

```json
{
  "type": "joined",
  "room": "speakers-corner-2026",
  "role": "sender",
  "members": 3
}
```

| Field   | Type   | Description                     |
| ------- | ------ | ------------------------------- |
| type    | string | `"joined"`                      |
| room    | string | Room name                       |
| role    | string | The client's role               |
| members | number | Total number of members in room |

### `room-update` — Membership change

Broadcast to all room members when someone joins or leaves.

```json
{
  "type": "room-update",
  "room": "speakers-corner-2026",
  "senders": 1,
  "receivers": 2
}
```

| Field     | Type   | Description                     |
| --------- | ------ | ------------------------------- |
| type      | string | `"room-update"`                 |
| room      | string | Room name                       |
| senders   | number | Number of senders in the room   |
| receivers | number | Number of receivers in the room |

### `error` — Server error

Sent by the server when a request fails.

```json
{
  "type": "error",
  "message": "Room is full"
}
```

| Field   | Type   | Description          |
| ------- | ------ | -------------------- |
| type    | string | `"error"`            |
| message | string | Human-readable error |

### `ping` / `pong` — Application-level heartbeat

The client may send a `ping` to measure round-trip latency.

```json
{ "type": "ping" }
```

The server responds with:

```json
{ "type": "pong", "time": 1714000000000 }
```

| Field | Type   | Description                       |
| ----- | ------ | --------------------------------- |
| type  | string | `"pong"`                          |
| time  | number | Server timestamp (ms since epoch) |

## MIDI Data (Binary Frames)

Raw MIDI bytes are sent as binary WebSocket frames with **no additional framing**.

- The relay does not inspect, validate, or modify MIDI bytes
- The relay forwards binary frames from senders to all receivers in the same room
- Binary frames from receivers are silently ignored
- Binary frames from clients not yet joined to a room are silently ignored

### Examples

| MIDI Message | Bytes            |
| ------------ | ---------------- |
| Note On C4   | `90 3C 7F`       |
| Note Off C4  | `80 3C 00`       |
| CC #7 (Vol)  | `B0 07 64`       |
| Clock tick   | `F8`             |
| SysEx        | `F0 7E 01 02 F7` |

## Limits

| Limit                         | Default | Env variable             |
| ----------------------------- | ------- | ------------------------ |
| Maximum rooms                 | 50      | `MAX_ROOMS`              |
| Maximum clients/room          | 20      | `MAX_CLIENTS_PER_ROOM`   |
| Concurrent connections/IP     | 10      | `MAX_CONNECTIONS_PER_IP` |
| New connections/IP per window | 20      | `CONNECT_RATE_LIMIT`     |
| Connection rate window        | 60 s    | `CONNECT_RATE_WINDOW_MS` |
| Messages/second/connection    | 500     | `MESSAGE_RATE_LIMIT`     |

When a room or connection limit is reached, the server responds with an `error` message. For room limits, the client is not joined. For connection limits, the WebSocket is closed with code `1008`.

Message rate limiting uses a token-bucket algorithm. Excess messages are silently dropped rather than disconnecting the client — this avoids disrupting MIDI clock bursts that temporarily exceed the limit.

## Keepalive

The server sends WebSocket-level pings every 15 seconds (configurable via `PING_INTERVAL_MS`). If a client does not respond within 30 seconds (`PING_TIMEOUT_MS`), the connection is terminated.
