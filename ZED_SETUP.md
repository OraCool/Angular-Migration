# Using Angular Migration Agent in Zed IDE

Complete setup and usage guide for the Angular Migration ACP agent in Zed IDE.

---

## Prerequisites

1. **Zed IDE** installed (latest version)
   - Download from: https://zed.dev/

2. **Node.js 18+** installed
   ```bash
   node --version  # Should be v18 or higher
   ```

3. **Agent built**
   ```bash
   cd /path/to/Angular-Migration
   npm install
   npm run build
   ```

---

## Step 1: Configure Zed IDE

### 1.1 Open Zed Settings

**macOS:**
```
Cmd + ,
```

**Linux/Windows:**
```
Ctrl + ,
```

Or use the menu: **Zed → Settings** (macOS) or **File → Settings** (Linux/Windows)

### 1.2 Add Agent Configuration

Click **"Open settings.json"** in the top-right corner of the settings panel.

Add this configuration to your `settings.json`:

```json
{
  "agent_servers": {
    "Angular Migration": {
      "type": "custom",
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Angular-Migration/dist/index.js"],
      "env": {}
    }
  }
}
```

**⚠️ Important:** Replace `/ABSOLUTE/PATH/TO/Angular-Migration` with your actual path!

**Note:** The agent name "Angular Migration" will appear in the Zed UI when creating new threads.

### 1.3 Find Your Absolute Path

**macOS/Linux:**
```bash
cd /path/to/Angular-Migration
pwd
```

**Example output:**
```
/Users/siarheiskuratovich/dev/AI/ACP/Angular-Migration
```

Use this in your settings:
```json
{
  "agent_servers": {
    "Angular Migration": {
      "type": "custom",
      "command": "node",
      "args": ["/Users/siarheiskuratovich/dev/AI/ACP/Angular-Migration/dist/index.js"],
      "env": {}
    }
  }
}
```

### 1.4 Optional: Add Keyboard Shortcut

You can create a custom keybinding to quickly start a new Angular Migration thread. Edit your `keymap.json` (open with `zed: open keymap` command):

```json
{
  "bindings": {
    "cmd-alt-a": [
      "agent::NewExternalAgentThread",
      {
        "agent": {
          "custom": {
            "name": "Angular Migration",
            "command": {
              "command": "angular-migration",
              "args": []
            }
          }
        }
      }
    ]
  }
}
```

Now pressing **Cmd+Alt+A** (macOS) will open a new Angular Migration thread!

### 1.5 Save and Restart Zed

1. Save `settings.json` (**Cmd+S** or **Ctrl+S**)
2. Completely quit and restart Zed IDE

---

## Step 2: Verify Installation

### 2.1 Open Zed Agent Panel

**macOS:**
```
Cmd + ?
```

**Linux/Windows:**
```
Ctrl + ?
```

Or click the **Assistant/Agent** icon in the right sidebar.

### 2.2 Start a New Thread

Click the **`+`** button in the top-right corner of the agent panel. You should see **"Angular Migration"** in the list of available agents.

Select it to create a new thread.

### 2.3 Test the Agent

In the agent thread, type:

```
hello
```

Or:

```
@Angular Migration hello
```

**Expected Response:**
```
## Angular Migration Guidance

I'm here to help with Angular 14→20 migration...
```

If you see this response, the agent is working! ✅

### 2.3 Troubleshooting Installation

**Agent not appearing in the list:**
- Check that the path in `settings.json` is absolute (not relative)
- Verify the agent built successfully: `ls dist/index.js`
- Check file permissions: `chmod +x dist/index.js`
- Completely quit and restart Zed (Cmd+Q on macOS)
- Check Zed logs: **View → Toggle Log Panel** or use command `dev: open acp logs`

**Error: "Cannot find module":**
- Run `npm run build` again
- Check that `dist/` directory exists with `index.js` inside
- Verify Node.js version: `node --version` (need 18+)

**Agent crashes on start:**
- Check ACP logs with `dev: open acp logs` command
- Look for error messages in the debug view
- Verify the shebang line in dist/index.js: `#!/usr/bin/env node`

---

## Step 3: Using the Agent

### 3.1 Open Your Angular Project

```bash
cd /path/to/your/angular-project
zed .
```

The agent uses the current working directory (cwd) to know where your project is located.

### 3.2 Create an Angular Migration Thread

1. Open the agent panel (**Cmd+?**)
2. Click the **`+`** button
3. Select **"Angular Migration"**
4. A new thread opens ready for your commands

### 3.3 Available Commands

#### Analyze Your Project
```
analyze my project
```

Or with @-mention:
```
@Angular Migration analyze my project
```

Returns:
- Number of components to migrate
- Template syntax to update
- Signal conversion opportunities
- Detailed migration plan

#### Start Step-by-Step Migration
```
run step-by-step migration
```

Initiates the full 11-step workflow with confirmations at each stage.

#### Get Migration Guidance
```
help with migration
```

Shows available options and migration strategies.

#### Specific Migrations

**Standalone Components:**
```
migrate to standalone components
```

**Control Flow Syntax:**
```
migrate control flow syntax
```

**Signals:**
```
migrate to signals
```

**Full Migration:**
```
full migration from 14 to 20
```

**Note:** You can optionally use `@Angular Migration` prefix, but it's not required within the agent's thread.

---

## Step 4: Step-by-Step Workflow Example

### 4.1 Start the Workflow

Open your Angular 14 project in Zed, create a new Angular Migration thread, then type:

```
run step-by-step migration
```

### 4.2 Read the Introduction

The agent will present:
```markdown
# 🚀 Step-by-Step Angular Migration Workflow

I'll guide you through upgrading from Angular 14 to 20.

This workflow consists of 11 steps:
1. Initial Backup
2. Project Analysis
3. Upgrade to Angular 15
...

Ready to begin!
```

### 4.3 Respond to Confirmations

The agent will pause before each major step:

```markdown
## Confirmation Required: Upgrade to Angular 15

This step will:
- Update @angular/core to version 15
- Update @angular/cli to version 15
- Run dependency installation

**Proceed with this step?** (yes/no)
```

**Your response:**
```
yes
```

Or to cancel:
```
no
```

### 4.4 Watch Progress

The agent shows real-time updates:

```markdown
✅ Backup created: /path/to/backup-2024-01-15T10-30-00

⚙️ Running: ng update @angular/core@15 @angular/cli@15

✓ Angular packages updated
✓ Dependencies installed
✓ Build successful

Progress: 3/11 steps (27%)
```

### 4.5 Handle Failures

If a step fails, the agent offers rollback:

```markdown
❌ Build failed after migration step

Error: Module not found: '@angular/common/http'

Would you like to:
1. Rollback to the previous backup? (type: rollback)
2. Continue anyway? (type: continue)
3. Cancel migration? (type: cancel)
```

**To rollback:**

Create a new message in the thread:
```
rollback migration
```

### 4.6 Complete the Migration

After all 11 steps complete:

```markdown
# 🎉 Migration Complete!

Successfully completed 11/11 steps

A detailed migration report has been generated in your project directory:
- MIGRATION_REPORT.md

## Summary
- Angular version: 14 → 20 ✅
- Components migrated: 47
- Templates updated: 32
- Build status: Passing ✅

## Next Steps
1. Review MIGRATION_REPORT.md
2. Run tests: npm test
3. Test your application manually
4. Commit changes: git commit
```

---

## Step 5: Configuration Options

### Skip Tests During Migration

```
run migration workflow skip tests
```

**Note:** Not recommended for production migrations!

### Skip Linting

```
run migration workflow skip lint
```

### Multiple Options

```
run migration workflow skip tests skip lint
```

---

## Step 6: Understanding Agent Responses

### Message Types

**1. Thoughts (gray text)**
```
💭 Analyzing your Angular migration request...
```
Shows what the agent is thinking/processing.

**2. Messages (white text)**
```
## Migration Analysis Complete
...
```
Main responses and information.

**3. Tool Calls (highlighted boxes)**
```
🔧 Scanning Angular project
Status: Completed ✅
Output: { components: 47, modules: 15 }
```
Shows actions being performed.

**4. Plans (checkboxes)**
```
☐ Backup current code
☐ Run migration schematic
☑ Validate build
```
Shows workflow progress.

---

## Step 7: Common Workflows

### Workflow 1: Safe First-Time Migration

```
1. Open Angular Migration thread (Cmd+? → + → Angular Migration)

2. Type: analyze my project
   → Review the analysis report

3. Create a git branch in terminal:
   git checkout -b feature/angular-20-migration

4. In the thread: run step-by-step migration
   → Confirm each step carefully

5. Test thoroughly in terminal:
   npm run build
   npm test
   ng serve

6. Commit if successful:
   git add .
   git commit -m "feat: migrate to Angular 20"
```

### Workflow 2: Quick Analysis Only

```
Open thread → Type: analyze my project
```

Then manually perform migration using the suggested commands.

### Workflow 3: Specific Migration

```
Open thread → Type: migrate to standalone components
```

Performs only the standalone conversion without full migration.

---

## Step 8: Best Practices

### ✅ Do's

1. **Always work in a git branch**
   ```bash
   git checkout -b migration/angular-20
   ```

2. **Commit before starting**
   ```bash
   git commit -am "chore: pre-migration checkpoint"
   ```

3. **Run tests after each major step**
   ```bash
   npm test
   ```

4. **Review generated code**
   ```bash
   git diff
   ```

5. **Keep backups**
   - Agent creates automatic backups
   - Keep them until migration is verified

### ❌ Don'ts

1. **Don't skip confirmations without reading**
   - Each confirmation explains what will happen
   
2. **Don't ignore build failures**
   - Fix or rollback immediately

3. **Don't skip tests**
   - Testing catches issues early

4. **Don't delete backups immediately**
   - Keep until production deployment succeeds

---

## Step 9: Troubleshooting

### Agent Not Responding

**Check 1: Using the correct thread**
- Make sure you've created an "Angular Migration" thread
- The `+` button should show "Angular Migration" as an option
- Once in the thread, you don't need `@Angular Migration` prefix

**Check 2: Project opened in Zed**
```bash
cd /path/to/angular-project
zed .
```

**Check 3: Zed ACP logs**
- Command Palette: `dev: open acp logs`
- Look for connection and message errors
- Check if agent process started

### Migration Fails

**Backup Location:**
```
Your project is typically at:
  /path/to/your-project/

Backups are created at:
  /path/to/your-project/../angular-backup-YYYY-MM-DDTHH-MM-SS/
```

**Manual Rollback:**
```bash
cd /path/to/your-project/..
ls -la | grep angular-backup

# Restore from backup
cp -R angular-backup-2024-01-15T10-30-00/* your-project/
cd your-project
npm install
```

### Build Errors After Migration

**Clean rebuild:**
```bash
rm -rf node_modules .angular dist
npm install
npm run build
```

**Check for missing imports:**
- Standalone components need explicit imports
- Material modules now imported differently

**Verify package.json:**
```bash
npm list @angular/core
npm list @angular/material
```

---

## Step 10: Advanced Usage

### Custom Project Analysis

```
what needs to be migrated in my project?
check my Angular version
analyze components for signal conversion
```

### Error Help

```
I'm getting error NG0100 after migration
build failed with template errors
tests are failing after standalone migration
```

The agent will provide guidance based on common migration issues.

### Sequential Migrations

```
1. Type: migrate to standalone components
   (wait for completion)

2. Type: migrate control flow syntax
   (wait for completion)

3. Type: migrate to signals
```

---

## Example Session Transcript

```
[You open Zed, press Cmd+?, click +, select "Angular Migration"]

You: run step-by-step migration

Agent: 💭 Analyzing your Angular migration request...
Agent: 💭 Preparing step-by-step migration workflow...

Agent: # 🚀 Step-by-Step Angular Migration Workflow
       
       I'll guide you through upgrading from Angular 14 to 20.
       
       This workflow consists of 11 steps:
       1. Initial Backup
       2. Project Analysis
       3. Upgrade to Angular 15
       ...
       
       Ready to begin!

Agent: ## Step 1: Initial Backup
       
       Creating backup before any changes...
       
Agent: ✅ Backup created: /Users/you/dev/../angular-backup-2024-01-15T10-30-00
       
       Progress: 1/11 steps (9%)

Agent: ## Step 2: Project Analysis
       
       Analyzing your Angular project...

Agent: ✅ Analysis complete!
       
       Found:
       - 47 components
       - 15 NgModules
       - 32 templates with old syntax
       
       Progress: 2/11 steps (18%)

Agent: ## Confirmation Required: Upgrade to Angular 15
       
       This step will:
       - Update @angular/core to version 15
       - Update @angular/cli to version 15
       - Run dependency installation
       
       **Proceed with this step?** (yes/no)

You: yes

Agent: ⚙️ Running: ng update @angular/core@15 @angular/cli@15
       
       ✓ Packages updated
       ✓ Dependencies installed
       ✓ Build successful
       
       Progress: 3/11 steps (27%)

[... continues through all 11 steps ...]

Agent: # 🎉 Migration Complete!
       
       Successfully completed 11/11 steps
       
       Check MIGRATION_REPORT.md for details.

You: thanks!

Agent: You're welcome! Run `npm test` to verify everything works.
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `analyze my project` | Scan codebase |
| `run step-by-step migration` | Full workflow |
| `migrate to standalone` | Standalone only |
| `migrate control flow` | Template syntax |
| `rollback migration` | Restore backup |
| `help` | Show guidance |

**Note:** All commands work inside an Angular Migration thread without needing `@Angular Migration` prefix.

---

## Support

- **Documentation**: [README.md](README.md)
- **Workflow Details**: [WORKFLOW.md](WORKFLOW.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Angular Guide**: https://angular.dev/update-guide

---

**Ready to migrate? Open your Angular project in Zed, create an Angular Migration thread, and type:**

```
run step-by-step migration
```

🚀 Good luck with your migration!
