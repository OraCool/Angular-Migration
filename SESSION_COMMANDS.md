# Session Management Commands

## Overview

The Angular Migration Agent now supports in-chat commands for managing conversation history and restoring previous sessions. Simply type these commands directly in your conversation with the agent.

## Available Commands

### 1. List Sessions

**Commands:** `list sessions`, `show sessions`, or `sessions`

**Description:** Displays all available sessions with their status, title, ID, description, and start time.

**Example:**
```
list sessions
```

**Output:**
```
📋 **Available Sessions**

🟢 **Migration: 14 → 20 (12/3/2025)**
   • ID: `session-1`
   • 15 messages • 8 tool calls
   • Started: 12/3/2025, 10:30:00 AM

✅ **Analysis: angular-app (12/2/2025)**
   • ID: `session-2`
   • 42 messages • 23 tool calls • 12/12 steps completed
   • Started: 12/2/2025, 3:15:00 PM

💡 **Tip:** Type `load session <session-id>` to restore a previous conversation.
```

---

### 2. Load Session

**Commands:** `load session <session-id>` or `restore session <session-id>`

**Description:** Restores a previous conversation by replaying the entire message and tool call history in chronological order.

**Example:**
```
load session session-1
```

**Output:**
```
🔄 Loading session: `session-1`...

[... replays entire conversation history ...]

✅ Session `session-1` restored successfully!
```

---

### 3. Search Sessions

**Commands:** `search sessions <query>` or `find sessions <query>`

**Description:** Searches through session titles, descriptions, tags, and IDs for matching text.

**Example:**
```
search sessions angular-15
```

**Output:**
```
🔍 Searching for: "angular-15"

Found 3 matching session(s):

• **Migration: 14 → 15 (12/1/2025)**
  ID: `session-3`
  8 messages • 4 tool calls

• **Analysis: ng15-project (11/30/2025)**
  ID: `session-5`
  23 messages • 12 tool calls

• **Guidance Session (11/29/2025)**
  ID: `session-7`
  5 messages • 1 tool calls
```

---

### 4. Show Current Session

**Commands:** `show session`, `current session`, or `session info`

**Description:** Displays metadata about the currently active session.

**Example:**
```
show session
```

**Output:**
```
📄 Current Session: `session-1`

• Status: active
• Migration Type: step-by-step
• Project: /Users/you/angular-app
• Started: 12/3/2025, 10:30:00 AM
• Last activity: 12/3/2025, 11:45:00 AM

• Messages: 15
• Tool calls: 8

• Tags: angular-14, angular-20, step:upgrade-v15
```

---

### 5. Statistics

**Commands:** `stats`, `statistics`, or `session stats`

**Description:** Shows aggregate statistics across all sessions.

**Example:**
```
stats
```

**Output:**
```
📊 Thread History Statistics

Total sessions: 12
  • Active: 3
  • Completed: 8
  • Failed: 1

Total messages: 456
Total tool calls: 234

Oldest session: 11/15/2025
Newest session: 12/3/2025
```

---

### 6. Help

**Commands:** `session help` or `help sessions`

**Description:** Displays the list of available commands with examples.

**Example:**
```
session help
```

---

## How It Works

1. **Automatic Logging:** Every message and tool call is automatically logged to disk in real-time
2. **Persistent Storage:** Sessions are stored in `~/.angular-migration/threads/`
3. **Session Restoration:** Loading a session replays the entire conversation history
4. **Searchable:** All sessions are indexed with metadata for fast searching

## Storage Location

Sessions are stored in:
```
~/.angular-migration/threads/
├── session-1/
│   ├── metadata.json      # Session metadata
│   ├── messages.jsonl     # Message log (append-only)
│   └── toolcalls.jsonl    # Tool execution log
├── session-2/
└── session-3/
```

## CLI Tool (Alternative Access)

For external management, you can also use the CLI tool:

```bash
# List all sessions
thread-manager list

# Search sessions
thread-manager search "angular-15"

# Show detailed session info
thread-manager show session-1

# Show statistics
thread-manager stats

# Archive old sessions (older than 30 days)
thread-manager archive 30

# Clean up abandoned sessions (no activity in 7 days)
thread-manager cleanup 7
```

## Architecture

- **JSONL Format:** Message logs use newline-delimited JSON for corruption resistance
- **Atomic Writes:** Metadata updates use temp-file + rename pattern
- **ACP Protocol:** Implements `loadSession` capability per Agent Client Protocol spec
- **Auto-tagging:** Sessions are automatically tagged with Angular versions, steps, and features

## Testing

To test the implementation:

1. Start a conversation with the agent in Zed IDE
2. Type `list sessions` to see available sessions
3. Type `load session <session-id>` to restore a previous conversation
4. Verify the entire conversation history is replayed

## Notes

- Commands are case-insensitive
- Session IDs are auto-generated (format: `session-1`, `session-2`, etc.)
- All commands return immediately without triggering normal agent processing
- Loading a session preserves the current session - history is added to the current conversation
