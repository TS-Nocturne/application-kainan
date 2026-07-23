import { createServer, type Server } from 'node:http';
import type { Client } from 'discord.js';
import { logger } from './logger.js';

const DEFAULT_PORT = 3000;

function getPort(): number {
  const rawPort = process.env.PORT?.trim();
  if (!rawPort) return DEFAULT_PORT;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function createHealthServer(client: Client): Server {
  return createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, {
        'content-type': 'application/json; charset=utf-8',
        allow: 'GET',
      });
      response.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (request.url !== '/' && request.url !== '/health') {
      response.writeHead(404, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({
      status: 'ok',
      bot: client.isReady() ? 'online' : 'starting',
      uptimeSeconds: Math.floor(process.uptime()),
    }));
  });
}

export function startHealthServer(client: Client): Server {
  const port = getPort();
  const server = createHealthServer(client);

  server.on('error', (error) => {
    logger.error('Health server failed', error);
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info(`Health server listening on port ${port}`);
  });

  return server;
}

export async function stopHealthServer(server: Server): Promise<void> {
  if (!server.listening) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
