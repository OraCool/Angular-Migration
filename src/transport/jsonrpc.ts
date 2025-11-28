/**
 * JSON-RPC 2.0 Transport over stdio
 * Handles communication with Zed IDE via stdin/stdout
 */

import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, JsonRpcError } from '../types/acp.js';

type MessageHandler = (method: string, params: Record<string, unknown>) => Promise<unknown>;
type NotificationHandler = (method: string, params: Record<string, unknown>) => Promise<void>;

export class JsonRpcTransport {
  private buffer = '';
  private messageHandlers = new Map<string, MessageHandler>();
  private notificationHandlers = new Map<string, NotificationHandler>();
  private pendingRequests = new Map<number | string, {
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }>();
  private nextId = 1;

  constructor() {
    this.setupStdio();
  }

  private setupStdio(): void {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.processBuffer();
    });

    process.stdin.on('end', () => {
      this.cleanup();
    });
  }

  private processBuffer(): void {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) break;

      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line) {
        this.handleMessage(line);
      }
    }
  }

  private handleMessage(line: string): void {
    try {
      const message = JSON.parse(line);
      
      if ('id' in message && 'method' in message) {
        // Request from client
        this.handleRequest(message as JsonRpcRequest);
      } else if ('id' in message) {
        // Response from client
        this.handleResponse(message as JsonRpcResponse);
      } else if ('method' in message) {
        // Notification from client
        this.handleNotification(message as JsonRpcNotification);
      }
    } catch (error) {
      this.logError('Failed to parse message', error);
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    const handler = this.messageHandlers.get(request.method);
    
    if (!handler) {
      this.sendError(request.id, -32601, `Method not found: ${request.method}`);
      return;
    }

    try {
      const result = await handler(request.method, request.params || {});
      this.sendResponse(request.id, result);
    } catch (error) {
      this.sendError(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(response.error);
    } else {
      pending.resolve(response.result);
    }
  }

  private async handleNotification(notification: JsonRpcNotification): Promise<void> {
    const handler = this.notificationHandlers.get(notification.method);
    if (handler) {
      try {
        await handler(notification.method, notification.params || {});
      } catch (error) {
        this.logError(`Error handling notification ${notification.method}`, error);
      }
    }
  }

  /**
   * Register a handler for incoming requests from the client
   */
  onRequest(method: string, handler: MessageHandler): void {
    this.messageHandlers.set(method, handler);
  }

  /**
   * Register a handler for incoming notifications from the client
   */
  onNotification(method: string, handler: NotificationHandler): void {
    this.notificationHandlers.set(method, handler);
  }

  /**
   * Send a request to the client and wait for a response
   */
  async sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.send({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });
    });
  }

  /**
   * Send a notification to the client (no response expected)
   */
  sendNotification(method: string, params: Record<string, unknown>): void {
    this.send({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  /**
   * Send a response to a request
   */
  private sendResponse(id: number | string, result: unknown): void {
    this.send({
      jsonrpc: '2.0',
      id,
      result,
    });
  }

  /**
   * Send an error response
   */
  private sendError(id: number | string, code: number, message: string, data?: unknown): void {
    this.send({
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    });
  }

  /**
   * Send a JSON-RPC message to stdout
   */
  private send(message: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void {
    const json = JSON.stringify(message);
    process.stdout.write(json + '\n');
  }

  /**
   * Log error to stderr (won't interfere with JSON-RPC communication)
   */
  private logError(message: string, error: unknown): void {
    process.stderr.write(`[ACP Agent Error] ${message}: ${error}\n`);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}
