import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { startServer } from '../server/index.js';

let server;
let port;

/**
 * Connect a WebSocket client, join a room, and wait for the joined confirmation.
 *
 * @param {string} room
 * @param {string} role
 * @param {string} [name]
 * @returns {Promise<WebSocket>}
 */
async function connectClient(room, role, name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/midi`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const joinMsg = { type: 'join', room, role };
  if (name) joinMsg.name = name;
  ws.send(JSON.stringify(joinMsg));

  // Wait for joined confirmation
  const msg = await nextTextMessage(ws);
  assert.equal(msg.type, 'joined');
  return ws;
}

/**
 * Wait for the next text (JSON) message on a WebSocket.
 *
 * @param {WebSocket} ws
 * @param {number} [timeoutMs=2000]
 * @returns {Promise<object>}
 */
function nextTextMessage(ws, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for text message')),
      timeoutMs,
    );

    const handler = (data, isBinary) => {
      if (isBinary) return; // Skip binary, keep waiting
      clearTimeout(timeout);
      ws.removeListener('message', handler);
      resolve(JSON.parse(data.toString()));
    };

    ws.on('message', handler);
  });
}

/**
 * Wait for the next binary message on a WebSocket.
 *
 * @param {WebSocket} ws
 * @param {number} [timeoutMs=2000]
 * @returns {Promise<Buffer>}
 */
function nextBinaryMessage(ws, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for binary message')),
      timeoutMs,
    );

    const handler = (data, isBinary) => {
      if (!isBinary) return; // Skip text, keep waiting
      clearTimeout(timeout);
      ws.removeListener('message', handler);
      resolve(Buffer.from(data));
    };

    ws.on('message', handler);
  });
}

/**
 * Perform an HTTP GET and return the parsed JSON body.
 *
 * @param {string} path
 * @returns {Promise<{ statusCode: number, body: object }>}
 */
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
      res.on('error', reject);
    });
  });
}

/** Drain any pending text messages (e.g. room-update) before expecting binary. */
async function drainTextMessages(ws, count = 5) {
  for (let i = 0; i < count; i++) {
    try {
      await nextTextMessage(ws, 100);
    } catch {
      break;
    }
  }
}

describe('Integration', () => {
  before(async () => {
    server = await startServer({
      port: 0,
      host: '127.0.0.1',
      pingIntervalMs: 60000, // Long interval to avoid noise in tests
    });
    port = server.httpServer.address().port;
  });

  after(async () => {
    await server.close();
  });

  it('relays a Note On message from sender to receiver', async () => {
    const sender = await connectClient('integration-1', 'sender');
    const receiver = await connectClient('integration-1', 'receiver');

    // Drain room-update messages
    await drainTextMessages(receiver);

    const noteOn = Buffer.from([0x90, 0x3c, 0x7f]);
    const binaryPromise = nextBinaryMessage(receiver);
    sender.send(noteOn);

    const received = await binaryPromise;
    assert.deepEqual([...received], [0x90, 0x3c, 0x7f]);

    sender.close();
    receiver.close();
  });

  it('relays a SysEx message intact', async () => {
    const sender = await connectClient('integration-sysex', 'sender');
    const receiver = await connectClient('integration-sysex', 'receiver');

    await drainTextMessages(receiver);

    // SysEx: F0 <manufacturer> <data...> F7
    const sysex = Buffer.from([0xf0, 0x7e, 0x01, 0x02, 0x03, 0x04, 0x05, 0xf7]);
    const binaryPromise = nextBinaryMessage(receiver);
    sender.send(sysex);

    const received = await binaryPromise;
    assert.deepEqual([...received], [...sysex]);

    sender.close();
    receiver.close();
  });

  it('delivers from multiple senders to a receiver', async () => {
    const sender1 = await connectClient('integration-multi', 'sender', 'piano');
    const sender2 = await connectClient(
      'integration-multi',
      'sender',
      'guitar',
    );
    const receiver = await connectClient(
      'integration-multi',
      'receiver',
      'robot',
    );

    await drainTextMessages(receiver);

    const msg1 = Buffer.from([0x90, 0x3c, 0x7f]); // Note On from sender1
    const msg2 = Buffer.from([0x80, 0x3c, 0x00]); // Note Off from sender2

    const p1 = nextBinaryMessage(receiver);
    sender1.send(msg1);
    const r1 = await p1;
    assert.deepEqual([...r1], [0x90, 0x3c, 0x7f]);

    const p2 = nextBinaryMessage(receiver);
    sender2.send(msg2);
    const r2 = await p2;
    assert.deepEqual([...r2], [0x80, 0x3c, 0x00]);

    // Senders should not receive each other's binary
    // (they'd have received it by now if they were going to)
    sender1.close();
    sender2.close();
    receiver.close();
  });

  it('new receiver picks up subsequent messages after another disconnects', async () => {
    const sender = await connectClient('integration-reconnect', 'sender');
    const receiver1 = await connectClient('integration-reconnect', 'receiver');

    await drainTextMessages(receiver1);

    // First message to receiver1
    const p1 = nextBinaryMessage(receiver1);
    sender.send(Buffer.from([0x90, 0x3c, 0x7f]));
    await p1;

    // Disconnect receiver1
    receiver1.close();

    // Wait a moment for close to propagate
    await new Promise((r) => setTimeout(r, 100));

    // New receiver joins
    const receiver2 = await connectClient('integration-reconnect', 'receiver');
    await drainTextMessages(receiver2);

    // Second message to receiver2
    const p2 = nextBinaryMessage(receiver2);
    sender.send(Buffer.from([0x80, 0x3c, 0x00]));
    const r2 = await p2;
    assert.deepEqual([...r2], [0x80, 0x3c, 0x00]);

    sender.close();
    receiver2.close();
  });

  it('isolates rooms — no cross-room leakage', async () => {
    const senderA = await connectClient('room-a', 'sender');
    const receiverA = await connectClient('room-a', 'receiver');
    const receiverB = await connectClient('room-b', 'receiver');

    await drainTextMessages(receiverA);
    await drainTextMessages(receiverB);

    const pA = nextBinaryMessage(receiverA);
    senderA.send(Buffer.from([0x90, 0x3c, 0x7f]));
    await pA;

    // receiverB should NOT get anything — verify with a timeout
    await assert.rejects(nextBinaryMessage(receiverB, 200), /Timed out/);

    senderA.close();
    receiverA.close();
    receiverB.close();
  });

  it('relay latency is under 50ms on localhost', async () => {
    const sender = await connectClient('latency-test', 'sender');
    const receiver = await connectClient('latency-test', 'receiver');

    await drainTextMessages(receiver);

    const iterations = 20;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const noteOn = Buffer.from([0x90, 0x30 + i, 0x7f]);
      const promise = nextBinaryMessage(receiver);
      const start = performance.now();
      sender.send(noteOn);
      await promise;
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const max = Math.max(...latencies);

    console.log(
      `Relay latency — avg: ${avg.toFixed(2)}ms, max: ${max.toFixed(2)}ms`,
    );

    assert.ok(avg < 50, `Average latency ${avg.toFixed(2)}ms exceeds 50ms`);
    assert.ok(max < 50, `Max latency ${max.toFixed(2)}ms exceeds 50ms`);

    sender.close();
    receiver.close();
  });

  it('application-level ping/pong returns pong with timestamp', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/midi`);
    await new Promise((resolve) => ws.on('open', resolve));

    ws.send(
      JSON.stringify({ type: 'join', room: 'ping-test', role: 'sender' }),
    );
    await nextTextMessage(ws); // joined
    await drainTextMessages(ws);

    ws.send(JSON.stringify({ type: 'ping' }));
    const pong = await nextTextMessage(ws);

    assert.equal(pong.type, 'pong');
    assert.equal(typeof pong.time, 'number');
    assert.ok(pong.time > 0);

    ws.close();
  });

  it('client can rejoin room after unclean disconnect', async () => {
    const sender = await connectClient('resilience-test', 'sender');
    const receiver = await connectClient('resilience-test', 'receiver');

    await drainTextMessages(receiver);

    // Verify initial relay works
    const p1 = nextBinaryMessage(receiver);
    sender.send(Buffer.from([0x90, 0x3c, 0x7f]));
    await p1;

    // Simulate unclean disconnect by terminating the socket
    receiver.terminate();

    // Wait for server to detect the close
    await new Promise((r) => setTimeout(r, 100));

    // Reconnect as a new receiver
    const receiver2 = await connectClient('resilience-test', 'receiver');
    await drainTextMessages(receiver2);

    // Verify relay still works with the new receiver
    const p2 = nextBinaryMessage(receiver2);
    sender.send(Buffer.from([0x80, 0x3c, 0x00]));
    const r2 = await p2;
    assert.deepEqual([...r2], [0x80, 0x3c, 0x00]);

    sender.close();
    receiver2.close();
  });

  it('sender can rejoin after disconnecting', async () => {
    const receiver = await connectClient('sender-rejoin', 'receiver');

    // First sender
    let sender = await connectClient('sender-rejoin', 'sender');
    await drainTextMessages(receiver);

    const p1 = nextBinaryMessage(receiver);
    sender.send(Buffer.from([0x90, 0x3c, 0x7f]));
    await p1;

    sender.close();
    await new Promise((r) => setTimeout(r, 100));

    // Second sender joins same room
    sender = await connectClient('sender-rejoin', 'sender');
    await drainTextMessages(receiver);

    const p2 = nextBinaryMessage(receiver);
    sender.send(Buffer.from([0x90, 0x40, 0x7f]));
    const r2 = await p2;
    assert.deepEqual([...r2], [0x90, 0x40, 0x7f]);

    sender.close();
    receiver.close();
  });

  it('health endpoint returns 200 with correct shape', async () => {
    const { statusCode, body } = await httpGet('/health');

    assert.equal(statusCode, 200);
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.equal(typeof body.rooms, 'number');
    assert.equal(typeof body.connections, 'number');
  });
});
