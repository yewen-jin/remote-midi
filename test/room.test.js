import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { Room } from '../server/room.js';

/** Create a mock WebSocket with an OPEN readyState and a recording send(). */
function mockWs(readyState = WebSocket.OPEN) {
  const sent = [];
  return {
    readyState,
    send(data) {
      sent.push(data);
    },
    sent,
  };
}

describe('Room', () => {
  it('adds and counts members', () => {
    const room = new Room('test');
    const ws1 = mockWs();
    const ws2 = mockWs();

    room.addMember(ws1, 'sender', 'piano');
    room.addMember(ws2, 'receiver', 'robot-arm');

    assert.equal(room.getMemberCount(), 2);
    assert.equal(room.getSenders(), 1);
    assert.equal(room.getReceivers(), 1);
    assert.ok(room.hasMember(ws1));
    assert.ok(room.hasMember(ws2));
    assert.ok(!room.isEmpty());
  });

  it('removes members', () => {
    const room = new Room('test');
    const ws = mockWs();

    room.addMember(ws, 'sender');
    assert.equal(room.getMemberCount(), 1);

    const removed = room.removeMember(ws);
    assert.ok(removed);
    assert.equal(room.getMemberCount(), 0);
    assert.ok(room.isEmpty());
    assert.ok(!room.hasMember(ws));
  });

  it('removeMember returns false for non-member', () => {
    const room = new Room('test');
    assert.ok(!room.removeMember(mockWs()));
  });

  it('broadcastBinary sends to receivers only, skipping the sender', () => {
    const room = new Room('test');
    const sender = mockWs();
    const receiver1 = mockWs();
    const receiver2 = mockWs();
    const otherSender = mockWs();

    room.addMember(sender, 'sender');
    room.addMember(receiver1, 'receiver');
    room.addMember(receiver2, 'receiver');
    room.addMember(otherSender, 'sender');

    const data = Buffer.from([0x90, 0x3c, 0x7f]);
    room.broadcastBinary(sender, data);

    // Receivers get the data
    assert.equal(receiver1.sent.length, 1);
    assert.deepEqual(receiver1.sent[0], data);
    assert.equal(receiver2.sent.length, 1);
    assert.deepEqual(receiver2.sent[0], data);

    // Senders do not
    assert.equal(sender.sent.length, 0);
    assert.equal(otherSender.sent.length, 0);
  });

  it('broadcastBinary skips closed sockets', () => {
    const room = new Room('test');
    const sender = mockWs();
    const openReceiver = mockWs();
    const closedReceiver = mockWs(WebSocket.CLOSED);

    room.addMember(sender, 'sender');
    room.addMember(openReceiver, 'receiver');
    room.addMember(closedReceiver, 'receiver');

    room.broadcastBinary(sender, Buffer.from([0x90, 0x3c, 0x7f]));

    assert.equal(openReceiver.sent.length, 1);
    assert.equal(closedReceiver.sent.length, 0);
  });

  it('broadcastControl sends to all members', () => {
    const room = new Room('test');
    const sender = mockWs();
    const receiver = mockWs();

    room.addMember(sender, 'sender');
    room.addMember(receiver, 'receiver');

    room.broadcastControl('{"type":"room-update"}');

    assert.equal(sender.sent.length, 1);
    assert.equal(receiver.sent.length, 1);
    assert.equal(sender.sent[0], '{"type":"room-update"}');
  });

  it('broadcastControl skips closed sockets', () => {
    const room = new Room('test');
    const open = mockWs();
    const closed = mockWs(WebSocket.CLOSED);

    room.addMember(open, 'sender');
    room.addMember(closed, 'receiver');

    room.broadcastControl('{"type":"room-update"}');

    assert.equal(open.sent.length, 1);
    assert.equal(closed.sent.length, 0);
  });
});
