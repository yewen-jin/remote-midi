import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseControlMessage,
  createMessage,
  MessageType,
  Role,
} from '../server/protocol.js';

describe('parseControlMessage', () => {
  it('parses a valid join message with sender role', () => {
    const msg = parseControlMessage(
      JSON.stringify({ type: 'join', room: 'test-room', role: 'sender' }),
    );
    assert.equal(msg.type, 'join');
    assert.equal(msg.room, 'test-room');
    assert.equal(msg.role, 'sender');
  });

  it('parses a valid join message with receiver role', () => {
    const msg = parseControlMessage(
      JSON.stringify({ type: 'join', room: 'test-room', role: 'receiver' }),
    );
    assert.equal(msg.role, 'receiver');
  });

  it('parses a join message with an optional name', () => {
    const msg = parseControlMessage(
      JSON.stringify({
        type: 'join',
        room: 'test-room',
        role: 'sender',
        name: 'piano-1',
      }),
    );
    assert.equal(msg.name, 'piano-1');
  });

  it('parses a join message without a name', () => {
    const msg = parseControlMessage(
      JSON.stringify({ type: 'join', room: 'test-room', role: 'sender' }),
    );
    assert.equal(msg.name, undefined);
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => parseControlMessage('not json'), /Invalid JSON/);
  });

  it('throws on missing type', () => {
    assert.throws(
      () => parseControlMessage(JSON.stringify({ room: 'test' })),
      /Message type is required/,
    );
  });

  it('throws on unknown type', () => {
    assert.throws(
      () =>
        parseControlMessage(JSON.stringify({ type: 'unknown', room: 'test' })),
      /Unknown message type/,
    );
  });

  it('throws on join missing room', () => {
    assert.throws(
      () =>
        parseControlMessage(
          JSON.stringify({ type: 'join', role: 'sender' }),
        ),
      /Room name is required/,
    );
  });

  it('throws on join with invalid role', () => {
    assert.throws(
      () =>
        parseControlMessage(
          JSON.stringify({ type: 'join', room: 'test', role: 'admin' }),
        ),
      /Invalid role/,
    );
  });

  it('parses a valid ping message', () => {
    const msg = parseControlMessage(JSON.stringify({ type: 'ping' }));
    assert.equal(msg.type, 'ping');
  });
});

describe('createMessage', () => {
  it('creates a valid joined message', () => {
    const json = createMessage(MessageType.JOINED, {
      room: 'test-room',
      role: 'sender',
      members: 3,
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.type, 'joined');
    assert.equal(parsed.room, 'test-room');
    assert.equal(parsed.members, 3);
  });

  it('creates an error message', () => {
    const json = createMessage(MessageType.ERROR, {
      message: 'Something went wrong',
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.type, 'error');
    assert.equal(parsed.message, 'Something went wrong');
  });

  it('throws on unknown message type', () => {
    assert.throws(() => createMessage('bogus'), /Unknown message type/);
  });

  it('round-trips with parseControlMessage', () => {
    const json = createMessage(MessageType.PONG, { time: 1714000000000 });
    const parsed = parseControlMessage(json);
    assert.equal(parsed.type, 'pong');
    assert.equal(parsed.time, 1714000000000);
  });
});

describe('constants', () => {
  it('MessageType is frozen', () => {
    assert.ok(Object.isFrozen(MessageType));
  });

  it('Role is frozen', () => {
    assert.ok(Object.isFrozen(Role));
  });

  it('Role has sender and receiver', () => {
    assert.equal(Role.SENDER, 'sender');
    assert.equal(Role.RECEIVER, 'receiver');
  });
});
