# Node.js Version Requirements

## Critical Requirement

**Angular 20 requires Node.js v22.x** - This is a **HARD REQUIREMENT** that cannot be bypassed.

## Blocking Error Behavior

When you attempt to run any migration stage tool with an incorrect Node.js version, the tool will:

1. **Immediately BLOCK execution** - No migration operations will proceed
2. **Display clear error message** - Shows required vs current version
3. **Prevent manual workarounds** - Explicitly warns against bypassing the requirement
4. **Provide installation instructions** - Platform-specific guidance for installing Node.js v22
5. **Require user action** - Migration cannot continue until Node.js v22 is installed

## Error Message Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MIGRATION BLOCKED - ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Node.js Version Mismatch
  Required: 22.x.x
  Current:  v24.6.0

Angular 20 requires Node.js v22. Your current Node.js version (v24.6.0)
is not compatible and will cause build failures.

⚠️  CANNOT PROCEED - You must install Node.js v22 first.
⚠️  DO NOT attempt manual migration - it will fail with the wrong Node version.
⚠️  DO NOT use workarounds - this is a hard requirement.
```

## Why This is Critical

### Technical Reasons:
1. **npm Package Compatibility**: Angular 20 packages are built for Node.js v22 native modules
2. **Build Tool Requirements**: Angular CLI and build tools expect Node.js v22 APIs
3. **TypeScript Compiler**: TypeScript version used by Angular 20 requires Node.js v22
4. **Package Scripts**: Many post-install scripts and build hooks require Node.js v22 features

### What Happens with Wrong Version:
- ❌ npm install will fail with cryptic errors
- ❌ ng build will fail to compile
- ❌ Runtime errors in development server
- ❌ Tests will fail with environment errors
- ❌ Production builds will be unstable

## Installation Instructions

### macOS
```bash
# Using Homebrew (recommended)
brew install node@22

# Verify installation
node --version  # Should show v22.x.x
```

### Windows
```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download from https://nodejs.org/en/download/
```

### Linux
```bash
# Using nvm (recommended)
nvm install 22
nvm use 22

# Or using package manager
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL/Fedora
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

## After Installing Node.js v22

1. **Close and restart your terminal/IDE completely**
   - This ensures the new Node.js version is in your PATH
   - Don't skip this step!

2. **Verify the installation**
   ```bash
   node --version
   # Must show: v22.x.x
   ```

3. **Clear npm cache** (optional but recommended)
   ```bash
   npm cache clean --force
   ```

4. **Try the migration command again**
   - Create session: `session_create`
   - Run pre-migration: `migration_stage_pre_migration`

## Managing Multiple Node.js Versions

If you need different Node.js versions for different projects, use a version manager:

### nvm (macOS/Linux)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js v22
nvm install 22

# Use Node.js v22 for current project
nvm use 22

# Set Node.js v22 as default
nvm alias default 22
```

### nvm-windows (Windows)
```powershell
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install Node.js v22
nvm install 22

# Use Node.js v22
nvm use 22
```

### .nvmrc File (Project-Specific)
Create a `.nvmrc` file in your project root:
```
22
```

Then just run:
```bash
nvm use
```

## Checking Before You Start

Before attempting Angular migration, always verify:

1. **Node.js version**
   ```bash
   node --version  # Must be v22.x.x
   ```

2. **npm version**
   ```bash
   npm --version  # Should be v10.x.x (comes with Node.js v22)
   ```

3. **Angular CLI (if installed globally)**
   ```bash
   ng version  # Should show CLI compatible with Node.js v22
   ```

## Read-Only Operations

These tools do NOT require Node.js v22 (they only read information):
- `migration_stage_get_current` - Get current stage status
- `migration_stage_get_all` - List all migration stages
- `migration_stage_validate_node` - Check Node.js version
- `session_list` - List sessions
- `session_get` - Get session details

All other tools (migration stages, session creation, etc.) **require Node.js v22**.

## AI Agent Guidance

When an AI agent encounters the Node.js version blocking error:

### ✅ CORRECT Behavior:
1. **Stop immediately** - Do not attempt any migration operations
2. **Inform the user** - Clearly explain the Node.js v22 requirement
3. **Provide instructions** - Show platform-specific installation steps
4. **Wait for user** - Do not proceed until user confirms they've installed Node.js v22
5. **Verify after fix** - Use `migration_stage_validate_node` to confirm version

### ❌ INCORRECT Behavior:
1. ❌ Attempting manual migration with wrong Node.js version
2. ❌ Suggesting workarounds or bypassing the requirement
3. ❌ Using conditional logic like "since you only want to upgrade to v15..."
4. ❌ Proceeding with partial migration
5. ❌ Offering alternative approaches that don't use Node.js v22

### Example Agent Response:
```
I cannot proceed with the Angular migration because your Node.js version
is v24.6.0, but Angular 20 requires Node.js v22.x.

This is a blocking requirement - I must stop here.

Please:
1. Install Node.js v22 (instructions for macOS/Windows/Linux above)
2. Restart your terminal/IDE
3. Verify: node --version (should show v22.x.x)
4. Then we can continue with the migration

Would you like me to wait while you install Node.js v22?
```

## Troubleshooting

### "I installed Node.js v22 but still getting the error"

1. **Restart terminal/IDE completely**
   - Close all terminal windows
   - Restart your IDE/editor
   - Open a fresh terminal

2. **Verify installation**
   ```bash
   which node  # Shows path to node binary
   node --version  # Shows version
   ```

3. **Check PATH**
   ```bash
   echo $PATH  # macOS/Linux
   echo %PATH%  # Windows
   ```

### "I'm using nvm but it's not switching versions"

```bash
# Set default version
nvm alias default 22

# Use in current shell
nvm use 22

# Verify
node --version
```

### "I need a different Node.js version for other projects"

Use nvm and switch per-project:
```bash
# Angular 20 project
cd /path/to/angular20-project
nvm use 22

# Other project
cd /path/to/other-project
nvm use 18  # or whatever version
```

## Summary

- ✅ **Node.js v22.x is REQUIRED** for Angular 20 migration
- ✅ **Tool will BLOCK execution** with wrong version
- ✅ **No workarounds or bypasses** - this is a hard requirement
- ✅ **Install Node.js v22 first** before attempting migration
- ✅ **Verify installation** with `node --version`
- ✅ **Restart terminal/IDE** after installation
