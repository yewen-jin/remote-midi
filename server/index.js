import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { Relay } from './relay.js';
import { createHealthHandler } from './health.js';
import { createConnectionLimiter, createMessageLimiter } from './rate-limit.js';
import { createMessage, MessageType } from './protocol.js';

/**
 * Start the MIDI relay server.
 *
 * @param {object} [config] — overrides for environment variables
 * @param {number} [config.port]
 * @param {string} [config.host]
 * @param {string} [config.wsPath]
 * @param {number} [config.pingIntervalMs]
 * @param {number} [config.pingTimeoutMs]
 * @param {number} [config.maxRooms]
 * @param {number} [config.maxClientsPerRoom]
 * @param {number} [config.maxConnectionsPerIp]
 * @param {number} [config.connectRateLimit]
 * @param {number} [config.connectRateWindowMs]
 * @param {number} [config.messageRateLimit]
 * @returns {Promise<{ httpServer: import('http').Server, wss: WebSocketServer, relay: Relay, close: () => Promise<void> }>}
 */
export function startServer(config = {}) {
  const port = config.port ?? parseInt(process.env.PORT || '3500', 10);
  const host = config.host ?? process.env.HOST ?? '127.0.0.1';
  const wsPath = config.wsPath ?? process.env.WS_PATH ?? '/midi';
  const pingIntervalMs =
    config.pingIntervalMs ??
    parseInt(process.env.PING_INTERVAL_MS || '15000', 10);
  const maxRooms =
    config.maxRooms ?? parseInt(process.env.MAX_ROOMS || '50', 10);
  const maxClientsPerRoom =
    config.maxClientsPerRoom ??
    parseInt(process.env.MAX_CLIENTS_PER_ROOM || '20', 10);
  const maxConnectionsPerIp =
    config.maxConnectionsPerIp ??
    parseInt(process.env.MAX_CONNECTIONS_PER_IP || '10', 10);
  const connectRateLimit =
    config.connectRateLimit ??
    parseInt(process.env.CONNECT_RATE_LIMIT || '20', 10);
  const connectRateWindowMs =
    config.connectRateWindowMs ??
    parseInt(process.env.CONNECT_RATE_WINDOW_MS || '60000', 10);
  const messageRateLimit =
    config.messageRateLimit ??
    parseInt(process.env.MESSAGE_RATE_LIMIT || '500', 10);

  const startTime = Date.now();
  const relay = new Relay({ maxRooms, maxClientsPerRoom });
  const connectionLimiter = createConnectionLimiter({
    maxConnectionsPerIp,
    connectRateLimit,
    connectRateWindowMs,
  });
  const messageLimiter = createMessageLimiter({ messageRateLimit });
  const healthHandler = createHealthHandler(relay, startTime, {
    connectionLimiter,
    messageLimiter,
  });

  const httpServer = createServer(healthHandler);

  const wss = new WebSocketServer({
    server: httpServer,
    path: wsPath,
  });

  // WebSocket-level ping/pong for keepalive
  const pingInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, pingIntervalMs);

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || 'unknown';

    // Per-IP connection limiting
    const result = connectionLimiter.onConnect(ip);
    if (!result.allowed) {
      ws.send(createMessage(MessageType.ERROR, { message: result.reason }));
      ws.close(1008, result.reason);
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      connectionLimiter.onDisconnect(ip);
      messageLimiter.onDisconnect(ws);
    });

    relay.handleConnection(ws, messageLimiter);
  });

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  /** Gracefully shut down the server. */
  const close = () =>
    new Promise((resolve, reject) => {
      clearInterval(pingInterval);
      connectionLimiter.cleanup();

      // Close all WebSocket connections
      for (const ws of wss.clients) {
        ws.terminate();
      }

      wss.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        httpServer.close((err2) => {
          if (err2) reject(err2);
          else resolve();
        });
      });
    });

  return new Promise((resolve, reject) => {
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] MIDI relay server listening on ${addr.address}:${addr.port}${wsPath}`,
      );
      console.log(
        `[${timestamp}] Health check: http://${addr.address}:${addr.port}/health`,
      );
      console.log(
        `[${timestamp}] Config: maxRooms=${maxRooms}, maxClientsPerRoom=${maxClientsPerRoom}, pingInterval=${pingIntervalMs}ms`,
      );
      resolve({ httpServer, wss, relay, close });
    });

    httpServer.on('error', reject);
  });
}

// Auto-start unless imported by the test runner.
// Tests import startServer() directly and call it with { port: 0 }.
const isTest = process.env.NODE_TEST_CONTEXT || process.argv.includes('--test');

if (!isTest) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Graceful shutdown
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Received ${signal}, shutting down…`);
      process.exit(0);
    });
  }
}
