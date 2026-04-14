/**
 * Wire protocol definitions and message parsing for the MIDI relay server.
 *
 * Control messages are JSON text frames. MIDI data is raw binary frames.
 * This module handles only the control message side.
 */

/** @enum {string} Known control message types */
export const MessageType = Object.freeze({
  JOIN: 'join',
  JOINED: 'joined',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  ROOM_UPDATE: 'room-update',
});

/** @enum {string} Valid client roles */
export const Role = Object.freeze({
  SENDER: 'sender',
  RECEIVER: 'receiver',
});

const KNOWN_TYPES = new Set(Object.values(MessageType));
const VALID_ROLES = new Set(Object.values(Role));

/**
 * Shape validators for each message type that requires specific fields.
 * Returns an error string if invalid, or null if valid.
 *
 * @type {Record<string, (msg: object) => string | null>}
 */
const VALIDATORS = {
  [MessageType.JOIN]: (msg) => {
    if (!msg.room || typeof msg.room !== 'string') {
      return 'Room name is required';
    }
    if (!msg.role || !VALID_ROLES.has(msg.role)) {
      return `Invalid role: must be one of ${[...VALID_ROLES].join(', ')}`;
    }
    if (msg.name !== undefined && typeof msg.name !== 'string') {
      return 'Name must be a string';
    }
    return null;
  },
};

/**
 * Parse and validate a control message from a text WebSocket frame.
 *
 * @param {string} data — raw text frame data
 * @returns {object} parsed and validated message object
 * @throws {Error} if the data is not valid JSON or fails validation
 */
export function parseControlMessage(data) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    throw new Error('Message must be a JSON object');
  }

  if (!msg.type || typeof msg.type !== 'string') {
    throw new Error('Message type is required');
  }

  if (!KNOWN_TYPES.has(msg.type)) {
    throw new Error(`Unknown message type: ${msg.type}`);
  }

  const validator = VALIDATORS[msg.type];
  if (validator) {
    const error = validator(msg);
    if (error) {
      throw new Error(error);
    }
  }

  return msg;
}

/**
 * Create a JSON control message string.
 *
 * @param {string} type — one of MessageType values
 * @param {object} [payload={}] — additional fields to include
 * @returns {string} JSON string ready to send as a text frame
 * @throws {Error} if the type is not a known MessageType
 */
export function createMessage(type, payload = {}) {
  if (!KNOWN_TYPES.has(type)) {
    throw new Error(`Unknown message type: ${type}`);
  }

  return JSON.stringify({ type, ...payload });
}
