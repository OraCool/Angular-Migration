/**
 * Session Manager for MCP Server
 * Manages workflow sessions, state, and context
 */

import {
  WorkflowEngine,
  StateManager,
  ANGULAR_MIGRATION_WORKFLOW,
  type WorkflowContext,
  type WorkflowState,
} from '@angular-migration/workflow-engine';

export interface Session {
  id: string;
  projectPath: string;
  context: WorkflowContext;
  engine: WorkflowEngine;
  state?: WorkflowState;
  createdAt: Date;
  lastActivityAt: Date;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private stateManager: StateManager;
  private sessionCounter = 0;

  constructor() {
    this.stateManager = new StateManager();
  }

  /**
   * Create a new migration session
   */
  createSession(projectPath: string, options: {
    currentVersion?: string;
    targetVersion: string;
    skipTests?: boolean;
    skipLint?: boolean;
    autoConfirm?: boolean;
  }): Session {
    const sessionId = `mcp-session-${++this.sessionCounter}`;

    const context: WorkflowContext = {
      sessionId,
      projectPath,
      currentVersion: options.currentVersion || '14',
      targetVersion: options.targetVersion,
      skipTests: options.skipTests || false,
      skipLint: options.skipLint || false,
      autoConfirm: options.autoConfirm || false,
    };

    const engine = new WorkflowEngine(ANGULAR_MIGRATION_WORKFLOW, context);

    const session: Session = {
      id: sessionId,
      projectPath,
      context,
      engine,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * List all active sessions
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get the most recently active session
   */
  getMostRecentSession(): Session | undefined {
    const sessions = Array.from(this.sessions.values());
    if (sessions.length === 0) return undefined;
    
    // Sort by last activity time, most recent first
    sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
    return sessions[0];
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Load session state from checkpoint
   */
  async loadSessionState(sessionId: string): Promise<WorkflowState | null> {
    const checkpoint = await this.stateManager.loadCheckpoint(sessionId);
    if (!checkpoint) return null;

    // Deserialize checkpoint data to properly reconstruct Maps
    const { state } = StateManager.deserializeState(checkpoint);
    return state;
  }

  /**
   * Save session state to checkpoint
   */
  async saveSessionState(sessionId: string, state: WorkflowState, context: WorkflowContext): Promise<void> {
    await this.stateManager.saveCheckpoint(sessionId, state, context);
  }

  /**
   * Check if checkpoint exists for session
   */
  async hasCheckpoint(sessionId: string): Promise<boolean> {
    return await this.stateManager.hasCheckpoint(sessionId);
  }

  /**
   * Delete checkpoint for session
   */
  async deleteCheckpoint(sessionId: string): Promise<void> {
    await this.stateManager.deleteCheckpoint(sessionId);
  }

  /**
   * Get the state manager instance
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }
}
