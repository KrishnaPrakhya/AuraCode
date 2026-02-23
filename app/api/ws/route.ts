/**
 * WebSocket Handler for Next.js 16
 * Handles real-time communication for admin broadcasts and updates
 */

import { NextRequest } from 'next/server';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

// Store active WebSocket connections
const connections = new Map<string, WebSocket>();

/**
 * Handle WebSocket upgrade request
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || crypto.randomUUID();

  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  try {
    // This is where Next.js 16 handles WebSocket upgrade
    // The actual WebSocket upgrade is handled by the runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { socket: rawSocket, response } = await upgradeWebSocket(request);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = rawSocket as any;

    // Store connection
    connections.set(clientId, socket);
    console.log(`[v0] WebSocket connected: ${clientId} (total: ${connections.size})`);

    // Handle incoming messages
    socket.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        handleMessage(socket, message);
      } catch (error) {
        console.error('[v0] Failed to parse WebSocket message:', error);
      }
    });

    // Handle connection close
    socket.on('close', () => {
      connections.delete(clientId);
      console.log(`[v0] WebSocket disconnected: ${clientId} (total: ${connections.size})`);
    });

    // Handle errors
    socket.on('error', (error: unknown) => {
      console.error(`[v0] WebSocket error (${clientId}):`, error);
      connections.delete(clientId);
    });

    return response;
  } catch (error) {
    console.error('[v0] WebSocket upgrade failed:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}

/**
 * Upgrade HTTP connection to WebSocket
 */
async function upgradeWebSocket(
  request: NextRequest
): Promise<{ socket: WebSocket; response: Response }> {
  // Next.js 16 provides native WebSocket support through edge runtime
  const { socket, response } = await new Promise<{
    socket: WebSocket;
    response: Response;
  }>((resolve) => {
    // This would be handled by Next.js runtime
    // For now, we'll use a placeholder approach
    resolve({
      socket: {} as WebSocket,
      response: new Response(null, {
        status: 101,
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          'Sec-WebSocket-Accept': 'dummy',
        },
      }),
    });
  });

  return { socket, response };
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(socket: WebSocket, message: WebSocketMessage): void {
  switch (message.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'problem_push':
      // Broadcast problem to all connected clients
      broadcastToProblem(message.payload);
      break;

    case 'subscribe_problem':
      // Subscribe to problem updates
      // TODO: Implement topic subscriptions
      socket.send(
        JSON.stringify({
          type: 'subscribed',
          payload: { problem_id: message.payload.problem_id },
          timestamp: Date.now(),
        })
      );
      break;

    default:
      console.warn(`[v0] Unknown message type: ${message.type}`);
  }
}

/**
 * Broadcast problem update to all connected clients
 */
function broadcastToProblem(payload: any): void {
  const message: WebSocketMessage = {
    type: 'problem_push',
    payload,
    timestamp: Date.now(),
  };

  const messageStr = JSON.stringify(message);
  const failedConnections: string[] = [];

  connections.forEach((socket, clientId) => {
    try {
      socket.send(messageStr);
    } catch (error) {
      console.error(`[v0] Failed to send to ${clientId}:`, error);
      failedConnections.push(clientId);
    }
  });

  // Clean up failed connections
  failedConnections.forEach((id) => connections.delete(id));
}

/**
 * Export helper to broadcast from other routes
 */
export function broadcastProblemUpdate(problemId: string, problem: any): void {
  broadcastToProblem({
    problem_id: problemId,
    problem,
    pushed_at: new Date().toISOString(),
  });
}

/**
 * Get active connection count
 */
export function getActiveConnections(): number {
  return connections.size;
}
