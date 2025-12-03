# Session Management Commands Reference

## Overview

Use natural language commands to manage your session history. Commands work seamlessly in conversation without any special prefix.

> **Note:** Slash commands (`/command`) are not supported because Zed IDE intercepts them before they reach our agent. We use natural commands instead, which work perfectly in conversation!

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `list sessions` or `sessions` | Show all available sessions |
| `load session <id>` | Restore a previous session |
| `search sessions <query>` | Search for sessions |
| `show session` or `session info` | Show current session info |
| `stats` or `statistics` | Show session statistics |
| `session help` or `help sessions` | Show command help |

---

## Commands

### 📋 List Sessions

**Commands:**
```
list sessions
show sessions
sessions
```

**Example:**
```
sessions
```

**Output:**
```
📋 Available Sessions

🟢 Guidance Session (12/3/2025)
   📌 ID: `session-3`
   📊 5 messages
   🕐 Started: 12/3/2025, 1:30:00 PM

✅ Migration: 14 → 20 (12/2/2025)
   📌 ID: `session-2`
   📊 42 messages • 23 tool calls
   🕐 Started: 12/2/2025, 3:15:00 PM
```

---

### 🔄 Load Session

**Commands:**
```
load session <session-id>
restore session <session-id>
```

**Examples:**
```
load session session-1
restore session session-2
```

**Output:**
```
🔄 Loading session: `session-1`...

[... entire conversation from session-1 replayed ...]

✅ Session `session-1` restored successfully!
```

---

### 🔍 Search Sessions

**Commands:**
```
search sessions <query>
find sessions <query>
```

**Examples:**
```
search sessions angular
find sessions migration
search sessions upgrade
```

**Output:**
```
🔍 Searching for: "angular"

Found 2 session(s):

🟢 Migration: 14 → 15 (12/1/2025)
   📌 ID: `session-3`
   📊 8 messages • 4 tool calls

✅ Analysis: angular-app (11/30/2025)
   📌 ID: `session-5`
   📊 23 messages • 12 tool calls
```

---

### 📄 Show Current Session

**Commands:**
```
show session
current session
session info
```

**Example:**
```
show session
```

**Output:**
```
📄 Current Session Info

📌 ID: `session-3`
🔄 Status: active
📋 Type: guidance
💬 Messages: 5
🔧 Tool calls: 2
🕐 Started: 12/3/2025, 1:30:00 PM
⏱️  Last activity: 12/3/2025, 2:15:00 PM
```

---

### 📊 Show Statistics

**Commands:**
```
stats
statistics
session stats
```

**Example:**
```
stats
```

**Output:**
```
📊 Thread History Statistics

📁 Total sessions: 12
   🟢 Active: 3
   ✅ Completed: 8
   ❌ Failed: 1

💬 Total messages: 456
🔧 Total tool calls: 234

📅 Oldest session: 11/15/2025
📅 Newest session: 12/3/2025
```

---

### 📖 Help

**Commands:**
```
session help
help sessions
```

**Example:**
```
session help
```

**Output:**
```
📖 Session Management Commands

[... help text ...]
```

---

## Why Natural Commands?

**Advantages:**
- ✅ More conversational
- ✅ Easier to remember
- ✅ No special syntax needed
- ✅ Work seamlessly in Zed IDE
- ✅ No conflicts with IDE commands

**Note:** Slash commands (`/command`) don't work because Zed IDE has its own slash command system that intercepts them before they reach our agent. Natural commands are the recommended approach!

---

## Common Patterns

### Quick Session Management

```bash
# List all sessions
sessions

# Load a specific session
load session session-3

# Search for something
search sessions migration

# Check current session
show session

# View statistics
stats
```

### Natural Conversation Flow

```bash
# List sessions
list sessions

# Load session with full command
load session session-3

# Search with descriptive query
search sessions angular upgrade

# Get current session info
session info

# View statistics with alternative
statistics
```

### Example Conversation

```bash
User: sessions
Agent: [shows list of sessions]

User: load session session-2
Agent: [loads and replays session-2]

User: stats
Agent: [shows statistics]

User: search sessions angular
Agent: [shows matching sessions]
```

---

## Implementation Details

### Command Matching

Commands are matched case-insensitively and trimmed:

```typescript
const query = userQuery.toLowerCase().trim();

if (
  query === 'list sessions' ||
  query === 'show sessions' ||
  query === 'sessions'
) {
  // Handle command
}
```

### Parameter Extraction

For commands with parameters (like `load session session-1`):

```typescript
const targetSessionId = query
  .replace(/^(load|restore) session /, '')
  .trim();
```

This handles:
- `load session session-1` → `session-1`
- `restore session session-2` → `session-2`

---

## Testing

Try all the natural commands in Zed IDE:

```bash
# Basic commands
sessions
show session
stats
session help

# Commands with parameters
load session session-1
search sessions angular
```

All commands work seamlessly in conversation!

---

## Future Commands

Potential future natural commands:

- `archive sessions <days>` - Archive old sessions
- `cleanup sessions <days>` - Clean up abandoned sessions
- `export session <session-id>` - Export session to file
- `clear session` - Clear current session
- `resume session <session-id>` - Resume abandoned session

---

## Summary

**All Commands Available:**

| Category | Commands | Alternative |
|----------|----------|-------------|
| **List** | `list sessions` | `sessions`, `show sessions` |
| **Load** | `load session <id>` | `restore session <id>` |
| **Search** | `search sessions <query>` | `find sessions <query>` |
| **Info** | `show session` | `session info`, `current session` |
| **Stats** | `stats` | `statistics`, `session stats` |
| **Help** | `session help` | `help sessions` |

**All commands work naturally in conversation - just type them!** 🎉
