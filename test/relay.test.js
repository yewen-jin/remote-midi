import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import { Relay } from '../server/relay.js';

/**
 * Create a mock WebSocket that is an EventEmitter (so relay can call ws.on)
 * and records all sent messages.
 */
function mockWs() {
  const emitter = new EventEmitter();
  emitter.readyState = WebSocket.OPEN;
  emitter.sent = [];
  emitter.send = (data) => emitter.sent.push(data);
  return emitter;
}

/** Parse the last text message sent to a mock WebSocket. */
function lastMessage(ws) {
  return JSON.parse(ws.sent[ws.sent.length - 1]);
}

/** Send a JSON text frame to a mock WebSocket (simulating client message). */
function sendText(ws, obj) {
  ws.emit('message', Buffer.from(JSON.stringify(obj)), false);
}

/** Send binary data to a mock WebSocket. */
function sendBinary(ws, data) {
  ws.emit('message', Buffer.from(data), true);
}

/** Simulate the WebSocket closing. */
function closeWs(ws) {
  ws.emit('close');
}

describe('Relay', () => {
  let relay;

  beforeEach(() => {
    relay = new Relay({ maxRooms: 3, maxClientsPerRoom: 3 });
  });

  it('handles a join and responds with joined', () => {
    const ws = mockWs();
    relay.handleConnection(ws);

    sendText(ws, { type: 'join', room: 'test', role: 'sender' });

    // Client receives joined confirmation then room-update
    const messages = ws.sent.map((m) => JSON.parse(m));
    const joined = messages.find((m) => m.type === 'joined');
    assert.ok(joined);
    assert.equal(joined.room, 'test');
    assert.equal(joined.role, 'sender');
    assert.equal(joined.members, 1);
  });

  it('relays binary data from sender to receiver', () => {
    const sender = mockWs();
    const receiver = mockWs();
    relay.handleConnection(sender);
    relay.handleConnection(receiver);

    sendText(sender, { type: 'join', room: 'test', role: 'sender' });
    sendText(receiver, { type: 'join', room: 'test', role: 'receiver' });

    const midiData = [0x90, 0x3c, 0x7f];
    sendBinary(sender, midiData);

    // Receiver should have: joined msg, room-update (sender join),
    // room-update (own join), and the binary data
    const binaryMessages = receiver.sent.filter(
      (m) => typeof m !== 'string',
    );
    assert.equal(binaryMessages.length, 1);
    assert.deepEqual([...binaryMessages[0]], midiData);
  });

  it('does not relay binary from a receiver', () => {
    const sender = mockWs();
    const receiver = mockWs();
    relay.handleConnection(sender);
    relay.handleConnection(receiver);

    sendText(sender, { type: 'join', room: 'test', role: 'sender' });
    sendText(receiver, { type: 'join', room: 'test', role: 'receiver' });

    // Receiver tries to send binary — should be ignored
    sendBinary(receiver, [0x90, 0x3c, 0x7f]);

    const senderBinary = sender.sent.filter((m) => typeof m !== 'string');
    assert.equal(senderBinary.length, 0);
  });

  it('broadcasts room-update when members change', () => {
    const ws1 = mockWs();
    const ws2 = mockWs();
    relay.handleConnection(ws1);
    relay.handleConnection(ws2);

    sendText(ws1, { type: 'join', room: 'test', role: 'sender' });
    sendText(ws2, { type: 'join', room: 'test', role: 'receiver' });

    // ws1 should have received a room-update when ws2 joined
    const updates = ws1.sent
      .filter((m) => typeof m === 'string')
      .map((m) => JSON.parse(m))
      .filter((m) => m.type === 'room-update');

    assert.ok(updates.length > 0);
    const lastUpdate = updates[updates.length - 1];
    assert.equal(lastUpdate.senders, 1);
    assert.equal(lastUpdate.receivers, 1);
  });

  it('enforces maxRooms limit', () => {
    const clients = [];
    for (let i = 0; i < 3; i++) {
      const ws = mockWs();
      relay.handleConnection(ws);
      sendText(ws, { type: 'join', room: `room-${i}`, role: 'sender' });
      clients.push(ws);
    }

    // Fourth room should be rejected
    const ws = mockWs();
    relay.handleConnection(ws);
    sendText(ws, { type: 'join', room: 'room-full', role: 'sender' });

    const msg = lastMessage(ws);
    assert.equal(msg.type, 'error');
    assert.match(msg.message, /Maximum number of rooms/);
  });

  it('enforces maxClientsPerRoom limit', () => {
    const clients = [];
    for (let i = 0; i < 3; i++) {
      const ws = mockWs();
      relay.handleConnection(ws);
      sendText(ws, { type: 'join', room: 'crowded', role: 'receiver' });
      clients.push(ws);
    }

    const ws = mockWs();
    relay.handleConnection(ws);
    sendText(ws, { type: 'join', room: 'crowded', role: 'receiver' });

    const msg = lastMessage(ws);
    assert.equal(msg.type, 'error');
    assert.match(msg.message, /full/);
  });

  it('cleans up on close and deletes empty rooms', () => {
    const ws = mockWs();
    relay.handleConnection(ws);
    sendText(ws, { type: 'join', room: 'ephemeral', role: 'sender' });

    assert.equal(relay.getRoomCount(), 1);
    assert.equal(relay.getClientCount(), 1);

    closeWs(ws);

    assert.equal(relay.getRoomCount(), 0);
    assert.equal(relay.getClientCount(), 0);
  });

  it('sends error for invalid messages', () => {
    const ws = mockWs();
    relay.handleConnection(ws);

    ws.emit('message', Buffer.from('not json'), false);

    const msg = lastMessage(ws);
    assert.equal(msg.type, 'error');
    assert.match(msg.message, /Invalid JSON/);
  });

  it('responds to ping with pong', () => {
    const ws = mockWs();
    relay.handleConnection(ws);

    sendText(ws, { type: 'ping' });

    const msg = lastMessage(ws);
    assert.equal(msg.type, 'pong');
    assert.equal(typeof msg.time, 'number');
  });

  it('allows room switching with a second join', () => {
    const ws = mockWs();
    relay.handleConnection(ws);

    sendText(ws, { type: 'join', room: 'room-a', role: 'sender' });
    assert.equal(relay.getRoomCount(), 1);

    sendText(ws, { type: 'join', room: 'room-b', role: 'receiver' });
    assert.equal(relay.getRoomCount(), 1); // room-a deleted (empty), room-b created

    const msg = lastMessage(ws);
    assert.equal(msg.type, 'room-update');
  });

  it('ignores binary from clients not yet joined', () => {
    const ws = mockWs();
    relay.handleConnection(ws);

    // Send binary before joining — should be silently ignored
    sendBinary(ws, [0x90, 0x3c, 0x7f]);

    assert.equal(ws.sent.length, 0);
  });
});
