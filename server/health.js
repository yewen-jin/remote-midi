/**
 * HTTP handler for health checks and static file serving.
 */

import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const STATIC_ROOT = join(__dirname, '..', 'client', 'browser');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Create an HTTP request handler that responds to GET /health
 * with server status information, and serves static files from
 * client/browser/ on all other GET requests.
 *
 * @param {import('./relay.js').Relay} relay — the relay instance to report on
 * @param {number} startTime — timestamp (ms) when the server started
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => void}
 */
export function createHealthHandler(relay, startTime) {
  return async (req, res) => {
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
      return;
    }

    // Serve static files from client/browser/
    if (req.method === 'GET') {
      let filePath = req.url === '/' ? '/index.html' : req.url;

      // Prevent directory traversal
      if (filePath.includes('..')) {
        res.writeHead(403);
        res.end();
        return;
      }

      const fullPath = join(STATIC_ROOT, filePath);
      try {
        const data = await readFile(fullPath);
        const ext = extname(fullPath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': data.length,
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    res.writeHead(404);
    res.end();
  };
}
