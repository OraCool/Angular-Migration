# Node.js Version Management

The Angular Migration Agent automatically checks Node.js version compatibility before each upgrade step and can help you switch to compatible versions using NVM.

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

## Troubleshooting

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
