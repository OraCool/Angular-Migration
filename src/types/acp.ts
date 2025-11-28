/**
 * ACP (Agent Client Protocol) Type Definitions for Zed IDE
 * Based on https://agentclientprotocol.com/protocol/schema
 */

// ===== Protocol Version =====
export const PROTOCOL_VERSION = 1;

// ===== Core Types =====
export type SessionId = string;
export type ToolCallId = string;
export type PermissionOptionId = string;
export type SessionModeId = string;

// ===== Annotations =====
export interface Annotations {
  priority?: number;
  audience?: string[];
  lastModified?: string;
  _meta?: Record<string, unknown>;
}

// ===== Content Blocks =====
export interface TextContent {
  type: 'text';
  text: string;
  annotations?: Annotations;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
  uri?: string;
  annotations?: Annotations;
}

export interface ResourceLink {
  type: 'resource_link';
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  title?: string;
  size?: number;
  annotations?: Annotations;
}

export interface TextResourceContents {
  uri: string;
  text: string;
  mimeType?: string;
}

export interface BlobResourceContents {
  uri: string;
  blob: string;
  mimeType?: string;
}

export interface EmbeddedResource {
  type: 'resource';
  resource: TextResourceContents | BlobResourceContents;
  annotations?: Annotations;
}

export type ContentBlock =
  | TextContent
  | ImageContent
  | ResourceLink
  | EmbeddedResource;

// ===== Tool Calls =====
export type ToolKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'think'
  | 'fetch'
  | 'switch_mode'
  | 'other';

export type ToolCallStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ToolCallLocation {
  path: string;
  line?: number;
  _meta?: Record<string, unknown>;
}

export interface Diff {
  path: string;
  oldText?: string;
  newText: string;
  _meta?: Record<string, unknown>;
}

export interface Terminal {
  terminalId: string;
  _meta?: Record<string, unknown>;
}

export type ToolCallContent =
  | { type: 'content'; content: ContentBlock }
  | { type: 'diff'; diff: Diff }
  | { type: 'terminal'; terminal: Terminal };

export interface ToolCall {
  toolCallId: ToolCallId;
  title: string;
  kind?: ToolKind;
  status: ToolCallStatus;
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
  content: ToolCallContent[];
  locations: ToolCallLocation[];
  _meta?: Record<string, unknown>;
}

export interface ToolCallUpdate {
  toolCallId: ToolCallId;
  title?: string;
  kind?: ToolKind;
  status?: ToolCallStatus;
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  _meta?: Record<string, unknown>;
}

// ===== Agent Plan =====
export type PlanEntryPriority = 'high' | 'medium' | 'low';
export type PlanEntryStatus = 'pending' | 'in_progress' | 'completed';

export interface PlanEntry {
  content: string;
  priority: PlanEntryPriority;
  status: PlanEntryStatus;
  _meta?: Record<string, unknown>;
}

export interface Plan {
  entries: PlanEntry[];
  _meta?: Record<string, unknown>;
}

// ===== Session Updates =====
export interface MessageChunkUpdate {
  sessionUpdate: 'user_message_chunk' | 'agent_message_chunk' | 'agent_thought_chunk';
  content: ContentBlock;
  _meta?: Record<string, unknown>;
}

export interface ToolCallStartUpdate {
  sessionUpdate: 'tool_call';
  toolCall: ToolCall;
  _meta?: Record<string, unknown>;
}

export interface ToolCallProgressUpdate {
  sessionUpdate: 'tool_call_update';
  update: ToolCallUpdate;
  _meta?: Record<string, unknown>;
}

export interface PlanUpdate {
  sessionUpdate: 'plan';
  plan: Plan;
  _meta?: Record<string, unknown>;
}

export type SessionUpdate =
  | MessageChunkUpdate
  | ToolCallStartUpdate
  | ToolCallProgressUpdate
  | PlanUpdate;

// ===== Stop Reasons =====
export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'max_turn_requests'
  | 'refusal'
  | 'cancelled';

// ===== Capabilities =====
export interface FileSystemCapability {
  readTextFile: boolean;
  writeTextFile: boolean;
  _meta?: Record<string, unknown>;
}

export interface ClientCapabilities {
  fs: FileSystemCapability;
  terminal: boolean;
  _meta?: Record<string, unknown>;
}

export interface PromptCapabilities {
  image: boolean;
  audio: boolean;
  embeddedContext: boolean;
  _meta?: Record<string, unknown>;
}

export interface McpCapabilities {
  http: boolean;
  sse: boolean;
  _meta?: Record<string, unknown>;
}

export interface SessionCapabilities {
  _meta?: Record<string, unknown>;
}

export interface AgentCapabilities {
  promptCapabilities: PromptCapabilities;
  mcpCapabilities: McpCapabilities;
  sessionCapabilities: SessionCapabilities;
  loadSession: boolean;
  _meta?: Record<string, unknown>;
}

// ===== Implementation Info =====
export interface Implementation {
  name: string;
  version: string;
  title?: string;
  _meta?: Record<string, unknown>;
}

// ===== MCP Server Configuration =====
export interface EnvVariable {
  name: string;
  value: string;
  _meta?: Record<string, unknown>;
}

export interface HttpHeader {
  name: string;
  value: string;
  _meta?: Record<string, unknown>;
}

export type McpServer =
  | {
      type: 'stdio';
      name: string;
      command: string;
      args: string[];
      env: EnvVariable[];
      _meta?: Record<string, unknown>;
    }
  | {
      type: 'http';
      name: string;
      url: string;
      headers: HttpHeader[];
      _meta?: Record<string, unknown>;
    }
  | {
      type: 'sse';
      name: string;
      url: string;
      headers: HttpHeader[];
      _meta?: Record<string, unknown>;
    };

// ===== Permission Handling =====
export type PermissionOptionKind =
  | 'allow_once'
  | 'allow_always'
  | 'reject_once'
  | 'reject_always';

export interface PermissionOption {
  optionId: PermissionOptionId;
  name: string;
  kind: PermissionOptionKind;
  _meta?: Record<string, unknown>;
}

export type RequestPermissionOutcome =
  | { type: 'cancelled'; _meta?: Record<string, unknown> }
  | { type: 'selected'; optionId: PermissionOptionId; _meta?: Record<string, unknown> };

// ===== JSON-RPC Messages =====
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ===== Agent Methods =====

// initialize
export interface InitializeRequest {
  protocolVersion: number;
  clientInfo?: Implementation;
  clientCapabilities?: ClientCapabilities;
  _meta?: Record<string, unknown>;
}

export interface InitializeResponse {
  protocolVersion: number;
  agentInfo?: Implementation;
  agentCapabilities: AgentCapabilities;
  authMethods: unknown[];
  _meta?: Record<string, unknown>;
}

// session/new
export interface NewSessionRequest {
  cwd: string;
  mcpServers: McpServer[];
  _meta?: Record<string, unknown>;
}

export interface NewSessionResponse {
  sessionId: SessionId;
  modes?: unknown;
  _meta?: Record<string, unknown>;
}

// session/prompt
export interface PromptRequest {
  sessionId: SessionId;
  prompt: ContentBlock[];
  _meta?: Record<string, unknown>;
}

export interface PromptResponse {
  stopReason: StopReason;
  _meta?: Record<string, unknown>;
}

// session/cancel
export interface CancelNotification {
  sessionId: SessionId;
  _meta?: Record<string, unknown>;
}

// session/update (notification)
export interface SessionNotification {
  sessionId: SessionId;
  update: SessionUpdate;
  _meta?: Record<string, unknown>;
}

// Client methods (requests from agent to client)

// session/request_permission
export interface RequestPermissionRequest {
  sessionId: SessionId;
  toolCall: ToolCallUpdate;
  options: PermissionOption[];
  _meta?: Record<string, unknown>;
}

export interface RequestPermissionResponse {
  outcome: RequestPermissionOutcome;
  _meta?: Record<string, unknown>;
}

// fs/read_text_file
export interface ReadTextFileRequest {
  sessionId: SessionId;
  path: string;
  line?: number;
  limit?: number;
  _meta?: Record<string, unknown>;
}

export interface ReadTextFileResponse {
  content: string;
  _meta?: Record<string, unknown>;
}

// fs/write_text_file
export interface WriteTextFileRequest {
  sessionId: SessionId;
  path: string;
  content: string;
  _meta?: Record<string, unknown>;
}

export interface WriteTextFileResponse {
  _meta?: Record<string, unknown>;
}
