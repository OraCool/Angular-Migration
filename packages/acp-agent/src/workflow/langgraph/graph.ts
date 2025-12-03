/**
 * LangGraph Workflow Definition
 *
 * Defines the state graph for Angular migration workflow
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { MigrationStateAnnotation, type MigrationState } from './state.js';
import type { WorkflowStep } from '@angular-migration/workflow-engine';

// Import nodes
import { entryNode } from './nodes/entry.js';
import { stepExecutorNode } from './nodes/step-executor.js';
import { confirmationNode, processConfirmationResponse } from './nodes/confirmation.js';
import { retryNode } from './nodes/retry.js';
import { rollbackNode } from './nodes/rollback.js';
import { checkpointNode } from './nodes/checkpoint.js';
import { autoFixNode } from './nodes/auto-fix.js';

// Import edges
import { needsConfirmation, confirmationResponse } from './edges/confirmation.js';
import { afterCheckpoint } from './edges/next-step.js';
import { shouldAutoFixStep, afterAutoFix } from './edges/auto-fix.js';

/**
 * Build the migration workflow graph
 */
export function buildMigrationGraph(workflow: WorkflowStep[]) {
  // Create the state graph
  const graph = new StateGraph(MigrationStateAnnotation);

  // Add nodes
  graph.addNode('entry', entryNode);
  graph.addNode('confirm', (state: MigrationState) => confirmationNode(state, workflow));
  graph.addNode('processConfirmation', processConfirmationResponse);
  graph.addNode('executeStep', (state: MigrationState) => stepExecutorNode(state, workflow));
  graph.addNode('autoFix', (state: MigrationState) => autoFixNode(state, workflow));
  graph.addNode('retry', (state: MigrationState) => retryNode(state, workflow));
  graph.addNode('rollback', (state: MigrationState) => rollbackNode(state, workflow));
  graph.addNode('checkpoint', checkpointNode);

  // Set entry point: START -> entry
  // Note: Type assertions needed due to LangGraph v1.0.2 type inference issues
  graph.addEdge(START, 'entry' as any);

  // Entry -> Confirmation or Execute or END
  graph.addConditionalEdges('entry' as any, (state: MigrationState) => {
    if (state.isComplete || state.lastError) {
      return END;
    }
    const result = needsConfirmation(state);
    if (result === 'confirm') return 'confirm';
    return 'executeStep';
  });

  // Confirmation -> Process Response
  graph.addEdge('confirm' as any, 'processConfirmation' as any);

  // Process Confirmation Response -> Execute, Skip, or Abort
  graph.addConditionalEdges('processConfirmation' as any, (state: MigrationState) => {
    const response = confirmationResponse(state);
    if (response === 'execute') return 'executeStep';
    if (response === 'skip') return 'checkpoint';
    if (response === 'abort') return END;
    return 'executeStep';
  });

  // Execute Step -> Success (checkpoint) or Failure (autoFix/retry/rollback)
  graph.addConditionalEdges('executeStep' as any, (state: MigrationState) => {
    if (state.lastError) {
      const decision = shouldAutoFixStep(state, workflow);
      if (decision === 'autoFix') return 'autoFix';
      if (decision === 'retry') return 'retry';
      if (decision === 'rollback') return 'rollback';
    }
    return 'checkpoint';
  });

  // Auto-Fix -> Execute Step (retry after fix) or Rollback (fix failed)
  graph.addConditionalEdges('autoFix' as any, (state: MigrationState) => {
    return afterAutoFix(state);
  });

  // Retry -> Execute Step (try again)
  graph.addEdge('retry' as any, 'executeStep' as any);

  // Rollback -> Checkpoint (record failure)
  graph.addEdge('rollback' as any, 'checkpoint' as any);

  // Checkpoint -> Next Step or Complete
  graph.addConditionalEdges('checkpoint' as any, (state: MigrationState) => {
    const next = afterCheckpoint(state, workflow);
    if (next === 'complete') return END;
    return 'confirm'; // Go to next step (will check if confirmation needed)
  });

  // Compile the graph
  return graph.compile();
}

/**
 * Execute the migration workflow
 */
export async function executeMigrationWorkflow(
  workflow: WorkflowStep[],
  initialState: Partial<MigrationState>
): Promise<MigrationState> {
  const app = buildMigrationGraph(workflow);

  // Execute the graph
  // Note: Type assertion needed due to LangGraph v1.0.2 type inference issues
  const result = await app.invoke(initialState as any);

  return result as MigrationState;
}

/**
 * Stream the migration workflow (for real-time updates)
 */
export async function* streamMigrationWorkflow(
  workflow: WorkflowStep[],
  initialState: Partial<MigrationState>
): AsyncGenerator<MigrationState, void, unknown> {
  const app = buildMigrationGraph(workflow);

  // Stream the graph execution
  // Note: Type assertion needed due to LangGraph v1.0.2 type inference issues
  for await (const state of await app.stream(initialState as any)) {
    yield state as unknown as MigrationState;
  }
}
