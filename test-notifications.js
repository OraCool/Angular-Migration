#!/usr/bin/env node
/**
 * Minimal test to verify session/update notifications work
 */

process.stderr.write('[TEST] Starting minimal notification test\n');

// Simple stdin/stdout handler
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  while (true) {
    const newlineIndex = buffer.indexOf('\n');
    if (newlineIndex === -1) break;
    
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    
    if (line) {
      handleMessage(JSON.parse(line));
    }
  }
});

function send(msg) {
  const json = JSON.stringify(msg);
  process.stderr.write(`[TEST] Sending: ${json.substring(0, 80)}...\n`);
  process.stdout.write(json + '\n');
}

async function handleMessage(msg) {
  process.stderr.write(`[TEST] Received: ${msg.method || 'response'}\n`);
  
  if (msg.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: 1,
        agentInfo: { name: 'test-agent', version: '1.0.0', title: 'Test' },
        agentCapabilities: { promptCapabilities: { image: false, audio: false, embeddedContext: true }, mcpCapabilities: { http: false, sse: false }, sessionCapabilities: {}, loadSession: false },
        authMethods: []
      }
    });
  }
  
  else if (msg.method === 'session/new') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: { sessionId: 'test-session-1' }
    });
  }
  
  else if (msg.method === 'session/prompt') {
    const sessionId = msg.params.sessionId;
    process.stderr.write(`[TEST] Handling prompt for session ${sessionId}\n`);
    
    // Send a notification FIRST
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId,
        update: {
          type: 'agent_message_chunk',
          chunk: { content: { type: 'text', text: 'Hello from test agent!' } }
        }
      }
    });
    
    process.stderr.write('[TEST] Notification sent, waiting 500ms before response...\n');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then send response
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: { stopReason: 'end_turn' }
    });
    
    process.stderr.write('[TEST] Response sent\n');
  }
}

process.stderr.write('[TEST] Test agent ready\n');
