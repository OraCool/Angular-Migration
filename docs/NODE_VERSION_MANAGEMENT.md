# Node.js Version Management

The Angular Migration Agent automatically checks Node.js version compatibility before each upgrade step and can help you switch to compatible versions using NVM.

## ⚠️ Important: Server Process Limitation

**The migration server cannot switch its own Node.js version while running.**

This is a fundamental limitation: NVM operates by modifying shell environment variables, and a child process (where NVM commands run) cannot modify the parent process's environment.

### What This Means

When the agent runs `nvm install 18.20.8` or `nvm use 18.20.8`:
- ✅ Command succeeds in the child process
- ✅ Node version switches **in that subprocess**
- ❌ Parent server process **remains on original Node version**
- ❌ Verification fails (parent still shows old version)

### The Solution

**You must start the server with the correct Node version:**

```bash
# Use the provided startup script (RECOMMENDED)
./start-migration.sh

# OR manually switch before starting
nvm use 18
npm start

# OR create .nvmrc and auto-switch
echo "18" > .nvmrc
nvm use
npm start
```

See [Starting the Server](#starting-the-server) section below for details.

## Angular → Node.js Version Requirements

| Angular Version | Required Node.js Versions |
|----------------|---------------------------|
| 14             | 14.20+, 16.14+, 18.10+   |
| 15             | 14.20+, 16.14+, 18.10+   |
| 16             | 16.14+, 18.10+           |
| 17             | 18.13+, 20.9+            |
| 18             | 18.19+, 20.11+           |
| 19             | 18.19+, 20.11+, 22.0+    |
| 20             | 20.11+, 22.0+            |

## How It Works

### Automatic Version Checking

Before each Angular upgrade step, the agent:

1. **Checks current Node.js version** - Runs `node --version`
2. **Validates compatibility** - Compares against Angular requirements
3. **Shows status** - Displays ✅ if compatible or ⚠️ if incompatible

### NVM Integration

If you have an incompatible Node.js version, the agent will:

1. **Check if NVM is available** - Looks for `nvm` command
2. **List installed versions** - Runs `nvm ls` to find compatible versions
3. **Offer to switch** - If a compatible version is installed
4. **Offer to install** - If no compatible version is found

## Example Flow

### Scenario 1: Compatible Version
```
✅ Node.js 20.11.0 is compatible
```
Migration proceeds automatically.

### Scenario 2: Incompatible Version (Compatible Version Available)
```
⚠️ Node.js Version Incompatibility

⚠️ Node.js 16.14.0 is not compatible
Required: 18.13+,20.9+
Found compatible version: 20.11.0
Suggested: nvm use 20.11.0

💡 Would you like me to switch to Node.js 20.11.0 using NVM?

Type "switch node" or "yes" to continue, or manually run:
```bash
nvm use 20.11.0
```
```

The agent will wait for your confirmation before switching.

### Scenario 3: Incompatible Version (No Compatible Version)
```
⚠️ Node.js Version Incompatibility

⚠️ Node.js 16.14.0 is not compatible
Required: 18.13+,20.9+
No compatible version installed
Suggested: nvm install 20.11.0

💡 Would you like me to install Node.js 20.11.0 using NVM?

Type "install node" or "yes" to continue, or manually run:
```bash
nvm install 20.11.0
nvm use 20.11.0
```
```

The agent will wait for your confirmation before installing.

## User Commands

When prompted, you can respond with:

- **`yes`** or **`switch node`** - Switch to suggested version (if installed)
- **`yes`** or **`install node`** - Install suggested version (if not installed)
- **Manual switch** - Run the suggested `nvm` command yourself

## NVM Installation

If you don't have NVM installed:

### macOS/Linux
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Windows
Use [nvm-windows](https://github.com/coreybutler/nvm-windows)

## Recommended Node.js Versions

For the smoothest migration experience:

- **Angular 14-16**: Node.js 18.10.0
- **Angular 17**: Node.js 20.9.0
- **Angular 18-20**: Node.js 22.0.0

These recommendations ensure compatibility with all versions in the migration path.

## Manual Version Management

If you prefer to manage Node.js versions manually:

```bash
# List installed versions
nvm ls

# Install a specific version
nvm install 20.11.0

# Switch to a version
nvm use 20.11.0

# Set default version
nvm alias default 20.11.0
```

## Starting the Server

### Option 1: Use Startup Script (Recommended)

The project includes a startup script that automatically handles Node version switching:

```bash
./start-migration.sh
```

This script:
1. Checks your current Node.js version
2. Switches to Node 18.x/20.x if needed
3. Installs Node 18 if not available
4. Starts the migration server

**Benefits:**
- ✅ Automatic version management
- ✅ No manual commands needed
- ✅ Works for all migration scenarios

### Option 2: Manual Switch

Switch Node version before starting the server:

```bash
# For Angular 14-16
nvm use 18
npm start

# For Angular 17-20
nvm use 20
npm start
```

### Option 3: Use .nvmrc (Automatic)

Create an `.nvmrc` file in the project root:

```bash
echo "18" > .nvmrc
```

Then NVM automatically uses the correct version:

```bash
nvm use  # Reads from .nvmrc
npm start
```

### Verification

After starting, verify the server is running with the correct Node version:

```bash
node --version
# Should show v18.x.x or v20.x.x (not v24.x.x!)
```

## Troubleshooting

### "Version mismatch after install"

**Problem**: Agent reports "✅ Successfully installed Node.js 18.20.8" but then shows "❌ Version mismatch after install. Expected 18.20.8, got 24.6.0"

**Cause**: Install succeeded in subprocess, but parent server process is still on Node 24.6.0

**Solution**:
1. Stop the server (Ctrl+C)
2. Switch Node version manually:
   ```bash
   nvm use 18
   ```
3. Restart server:
   ```bash
   npm start
   ```
4. OR use the startup script:
   ```bash
   ./start-migration.sh
   ```

### NVM Not Found

**Problem**: Agent says NVM is not available

**Solution**:
1. Install NVM (see above)
2. Restart your terminal
3. Run `source ~/.nvm/nvm.sh` (Linux/macOS)

### Wrong Node Version After Switch

**Problem**: `node --version` shows old version after `nvm use`

**Solution**:
1. Close and reopen your terminal
2. Run `nvm use <version>` again
3. Verify with `node --version`

### Permission Errors

**Problem**: Permission denied when installing Node.js

**Solution**:
1. Don't use `sudo` with NVM
2. Ensure NVM is installed in your home directory
3. Check NVM installation: `nvm --version`

## Best Practices

1. **Install recommended versions first**
   ```bash
   nvm install 18.10.0
   nvm install 20.11.0
   nvm install 22.0.0
   ```

2. **Set a safe default**
   ```bash
   nvm alias default 20.11.0
   ```

3. **Use `.nvmrc` file** (optional)
   Create a `.nvmrc` file in your project:
   ```
   20.11.0
   ```
   Then run `nvm use` to auto-switch.

4. **Check before starting migration**
   ```bash
   node --version
   ```

## Integration with CI/CD

For automated migrations in CI/CD:

```yaml
# GitHub Actions example
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20.11.0'
```

```yaml
# GitLab CI example
image: node:20.11.0
```

## Future Enhancements

Planned improvements:

- [ ] Auto-install compatible Node versions without prompting (opt-in flag)
- [ ] `.nvmrc` file generation for each Angular version
- [ ] Support for other version managers (n, fnm, asdf)
- [ ] Pre-flight check before starting migration
- [ ] Version rollback support
