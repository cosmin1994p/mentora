/**
 * Server-Sent Events (SSE) Service
 * Broadcasts admin-only updates (e.g. course package tier changes) to connected clients.
 */

let clients = [];

const HEARTBEAT_MS = 25000;

/**
 * Register a new client for SSE
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sseHandler = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ message: 'SSE connection established' })}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter((client) => client.id !== clientId);
  });
};

/**
 * Broadcast an event to all connected clients
 * @param {string} event - The event name
 * @param {Object} data - The event payload
 */
export const broadcastEvent = (event, data) => {
  clients.forEach((client) => {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Error broadcasting to client', err);
    }
  });
};
