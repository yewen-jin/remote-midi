/**
 * Rate limiting for the MIDI relay server.
 *
 * Three layers, all in-memory:
 * 1. Per-IP concurrent connection limit
 * 2. Per-IP connection rate (sliding window)
 * 3. Per-connection message rate (token bucket)
 */

/**
 * Create a connection limiter that tracks per-IP concurrent connections
 * and per-IP connection rate.
 *
 * @param {object} [options]
 * @param {number} [options.maxConnectionsPerIp=10] — max concurrent connections per IP
 * @param {number} [options.connectRateLimit=20] — max new connections per window per IP
 * @param {number} [options.connectRateWindowMs=60000] — sliding window duration in ms
 * @returns {{ onConnect: (ip: string) => { allowed: boolean, reason?: string }, onDisconnect: (ip: string) => void, cleanup: () => void, stats: () => { blockedConnections: number } }}
 */
export function createConnectionLimiter({
  maxConnectionsPerIp = 10,
  connectRateLimit = 20,
  connectRateWindowMs = 60000,
} = {}) {
  /** @type {Map<string, number>} — concurrent connection count per IP */
  const connections = new Map();

  /** @type {Map<string, { count: number, windowStart: number }>} — rate window per IP */
  const rateWindows = new Map();

  let blockedConnections = 0;

  // Periodic cleanup of stale rate window entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, window] of rateWindows) {
      if (now - window.windowStart > connectRateWindowMs) {
        rateWindows.delete(ip);
      }
    }
  }, 60000);

  // Prevent the timer from keeping the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check whether a new connection from this IP is allowed.
     *
     * @param {string} ip
     * @returns {{ allowed: boolean, reason?: string }}
     */
    onConnect(ip) {
      // Check concurrent connection limit
      const current = connections.get(ip) || 0;
      if (current >= maxConnectionsPerIp) {
        blockedConnections++;
        return { allowed: false, reason: 'Too many connections' };
      }

      // Check connection rate limit
      const now = Date.now();
      let window = rateWindows.get(ip);

      if (!window || now - window.windowStart > connectRateWindowMs) {
        // Start a new window
        window = { count: 0, windowStart: now };
        rateWindows.set(ip, window);
      }

      if (window.count >= connectRateLimit) {
        blockedConnections++;
        return { allowed: false, reason: 'Connection rate limit exceeded' };
      }

      // Allow the connection
      connections.set(ip, current + 1);
      window.count++;
      return { allowed: true };
    },

    /**
     * Decrement the connection count for an IP.
     *
     * @param {string} ip
     */
    onDisconnect(ip) {
      const current = connections.get(ip) || 0;
      if (current <= 1) {
        connections.delete(ip);
      } else {
        connections.set(ip, current - 1);
      }
    },

    /** Stop the periodic cleanup timer. */
    cleanup() {
      clearInterval(cleanupInterval);
    },

    /** @returns {{ blockedConnections: number }} */
    stats() {
      return { blockedConnections };
    },
  };
}

/**
 * Create a message rate limiter using a token bucket per connection.
 *
 * @param {object} [options]
 * @param {number} [options.messageRateLimit=500] — max messages per second per connection
 * @returns {{ onMessage: (ws: WebSocket) => boolean, onDisconnect: (ws: WebSocket) => void, stats: () => { throttledMessages: number } }}
 */
export function createMessageLimiter({ messageRateLimit = 500 } = {}) {
  /** @type {Map<WebSocket, { tokens: number, lastRefill: number }>} */
  const buckets = new Map();

  let throttledMessages = 0;

  return {
    /**
     * Check whether a message from this connection is allowed.
     * Consumes a token if available.
     *
     * @param {WebSocket} ws
     * @returns {boolean} true if the message is allowed
     */
    onMessage(ws) {
      const now = Date.now();
      let bucket = buckets.get(ws);

      if (!bucket) {
        bucket = { tokens: messageRateLimit, lastRefill: now };
        buckets.set(ws, bucket);
      }

      // Refill tokens based on elapsed time
      const elapsed = (now - bucket.lastRefill) / 1000; // seconds
      bucket.tokens = Math.min(
        messageRateLimit,
        bucket.tokens + elapsed * messageRateLimit,
      );
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        throttledMessages++;
        return false;
      }

      bucket.tokens--;
      return true;
    },

    /**
     * Clean up the bucket for a closed connection.
     *
     * @param {WebSocket} ws
     */
    onDisconnect(ws) {
      buckets.delete(ws);
    },

    /** @returns {{ throttledMessages: number }} */
    stats() {
      return { throttledMessages };
    },
  };
}
