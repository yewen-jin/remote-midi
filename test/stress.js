/**
 * Stress test — 5 senders × 5 receivers, MIDI clock rate, reconnection.
 *
 * Each sender transmits at 48 messages/second (120 BPM × 24 ppqn).
 * Message format: 4 bytes — [senderId, seqByte2, seqByte1, seqByte0]
 * Each WebSocket frame is atomic, so receivers get complete messages.
 *
 * Usage: node test/stress.js
 */

import { startServer } from '../server/index.js';
import { WebSocket } from 'ws';

// ── Config ───────────────────────────────────────────────────────

const ROOM = 'stress-test';
const NUM_SENDERS = 5;
const NUM_RECEIVERS = 5;
const MSG_RATE_HZ = 48; // 120 BPM × 24 ppqn
const MSG_INTERVAL_MS = 1000 / MSG_RATE_HZ; // ~20.83 ms
const PHASE_DURATION_MS = 5000; // 5 s normal run
const RECONNECT_DELAY_MS = 1000; // wait before reconnect
const RECONNECT_PHASE_MS = 3000; // additional run after reconnect

// ── Helpers ──────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

/** Encode [senderId, seq] into a 4-byte Buffer. */
function encodeMsg(senderId, seq) {
  const buf = Buffer.allocUnsafe(4);
  buf[0] = senderId;
  buf[1] = (seq >> 16) & 0xff;
  buf[2] = (seq >> 8) & 0xff;
  buf[3] = seq & 0xff;
  return buf;
}

/** Decode a 4-byte Buffer into { senderId, seq }. */
function decodeMsg(buf) {
  return {
    senderId: buf[0],
    seq: (buf[1] << 16) | (buf[2] << 8) | buf[3],
  };
}

/**
 * Open a WebSocket, join the room, resolve when joined.
 *
 * @param {string} url
 * @param {string} role
 * @param {string} name
 * @returns {Promise<WebSocket>}
 */
function joinRoom(url, role, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', room: ROOM, role, name }));
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joined') resolve(ws);
      if (msg.type === 'error') reject(new Error(msg.message));
    });
    ws.on('error', reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const server = await startServer({ port: 0, pingIntervalMs: 60000 });
  const port = server.httpServer.address().port;
  const url = `ws://127.0.0.1:${port}/midi`;

  console.log(`\n[${ts()}] Relay started on port ${port}`);
  console.log(`[${ts()}] ${NUM_SENDERS} senders × ${NUM_RECEIVERS} receivers`);
  console.log(`[${ts()}] Rate: ${MSG_RATE_HZ} msg/s per sender\n`);

  // ── Connect receivers ──────────────────────────────────────────

  /**
   * Per-receiver tracking:
   *   received[receiverIdx][senderId] = { count, lastSeq, gaps }
   */
  const received = Array.from({ length: NUM_RECEIVERS }, () =>
    Array.from({ length: NUM_SENDERS }, () => ({
      count: 0,
      lastSeq: -1,
      gaps: 0,
    })),
  );

  const receivers = await Promise.all(
    Array.from({ length: NUM_RECEIVERS }, async (_, i) => {
      const ws = await joinRoom(url, 'receiver', `receiver-${i}`);
      ws.on('message', (data, isBinary) => {
        if (!isBinary) return;
        const buf = Buffer.from(data);
        if (buf.length !== 4) return;
        const { senderId, seq } = decodeMsg(buf);
        const track = received[i][senderId];
        track.count++;
        if (track.lastSeq >= 0 && seq !== track.lastSeq + 1) {
          track.gaps++;
        }
        track.lastSeq = seq;
      });
      return ws;
    }),
  );
  console.log(`[${ts()}] All ${NUM_RECEIVERS} receivers connected`);

  // ── Connect senders ────────────────────────────────────────────

  /** Per-sender sent count. */
  const sent = new Array(NUM_SENDERS).fill(0);

  /**
   * Start a sender loop. Returns a stop function.
   *
   * @param {WebSocket} ws
   * @param {number} id
   * @returns {() => void} stop
   */
  function startSending(ws, id) {
    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(encodeMsg(id, sent[id]));
      sent[id]++;
    }, MSG_INTERVAL_MS);
    return () => clearInterval(interval);
  }

  const senderSockets = await Promise.all(
    Array.from({ length: NUM_SENDERS }, async (_, i) => {
      const ws = await joinRoom(url, 'sender', `sender-${i}`);
      return ws;
    }),
  );
  console.log(`[${ts()}] All ${NUM_SENDERS} senders connected`);

  const stops = senderSockets.map((ws, i) => startSending(ws, i));

  // ── Phase 1: Normal run ────────────────────────────────────────

  console.log(
    `\n[${ts()}] Phase 1: blasting for ${PHASE_DURATION_MS / 1000}s…`,
  );
  await sleep(PHASE_DURATION_MS);
  stops.forEach((stop) => stop());

  const sentAfterPhase1 = [...sent];

  // ── Phase 2: Kill sender 0 and reconnect ───────────────────────

  console.log(`\n[${ts()}] Phase 2: killing sender-0…`);
  senderSockets[0].terminate(); // unclean disconnect

  await sleep(RECONNECT_DELAY_MS);

  console.log(`[${ts()}] Reconnecting sender-0…`);
  const newWs = await joinRoom(url, 'sender', 'sender-0');
  senderSockets[0] = newWs;
  const newStop = startSending(newWs, 0);
  console.log(
    `[${ts()}] sender-0 reconnected. Resuming for ${RECONNECT_PHASE_MS / 1000}s…`,
  );

  await sleep(RECONNECT_PHASE_MS);
  newStop();

  // Brief settle time for in-flight messages
  await sleep(300);

  // ── Results ────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════');
  console.log('  STRESS TEST RESULTS');
  console.log('══════════════════════════════════════════\n');

  console.log('Sent (total per sender):');
  sent.forEach((n, i) => console.log(`  sender-${i}: ${n} messages`));
  const totalSent = sent.reduce((a, b) => a + b, 0);
  console.log(`  Total: ${totalSent}\n`);

  // Expected: each receiver should get every message from every sender
  let totalDropped = 0;
  let totalGaps = 0;
  let allPassed = true;

  console.log('Received (per receiver × sender):');
  for (let r = 0; r < NUM_RECEIVERS; r++) {
    for (let s = 0; s < NUM_SENDERS; s++) {
      const track = received[r][s];
      const expected = sent[s];
      const dropped = expected - track.count;
      const status = dropped === 0 && track.gaps === 0 ? '✓' : '✗';
      if (dropped !== 0 || track.gaps !== 0) allPassed = false;
      totalDropped += Math.max(0, dropped);
      totalGaps += track.gaps;
      console.log(
        `  receiver-${r} ← sender-${s}: ${track.count}/${expected} received` +
          (dropped !== 0 ? `  [${dropped} dropped]` : '') +
          (track.gaps !== 0 ? `  [${track.gaps} sequence gaps]` : '') +
          `  ${status}`,
      );
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`  Total sent:    ${totalSent}`);
  console.log(
    `  Total dropped: ${totalDropped} (${((totalDropped / (totalSent * NUM_RECEIVERS)) * 100).toFixed(2)}%)`,
  );
  console.log(`  Sequence gaps: ${totalGaps}`);
  console.log(
    `  Reconnect:     sender-0 killed and rejoined — resumed from seq ${sentAfterPhase1[0]}, ended at ${sent[0]}`,
  );
  console.log(
    `\n  Result: ${allPassed ? 'ALL PASS ✓' : 'FAILURES DETECTED ✗'}`,
  );
  console.log('══════════════════════════════════════════\n');

  // ── Teardown ───────────────────────────────────────────────────

  for (const ws of [...senderSockets, ...receivers]) {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  }
  await server.close();
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Stress test failed:', err);
  process.exit(1);
});
