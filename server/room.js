import { WebSocket } from 'ws';

/**
 * Room — manages a group of WebSocket members (senders and receivers)
 * within a named channel. Handles broadcast routing for both binary
 * MIDI data and JSON control messages.
 */
export class Room {
  /** @type {string} */
  name;

  /**
   * @type {Map<WebSocket, { role: string, name: string | undefined }>}
   */
  #members = new Map();

  /**
   * @param {string} name — the room identifier
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Add a WebSocket client to this room.
   *
   * @param {WebSocket} ws
   * @param {string} role — 'sender' or 'receiver'
   * @param {string} [name] — optional display name
   */
  addMember(ws, role, name) {
    this.#members.set(ws, { role, name });
  }

  /**
   * Remove a WebSocket client from this room.
   *
   * @param {WebSocket} ws
   * @returns {boolean} true if the member was found and removed
   */
  removeMember(ws) {
    return this.#members.delete(ws);
  }

  /**
   * Check whether a WebSocket is a member of this room.
   *
   * @param {WebSocket} ws
   * @returns {boolean}
   */
  hasMember(ws) {
    return this.#members.has(ws);
  }

  /**
   * @returns {number} total number of members
   */
  getMemberCount() {
    return this.#members.size;
  }

  /**
   * @returns {number} number of senders in the room
   */
  getSenders() {
    let count = 0;
    for (const info of this.#members.values()) {
      if (info.role === 'sender') count++;
    }
    return count;
  }

  /**
   * @returns {number} number of receivers in the room
   */
  getReceivers() {
    let count = 0;
    for (const info of this.#members.values()) {
      if (info.role === 'receiver') count++;
    }
    return count;
  }

  /**
   * @returns {boolean} true if the room has no members
   */
  isEmpty() {
    return this.#members.size === 0;
  }

  /**
   * Forward binary data from a sender to all receivers in the room.
   * Skips the sending socket and any closed connections.
   *
   * @param {WebSocket} senderWs — the socket that sent the data
   * @param {Buffer | ArrayBuffer | Uint8Array} data — raw binary MIDI bytes
   */
  broadcastBinary(senderWs, data) {
    for (const [ws, info] of this.#members) {
      if (ws === senderWs) continue;
      if (info.role !== 'receiver') continue;
      if (ws.readyState !== WebSocket.OPEN) continue;
      ws.send(data);
    }
  }

  /**
   * Send a JSON control message to all members in the room.
   * Skips closed connections.
   *
   * @param {string} message — JSON string to send as a text frame
   */
  broadcastControl(message) {
    for (const [ws] of this.#members) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      ws.send(message);
    }
  }
}
