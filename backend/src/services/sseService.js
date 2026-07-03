/**
 * Server-Sent Events (SSE) Service
 * Used for broadcasting real-time updates to connected clients.
 */

let clients = [];

/**
 * Register a new client for SSE
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sseHandler = (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // Allow CORS if needed, but standard CORS middleware in server.js should handle it
  });

  // Send initial connected event
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ message: 'SSE connection established' })}\n\n`);

  // Add this client to the clients array
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  // When client closes connection, remove them from the array
  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
};

/**
 * Broadcast an event to all connected clients
 * @param {string} event - The event name
 * @param {Object} data - The event payload
 */
export const broadcastEvent = (event, data) => {
  clients.forEach(client => {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Error broadcasting to client', err);
    }
  });
};
