# Quick Start Guide - Angular Migration Workflow

Get started with the step-by-step Angular migration in **5 minutes**.

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version

# Check you have an Angular project
cd /path/to/your/angular-project
cat package.json | grep "@angular/core"
```

## Setup (One-time)

### 1. Build the Agent

```bash
cd /path/to/Angular-Migration
npm install
npm run build
```

### 2. Configure Zed

1. Open Zed Settings: `Cmd+,` (macOS) or `Ctrl+,` (Linux)
2. Add this configuration:

```json
{
  "agent_servers": {
    "Angular Migration": {
      "type": "custom",
      "command": "node",
      "args": ["/FULL/PATH/TO/Angular-Migration/dist/index.js"],
      "env": {}
    }
  }
}
```

⚠️ **Important**: Replace `/FULL/PATH/TO/Angular-Migration` with your actual path!

**Find your path:**
```bash
cd /path/to/Angular-Migration
pwd
# Copy this output and use it in settings.json
```

3. Save and restart Zed

### 3. Verify Installation

Open Zed Assistant and type:

```
@Angular Migration hello
```

You should see a response from the agent.

## Running Your First Migration

### Option 1: Full Guided Workflow (Recommended)

1. **Open your Angular project in Zed**
   ```bash
   cd /path/to/your/angular14-project
   zed .
   ```

2. **In Zed Assistant, start the workflow:**
   ```
   @Angular Migration run step-by-step migration
   ```

3. **Read the overview** - The agent explains the 11-step process

4. **Respond to confirmations** - Type `yes` or `no` when prompted

5. **Wait for completion** - Each step runs builds and tests

6. **Review the report** - Check `MIGRATION_REPORT.md` in your project

### Option 2: Analysis First

If you want to see what needs migrating before starting:

```
@Angular Migration analyze my project
```

The agent will scan your codebase and generate a detailed report showing:
- Number of components to migrate
- Template syntax to update
- @Input/@Output decorators
- Angular Material usage

Then start the migration:
```
@Angular Migration run step-by-step migration
```

## During Migration

### What to Expect

1. **Backup created** - Automatically before any changes
2. **Confirmation prompts** - For each major version upgrade
3. **Progress updates** - Live status of each step
4. **Validation checks** - Build and test after each step
5. **Final report** - Summary when complete

### Responding to Prompts

The agent will ask for confirmation before:
- Upgrading Angular versions
- Running migration schematics
- Updating control flow syntax

**To proceed:**
```
yes
```

**To cancel:**
```
no
```

### If Something Fails

The agent will show the error and offer options:

```
@Angular Migration rollback migration
```

This restores from the most recent backup.

## After Migration

### 1. Review Changes

```bash
# See what changed
git status
git diff

# Check the migration report
cat MIGRATION_REPORT.md
```

### 2. Test Everything

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Start dev server
ng serve
```

### 3. Manual Testing

- Navigate through your app
- Test all critical features
- Check browser console for errors
- Verify Material components render correctly

### 4. Commit

```bash
git add .
git commit -m "feat: migrate from Angular 14 to 20"
git push
```

## Common Commands

### Get Help

```
@Angular Migration help with migration
```

### Analyze Project

```
@Angular Migration analyze my project
```

### Start Workflow

```
@Angular Migration run step-by-step migration
```

### Rollback

```
@Angular Migration rollback migration
```

### Skip Tests (not recommended)

```
@Angular Migration run migration workflow skip tests
```

## Troubleshooting

### Agent Not Found in Zed

1. Check `settings.json` has correct path
2. Run `npm run build` in agent directory
3. Restart Zed completely
4. Check Zed logs: View → Toggle Log Panel

### Build Fails After Migration

```bash
# Clean everything
rm -rf node_modules .angular dist

# Reinstall
npm install

# Rebuild
npm run build
```

### Scripts Permission Denied

```bash
cd /path/to/Angular-Migration
chmod +x scripts/*.sh
```

### Backup Not Found

Check the backup was created:
```bash
cd /path/to/your/project/..
ls -la | grep angular-backup
```

## Example Session

```
You: @Angular Migration run step-by-step migration

Agent: # 🚀 Step-by-Step Angular Migration Workflow
       I'll guide you through upgrading from Angular 14 to 20.
       
       This workflow consists of 11 steps...
       
       Ready to begin!

Agent: ## Confirmation Required: Upgrade to Angular 15
       
       **Proceed with this step?** (yes/no)

You: yes

Agent: ✅ Upgrade to Angular 15 completed!
       Progress: 3/11 steps (27%)

[... continues through all steps ...]

Agent: # 🎉 Migration Complete!
       Successfully completed 11/11 steps
       
       A detailed migration report has been generated in your project directory.
```

## Next Steps

- Read [WORKFLOW.md](WORKFLOW.md) for detailed step descriptions
- Review [README.md](README.md) for full documentation
- Check [scripts/](scripts/) for backup/restore scripts

## Getting Help

- **Documentation**: See README.md and WORKFLOW.md
- **Issues**: Report on GitHub
- **Angular Guide**: https://angular.dev/update-guide

---

**Ready to migrate? Let's go! 🚀**

```
@Angular Migration run step-by-step migration
```
