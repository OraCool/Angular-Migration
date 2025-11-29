# Configuration Guide

The Angular Migration Agent supports configuration via environment variables for flexible deployment and customization.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to customize paths and options (all settings are optional)

3. Run the agent - it will automatically load your configuration

## Configuration Options

### Workshop Configuration

**WORKSHOP_ROOT** - Path to the Angular Migration Workshop directory
- **Default**: `~/.angular-migration/workshop`
- **Purpose**: Location of migration scripts, patterns, and agent guides
- **Example**: `WORKSHOP_ROOT=/path/to/your/workshop`

### Checkpoint Configuration

**CHECKPOINT_DIR** - Directory where migration checkpoints are stored
- **Default**: `~/.angular-migration/checkpoints`
- **Purpose**: Enables resume functionality after crashes or interruptions
- **Example**: `CHECKPOINT_DIR=/path/to/your/checkpoints`

### Project Configuration

**PROJECT_ROOT** - Default project path (can be overridden per-session)
- **Default**: None (must be specified when starting migration)
- **Purpose**: Override default Angular project location
- **Example**: `PROJECT_ROOT=/path/to/your/angular/project`

### Workflow Options

**SKIP_TESTS** - Skip test execution during migration
- **Default**: `false`
- **Values**: `true` | `false`
- **Purpose**: Speed up migration by skipping test runs
- **Example**: `SKIP_TESTS=true`

**SKIP_LINT** - Skip linting during migration
- **Default**: `false`
- **Values**: `true` | `false`
- **Purpose**: Skip linting checks to speed up workflow
- **Example**: `SKIP_LINT=true`

**AUTO_CONFIRM** - Auto-confirm all migration steps
- **Default**: `false`
- **Values**: `true` | `false`
- **⚠️ Warning**: Use with caution! Skips all confirmation prompts
- **Example**: `AUTO_CONFIRM=true`

## Configuration Priority

The agent uses the following priority for configuration:

1. **Environment variables** (highest priority)
2. **Default values** defined in `src/config.ts`

## Default Paths

If no configuration is provided, the agent uses these sensible defaults:

```
~/.angular-migration/
├── workshop/          # Workshop scripts and guides
└── checkpoints/       # Migration state checkpoints
```

## Example Configurations

### Development Setup
```bash
# Use local workshop for development
WORKSHOP_ROOT=/Users/developer/projects/angular-workshop
CHECKPOINT_DIR=/Users/developer/.migration-checkpoints
SKIP_TESTS=true
```

### CI/CD Pipeline
```bash
# Shared workshop, auto-confirm for automation
WORKSHOP_ROOT=/opt/angular-migration/workshop
CHECKPOINT_DIR=/tmp/migration-checkpoints
AUTO_CONFIRM=true
SKIP_LINT=true
```

### Production Migration
```bash
# Conservative settings with full validation
WORKSHOP_ROOT=/opt/angular-migration/workshop
CHECKPOINT_DIR=/var/lib/angular-migration/checkpoints
SKIP_TESTS=false
SKIP_LINT=false
AUTO_CONFIRM=false
```

## Verifying Configuration

When the agent starts, it logs the loaded configuration to stderr:

```
[Config] Loaded configuration:
  Workshop Root: /Users/developer/.angular-migration/workshop
  Checkpoint Dir: /Users/developer/.angular-migration/checkpoints
  Skip Tests: false
  Skip Lint: false
  Auto Confirm: false
[Angular Migration Agent] Started and ready
```

## Architecture

The configuration system is implemented in `src/config.ts`:

- **loadConfig()** - Loads environment variables with defaults
- **config** - Global singleton configuration object
- **logConfig()** - Logs configuration at startup for debugging

All modules import from `src/config.ts` for consistent configuration access.

## Migration from Hardcoded Paths

Previous versions used hardcoded paths. These have been replaced with:

| Old Hardcoded Path | New Configuration |
|-------------------|-------------------|
| `/Users/.../workshop` | `WORKSHOP_ROOT` environment variable |
| `~/.angular-migration/checkpoints` | `CHECKPOINT_DIR` environment variable |

## Troubleshooting

### Workshop not found
- Verify `WORKSHOP_ROOT` points to the correct directory
- Check that the workshop contains `scripts/` folder
- Ensure the path is absolute, not relative

### Checkpoint errors
- Ensure `CHECKPOINT_DIR` is writable
- Check disk space availability
- Verify directory permissions (755 recommended)

### Configuration not loaded
- Ensure `.env` file is in the project root (same directory as `package.json`)
- Verify environment variables are exported if using shell scripts
- Check for syntax errors in `.env` file

## See Also

- [State Persistence](./docs/STATE_PERSISTENCE.md) - Checkpoint and resume system
- [Workshop Integration](./WORKSHOP_INTEGRATION.md) - Workshop structure and usage
- [.env.example](./.env.example) - Template configuration file
