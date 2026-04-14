/**
 * Health check HTTP handler for monitoring the relay server.
 */

/**
 * Create an HTTP request handler that responds to GET /health
 * with server status information.
 *
 * @param {import('./relay.js').Relay} relay — the relay instance to report on
 * @param {number} startTime — timestamp (ms) when the server started
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => void}
 */
export function createHealthHandler(relay, startTime) {
  return (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const body = JSON.stringify({
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        rooms: relay.getRoomCount(),
        connections: relay.getClientCount(),
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end();
    }
  };
}
