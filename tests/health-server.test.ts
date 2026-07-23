import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Client } from 'discord.js';
import { createHealthServer } from '../src/health-server.js';

function fakeClient(isReady: boolean): Client {
  return {
    isReady: () => isReady,
  } as Client;
}

test('GET /health returns the service and bot status', async (context) => {
  const server = createHealthServer(fakeClient(true));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());

  const { port } = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json() as {
    status: string;
    bot: string;
    uptimeSeconds: number;
  };

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.status, 'ok');
  assert.equal(body.bot, 'online');
  assert.equal(typeof body.uptimeSeconds, 'number');
});

test('unknown paths return 404', async (context) => {
  const server = createHealthServer(fakeClient(false));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());

  const { port } = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/unknown`);

  assert.equal(response.status, 404);
});
