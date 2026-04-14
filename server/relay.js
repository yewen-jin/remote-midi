import { Room } from './room.js';
import {
  parseControlMessage,
  createMessage,
  MessageType,
  Role,
} from './protocol.js';

/**
 * Relay — core routing engine for the MIDI relay server.
 *
 * Manages rooms, routes binary MIDI frames from senders to receivers,
 * and handles control messages (join, ping, etc.).
 */
export class Relay {
  /** @type {Map<string, Room>} */
  #rooms = new Map();

  /** @type {Map<WebSocket, { room: string, role: string, name?: string }>} */
  #clients = new Map();

  /** @type {number} */
  #maxRooms;

  /** @type {number} */
  #maxClientsPerRoom;

  /**
   * @param {object} [options]
   * @param {number} [options.maxRooms=50]
   * @param {number} [options.maxClientsPerRoom=20]
   */
  constructor({ maxRooms = 50, maxClientsPerRoom = 20 } = {}) {
    this.#maxRooms = maxRooms;
    this.#maxClientsPerRoom = maxClientsPerRoom;
  }

  /** @returns {number} total number of active rooms */
  getRoomCount() {
    return this.#rooms.size;
  }

  /** @returns {number} total number of connected clients */
  getClientCount() {
    return this.#clients.size;
  }

  /**
   * Handle a new WebSocket connection. Sets up message and close listeners.
   *
   * @param {WebSocket} ws
   */
  handleConnection(ws) {
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        this.#handleBinary(ws, data);
      } else {
        this.#handleText(ws, data.toString());
      }
    });

    ws.on('close', () => {
      this.#handleClose(ws);
    });
  }

  /**
   * Route a binary MIDI frame from a sender to all receivers in the same room.
   *
   * @param {WebSocket} ws
   * @param {Buffer} data
   */
  #handleBinary(ws, data) {
    const client = this.#clients.get(ws);
    if (!client) return; // Not joined yet — ignore

    // Only senders may transmit binary data
    if (client.role !== Role.SENDER) return;

    const room = this.#rooms.get(client.room);
    if (!room) return;

    room.broadcastBinary(ws, data);
  }

  /**
   * Parse and handle a text control message.
   *
   * @param {WebSocket} ws
   * @param {string} data
   */
  #handleText(ws, data) {
    let msg;
    try {
      msg = parseControlMessage(data);
    } catch (err) {
      ws.send(createMessage(MessageType.ERROR, { message: err.message }));
      return;
    }

    switch (msg.type) {
      case MessageType.JOIN:
        this.#handleJoin(ws, msg);
        break;
      case MessageType.PING:
        ws.send(createMessage(MessageType.PONG, { time: Date.now() }));
        break;
      default:
        // Other known types from clients are silently accepted
        break;
    }
  }

  /**
   * Handle a join request — add the client to the specified room.
   *
   * @param {WebSocket} ws
   * @param {{ room: string, role: string, name?: string }} msg
   */
  #handleJoin(ws, msg) {
    const { room: roomName, role, name } = msg;

    // If the client is already in a room, remove them first (room switching)
    if (this.#clients.has(ws)) {
      this.#removeFromRoom(ws);
    }

    // Check room limits
    let room = this.#rooms.get(roomName);
    if (!room && this.#rooms.size >= this.#maxRooms) {
      ws.send(
        createMessage(MessageType.ERROR, {
          message: 'Maximum number of rooms reached',
        }),
      );
      return;
    }

    if (!room) {
      room = new Room(roomName);
      this.#rooms.set(roomName, room);
    }

    if (room.getMemberCount() >= this.#maxClientsPerRoom) {
      ws.send(createMessage(MessageType.ERROR, { message: 'Room is full' }));
      return;
    }

    // Add the client
    room.addMember(ws, role, name);
    this.#clients.set(ws, { room: roomName, role, name });

    // Send joined confirmation
    ws.send(
      createMessage(MessageType.JOINED, {
        room: roomName,
        role,
        members: room.getMemberCount(),
      }),
    );

    // Broadcast room update to all members
    this.#broadcastRoomUpdate(room);
  }

  /**
   * Handle a WebSocket close event — clean up room membership.
   *
   * @param {WebSocket} ws
   */
  #handleClose(ws) {
    this.#removeFromRoom(ws);
  }

  /**
   * Remove a client from their current room. Deletes empty rooms.
   *
   * @param {WebSocket} ws
   */
  #removeFromRoom(ws) {
    const client = this.#clients.get(ws);
    if (!client) return;

    const room = this.#rooms.get(client.room);
    this.#clients.delete(ws);

    if (room) {
      room.removeMember(ws);

      if (room.isEmpty()) {
        this.#rooms.delete(client.room);
      } else {
        this.#broadcastRoomUpdate(room);
      }
    }
  }

  /**
   * Broadcast a room-update message to all members of a room.
   *
   * @param {Room} room
   */
  #broadcastRoomUpdate(room) {
    room.broadcastControl(
      createMessage(MessageType.ROOM_UPDATE, {
        room: room.name,
        senders: room.getSenders(),
        receivers: room.getReceivers(),
      }),
    );
  }
}
