/**
 * Debug logging utilities for MCP server
 * Helps diagnose streaming and progress notification issues
 */

/**
 * Log tool request details to help diagnose streaming issues
 */
export function logToolRequest(
  toolName: string,
  hasProgressToken: boolean,
  progressToken?: string | number
): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [DEBUG] Tool Request: ${toolName}`);
  console.error(`  - Has progressToken: ${hasProgressToken}`);
  if (hasProgressToken) {
    console.error(`  - progressToken value: ${progressToken}`);
  } else {
    console.error(`  - ⚠️  NO progressToken provided by client`);
    console.error(`  - Streaming will buffer only, no real-time notifications`);
  }
}

/**
 * Log when a progress notification is sent
 */
export function logProgressNotification(
  toolName: string,
  progressToken: string | number,
  progress: number,
  message: string
): void {
  console.error(
    `[DEBUG] Sent progress notification: token=${progressToken}, progress=${progress}, msg="${message.substring(0, 50)}..."`
  );
}

/**
 * Log notification send errors
 */
export function logNotificationError(error: unknown): void {
  console.error(`[ERROR] Failed to send progress notification:`, error);
}
