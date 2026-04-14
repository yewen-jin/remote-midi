import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHealthHandler } from '../server/health.js';

/** Create a mock relay with configurable counts. */
function mockRelay(rooms = 0, clients = 0) {
  return {
    getRoomCount: () => rooms,
    getClientCount: () => clients,
  };
}

/** Create a mock HTTP response that captures status and body. */
function mockRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(code, headers) {
      res.statusCode = code;
      if (headers) Object.assign(res.headers, headers);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

describe('createHealthHandler', () => {
  it('returns 200 with status info for GET /health', () => {
    const handler = createHealthHandler(mockRelay(2, 5), Date.now() - 60000);
    const res = mockRes();

    handler({ method: 'GET', url: '/health' }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'application/json');

    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.ok(body.uptime >= 59); // at least 59 seconds
    assert.equal(body.rooms, 2);
    assert.equal(body.connections, 5);
  });

  it('returns 404 for other paths', () => {
    const handler = createHealthHandler(mockRelay(), Date.now());
    const res = mockRes();

    handler({ method: 'GET', url: '/other' }, res);

    assert.equal(res.statusCode, 404);
  });

  it('returns 404 for non-GET methods', () => {
    const handler = createHealthHandler(mockRelay(), Date.now());
    const res = mockRes();

    handler({ method: 'POST', url: '/health' }, res);

    assert.equal(res.statusCode, 404);
  });
});
