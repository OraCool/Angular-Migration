#!/usr/bin/env node

/**
 * Thread Manager CLI
 * Command-line tool for browsing and managing agent thread history
 */

import { ThreadHistoryManager } from '../threads/thread-history-manager.js';
import { ThreadAPI } from '../threads/thread-api.js';
import { MetadataExtractor } from '../threads/metadata-extractor.js';
import type { ThreadStatus } from '../threads/types.js';

// CLI commands
const commands = {
  list: 'List all sessions',
  search: 'Search sessions by query',
  show: 'Show detailed session info',
  stats: 'Display statistics',
  archive: 'Archive old sessions',
  cleanup: 'Clean up abandoned sessions',
  help: 'Show this help message',
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const threadHistory = new ThreadHistoryManager();
  const threadAPI = new ThreadAPI(threadHistory);

  try {
    switch (command) {
      case 'list':
        await listSessions(threadAPI, args.slice(1));
        break;

      case 'search':
        await searchSessions(threadAPI, args[1]);
        break;

      case 'show':
        await showSession(threadAPI, threadHistory, args[1]);
        break;

      case 'stats':
        await showStatistics(threadAPI);
        break;

      case 'archive':
        await archiveSessions(threadAPI, parseInt(args[1] || '30'));
        break;

      case 'cleanup':
        await cleanupSessions(threadAPI, parseInt(args[1] || '7'));
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function listSessions(api: ThreadAPI, args: string[]) {
  console.log('📋 Thread History\n');

  const status: ThreadStatus[] | undefined = args.includes('--active')
    ? ['active']
    : args.includes('--completed')
    ? ['completed']
    : args.includes('--failed')
    ? ['failed']
    : undefined;

  const limit = parseInt(args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '10');

  const sessions = await api.listSessions({
    status,
    limit,
  });

  if (sessions.length === 0) {
    console.log('No sessions found.');
    return;
  }

  for (const session of sessions) {
    const statusEmoji =
      session.status === 'active'
        ? '🟢'
        : session.status === 'completed'
        ? '✅'
        : session.status === 'failed'
        ? '❌'
        : '⚪';

    console.log(`${statusEmoji} ${session.title}`);
    console.log(`   ID: ${session.sessionId}`);
    console.log(`   ${session.description}`);
    console.log(`   Started: ${session.startedAt.toLocaleString()}`);
    console.log(`   Last activity: ${session.lastActivityAt.toLocaleString()}`);
    if (session.tags.length > 0) {
      console.log(`   Tags: ${session.tags.join(', ')}`);
    }
    console.log();
  }

  console.log(`Showing ${sessions.length} session(s)\n`);
}

async function searchSessions(api: ThreadAPI, query: string) {
  if (!query) {
    console.error('Usage: thread-manager search <query>');
    return;
  }

  console.log(`🔍 Searching for: "${query}"\n`);

  const results = await api.searchSessions(query);

  if (results.length === 0) {
    console.log('No matching sessions found.');
    return;
  }

  for (const session of results) {
    console.log(`• ${session.title}`);
    console.log(`  ID: ${session.sessionId}`);
    console.log(`  ${session.description}`);
    console.log();
  }

  console.log(`Found ${results.length} matching session(s)\n`);
}

async function showSession(api: ThreadAPI, history: ThreadHistoryManager, sessionId: string) {
  if (!sessionId) {
    console.error('Usage: thread-manager show <session-id>');
    return;
  }

  const metadata = await history.getMetadata(sessionId);
  if (!metadata) {
    console.error(`Session not found: ${sessionId}`);
    return;
  }

  const messages = await history.loadMessages(sessionId);
  const toolCalls = await history.loadToolCalls(sessionId);

  console.log(`\n📄 Session: ${sessionId}\n`);
  console.log(`Status: ${metadata.status}`);
  console.log(`Type: ${metadata.migrationType}`);
  console.log(`Project: ${metadata.projectPath}`);
  console.log(`Started: ${metadata.startedAt}`);
  console.log(`Last activity: ${metadata.lastActivityAt}`);
  if (metadata.completedAt) {
    console.log(`Completed: ${metadata.completedAt}`);
  }
  console.log();

  console.log(`Messages: ${metadata.totalMessages}`);
  console.log(`Tool calls: ${metadata.totalToolCalls}`);
  console.log();

  if (metadata.tags.length > 0) {
    console.log(`Tags: ${metadata.tags.join(', ')}`);
    console.log();
  }

  if (messages.length > 0) {
    console.log('📝 Recent Messages:');
    const recentMessages = messages.slice(-5);
    for (const msg of recentMessages) {
      const typeEmoji =
        msg.type === 'user' ? '👤' : msg.type === 'agent_message' ? '🤖' : '💭';
      const preview =
        msg.content.type === 'text'
          ? msg.content.text.substring(0, 100)
          : `[${msg.content.type}]`;
      console.log(`  ${typeEmoji} ${msg.type}: ${preview}`);
    }
    console.log();
  }

  if (toolCalls.length > 0) {
    console.log('🔧 Recent Tool Calls:');
    const recentCalls = toolCalls.slice(-5);
    for (const tc of recentCalls) {
      const statusEmoji =
        tc.status === 'completed' ? '✅' : tc.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${statusEmoji} ${tc.title} (${tc.kind})`);
    }
    console.log();
  }

  // Calculate health score
  const failedCount = toolCalls.filter((tc) => tc.status === 'failed').length;
  const hasErrors = metadata.tags.includes('has-errors');
  const healthScore = MetadataExtractor.calculateHealthScore(
    metadata.totalMessages,
    metadata.totalToolCalls,
    failedCount,
    hasErrors
  );

  console.log(`Health Score: ${healthScore}/100`);
  console.log();
}

async function showStatistics(api: ThreadAPI) {
  console.log('📊 Thread History Statistics\n');

  const stats = await api.getStatistics();

  console.log(`Total sessions: ${stats.totalSessions}`);
  console.log(`  Active: ${stats.activeSessions}`);
  console.log(`  Completed: ${stats.completedSessions}`);
  console.log(`  Failed: ${stats.failedSessions}`);
  console.log();

  console.log(`Total messages: ${stats.totalMessages}`);
  console.log(`Total tool calls: ${stats.totalToolCalls}`);
  console.log();

  if (stats.oldestSession) {
    console.log(`Oldest session: ${stats.oldestSession.toLocaleDateString()}`);
  }
  if (stats.newestSession) {
    console.log(`Newest session: ${stats.newestSession.toLocaleDateString()}`);
  }
  console.log();
}

async function archiveSessions(api: ThreadAPI, days: number) {
  console.log(`🗄️  Archiving sessions older than ${days} days...\n`);

  const archived = await api.archiveOldSessions(days);

  console.log(`Archived ${archived} session(s)`);
}

async function cleanupSessions(api: ThreadAPI, days: number) {
  console.log(`🧹 Cleaning up sessions inactive for ${days} days...\n`);

  const cleaned = await api.deleteAbandonedSessions(days);

  console.log(`Marked ${cleaned} abandoned session(s)`);
}

function showHelp() {
  console.log('Thread Manager CLI - Manage agent conversation history\n');
  console.log('Usage: thread-manager <command> [options]\n');
  console.log('Commands:');
  for (const [cmd, desc] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  console.log('\nExamples:');
  console.log('  thread-manager list');
  console.log('  thread-manager list --active --limit=20');
  console.log('  thread-manager search "migration"');
  console.log('  thread-manager show session-1');
  console.log('  thread-manager stats');
  console.log('  thread-manager archive 30');
  console.log('  thread-manager cleanup 7');
  console.log();
}

main();
