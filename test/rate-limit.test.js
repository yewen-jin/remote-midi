import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createConnectionLimiter,
  createMessageLimiter,
} from '../server/rate-limit.js';

describe('createConnectionLimiter', () => {
  it('allows connections up to the limit', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 3,
      connectRateLimit: 100,
    });

    assert.deepEqual(limiter.onConnect('1.2.3.4'), { allowed: true });
    assert.deepEqual(limiter.onConnect('1.2.3.4'), { allowed: true });
    assert.deepEqual(limiter.onConnect('1.2.3.4'), { allowed: true });

    limiter.cleanup();
  });

  it('rejects connections beyond the concurrent limit', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 2,
      connectRateLimit: 100,
    });

    limiter.onConnect('1.2.3.4');
    limiter.onConnect('1.2.3.4');
    const result = limiter.onConnect('1.2.3.4');

    assert.equal(result.allowed, false);
    assert.match(result.reason, /Too many connections/);

    limiter.cleanup();
  });

  it('decrements count on disconnect, allowing new connections', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 2,
      connectRateLimit: 100,
    });

    limiter.onConnect('1.2.3.4');
    limiter.onConnect('1.2.3.4');

    // At limit — disconnect one
    limiter.onDisconnect('1.2.3.4');

    // Should be allowed again
    const result = limiter.onConnect('1.2.3.4');
    assert.equal(result.allowed, true);

    limiter.cleanup();
  });

  it('tracks IPs independently', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 1,
      connectRateLimit: 100,
    });

    assert.deepEqual(limiter.onConnect('1.1.1.1'), { allowed: true });
    assert.deepEqual(limiter.onConnect('2.2.2.2'), { allowed: true });

    // Each IP at its limit
    assert.equal(limiter.onConnect('1.1.1.1').allowed, false);
    assert.equal(limiter.onConnect('2.2.2.2').allowed, false);

    limiter.cleanup();
  });

  it('enforces connection rate limit within the window', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 100,
      connectRateLimit: 3,
      connectRateWindowMs: 60000,
    });

    // Connect and immediately disconnect to avoid concurrent limit
    for (let i = 0; i < 3; i++) {
      limiter.onConnect('1.2.3.4');
      limiter.onDisconnect('1.2.3.4');
    }

    // Fourth connection within the window should be rejected
    const result = limiter.onConnect('1.2.3.4');
    assert.equal(result.allowed, false);
    assert.match(result.reason, /rate limit/i);

    limiter.cleanup();
  });

  it('resets rate window after the window expires', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 100,
      connectRateLimit: 2,
      connectRateWindowMs: 1, // 1ms window — expires almost immediately
    });

    limiter.onConnect('1.2.3.4');
    limiter.onDisconnect('1.2.3.4');
    limiter.onConnect('1.2.3.4');
    limiter.onDisconnect('1.2.3.4');

    // Wait for the window to expire
    // Use a synchronous busy-wait to ensure the window elapses
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy-wait
    }

    const result = limiter.onConnect('1.2.3.4');
    assert.equal(result.allowed, true);

    limiter.cleanup();
  });

  it('reports blocked connection stats', () => {
    const limiter = createConnectionLimiter({
      maxConnectionsPerIp: 1,
      connectRateLimit: 100,
    });

    limiter.onConnect('1.2.3.4');
    limiter.onConnect('1.2.3.4'); // blocked
    limiter.onConnect('1.2.3.4'); // blocked

    assert.equal(limiter.stats().blockedConnections, 2);

    limiter.cleanup();
  });
});

describe('createMessageLimiter', () => {
  it('allows messages up to the rate limit', () => {
    const limiter = createMessageLimiter({ messageRateLimit: 5 });
    const ws = {};

    // Should allow at least 5 messages (initial bucket is full)
    for (let i = 0; i < 5; i++) {
      assert.equal(limiter.onMessage(ws), true);
    }
  });

  it('blocks messages when the bucket is empty', () => {
    const limiter = createMessageLimiter({ messageRateLimit: 3 });
    const ws = {};

    // Exhaust the bucket
    for (let i = 0; i < 3; i++) {
      limiter.onMessage(ws);
    }

    // Next message should be blocked
    assert.equal(limiter.onMessage(ws), false);
  });

  it('refills tokens after a delay', async () => {
    const limiter = createMessageLimiter({ messageRateLimit: 100 });
    const ws = {};

    // Exhaust all tokens
    for (let i = 0; i < 100; i++) {
      limiter.onMessage(ws);
    }

    assert.equal(limiter.onMessage(ws), false);

    // Wait for some refill (100 tokens/sec = 1 token per 10ms)
    await new Promise((r) => setTimeout(r, 50));

    // Should have refilled some tokens
    assert.equal(limiter.onMessage(ws), true);
  });

  it('tracks connections independently', () => {
    const limiter = createMessageLimiter({ messageRateLimit: 2 });
    const ws1 = {};
    const ws2 = {};

    limiter.onMessage(ws1);
    limiter.onMessage(ws1);
    assert.equal(limiter.onMessage(ws1), false); // ws1 exhausted

    // ws2 should still have tokens
    assert.equal(limiter.onMessage(ws2), true);
  });

  it('cleans up on disconnect', () => {
    const limiter = createMessageLimiter({ messageRateLimit: 2 });
    const ws = {};

    limiter.onMessage(ws);
    limiter.onMessage(ws);
    assert.equal(limiter.onMessage(ws), false);

    // Disconnect and reconnect — should get a fresh bucket
    limiter.onDisconnect(ws);
    assert.equal(limiter.onMessage(ws), true);
  });

  it('reports throttled message stats', () => {
    const limiter = createMessageLimiter({ messageRateLimit: 1 });
    const ws = {};

    limiter.onMessage(ws); // allowed
    limiter.onMessage(ws); // throttled
    limiter.onMessage(ws); // throttled

    assert.equal(limiter.stats().throttledMessages, 2);
  });
});
