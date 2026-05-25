import type { FastifyInstance, FastifyReply } from 'fastify';

const HEARTBEAT_MS = 25_000;

const clients = new Set<FastifyReply>();

function format(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function broadcastEvent(event: string, data: unknown = {}): void {
  const msg = format(event, data);
  for (const reply of clients) {
    try {
      reply.raw.write(msg);
    } catch {
      clients.delete(reply);
    }
  }
}

export async function eventsRoute(app: FastifyInstance): Promise<void> {
  app.get('/api/events', (req, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tell nginx (and similar) not to buffer this stream.
      'X-Accel-Buffering': 'no',
    });
    // Initial comment to flush headers, then a hello event so the client
    // knows the stream is live (and can use this to trigger refresh-on-open).
    reply.raw.write(': connected\n\n');
    reply.raw.write(format('hello', { ts: Date.now() }));

    clients.add(reply);

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(': hb\n\n');
      } catch {
        clearInterval(heartbeat);
        clients.delete(reply);
      }
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    const cleanup = () => {
      clearInterval(heartbeat);
      clients.delete(reply);
    };
    req.raw.on('close', cleanup);
    req.raw.on('error', cleanup);
  });
}

export function connectedClientCount(): number {
  return clients.size;
}
