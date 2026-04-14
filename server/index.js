import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { Relay } from './relay.js';
import { createHealthHandler } from './health.js';

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

  const startTime = Date.now();
  const relay = new Relay({ maxRooms, maxClientsPerRoom });
  const healthHandler = createHealthHandler(relay, startTime);

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

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    relay.handleConnection(ws);
  });

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  /** Gracefully shut down the server. */
  const close = () =>
    new Promise((resolve, reject) => {
      clearInterval(pingInterval);

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

// Run directly when this file is the entry point
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
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
