# Prerequisites

> **Environment setup and requirements for Angular migration**

Before starting the Angular 14→20 migration, ensure your development environment meets all requirements.

---

## 📋 System Requirements

### Required Software

| Software | Minimum Version | Recommended | Purpose |
|----------|----------------|-------------|---------|
| **PowerShell** | 5.1 | 7.4+ | Running migration scripts |
| **Node.js** | 14.20.0 | 20.11+ | Angular runtime |
| **npm** | 6.0 | 10.0+ | Package management |
| **Git** | 2.0 | Latest | Version control |

### Angular Version Requirements by Target

| Target Version | Node.js | TypeScript | Notes |
|---------------|---------|-----------|-------|
| Angular 15 | 14.20+, 16.x, 18.x | 4.8+ | First major upgrade |
| Angular 16 | 16.14+, 18.x | 5.0+ | Signals introduced |
| Angular 17 | 18.10+ | 5.2+ | MDC migration |
| Angular 18 | 18.13+ | 5.4+ | Stable signals |
| Angular 19 | 18.19+, 20.x | 5.5+ | Zoneless support |
| Angular 20 | 20.11+, 22.x | 5.6+ | Final target |

---

## 🔧 PowerShell Setup

### Windows

PowerShell 5.1 comes pre-installed on Windows 10/11. For PowerShell 7+:

```powershell
# Install PowerShell 7+ (recommended)
winget install Microsoft.PowerShell

# Or download from: https://github.com/PowerShell/PowerShell/releases
```

### macOS

```bash
# Install PowerShell via Homebrew
brew install --cask powershell
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install -y wget
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y powershell

# Fedora
sudo dnf install powershell
```

### Execution Policy

Set the execution policy to allow script execution:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for current process only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

---

## 📦 Node.js Setup

### Version Management

Use **nvm** (Node Version Manager) for easy version switching:

**Windows:**
```powershell
# Install nvm-windows
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install Node.js 20 (recommended for Angular 20)
nvm install 20
nvm use 20
```

**macOS/Linux:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20
nvm install 20
nvm use 20
```

### Verify Installation

```powershell
# Check Node.js version
node --version  # Should show v20.x.x or v18.x.x

# Check npm version
npm --version   # Should show 9.x.x or higher
```

---

## 🌐 Angular CLI

### Global Installation

```powershell
# Install Angular CLI globally (optional but recommended)
npm install -g @angular/cli@latest

# Verify installation
ng version
```

### Project-Local CLI

The migration scripts use `npx ng` to ensure they use the project's local Angular CLI version, so global installation is optional.

---

## 🗂️ Git Setup

### Installation

**Windows:**
```powershell
winget install Git.Git
```

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install git

# Fedora
sudo dnf install git
```

### Configuration

```bash
# Configure git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --list
```

---

## ✅ Prerequisites Check

### Automated Check

Run the prerequisites check script:

```powershell
.\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "20"
```

This will verify:
- ✅ PowerShell version
- ✅ Node.js version
- ✅ npm availability
- ✅ Git installation
- ✅ Angular CLI availability
- ✅ Project structure
- ✅ Current Angular version

### Manual Verification

```powershell
# PowerShell version
$PSVersionTable.PSVersion

# Node.js and npm
node --version
npm --version

# Git
git --version

# Angular CLI (if installed globally)
ng version

# Check current Angular version in project
cd your-project
npm list @angular/core
```

---

## 📁 Project Requirements

### Required Files

Your Angular project must have:

```
your-project/
├── package.json          ✅ Required
├── angular.json          ✅ Required
├── tsconfig.json         ✅ Required
├── src/
│   ├── main.ts          ✅ Required
│   ├── index.html       ✅ Required
│   └── app/             ✅ Required
└── node_modules/         (will be regenerated)
```

### Current State

Before migration:

- [ ] Angular version is 14.x
- [ ] All changes committed to git
- [ ] Working directory is clean (`git status`)
- [ ] Project builds successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] No outstanding merge conflicts
- [ ] Backup created (recommended)

---

## 🔐 Permissions

### File System

Ensure you have:
- ✅ Read/write permissions to project directory
- ✅ Permission to create backup directories
- ✅ Permission to modify `package.json` and related files

### Network

Ensure you can:
- ✅ Access npm registry (https://registry.npmjs.org)
- ✅ Download packages from npm
- ✅ Access Angular update server (for schematics)

### Firewall/Proxy

If behind a corporate firewall:

```powershell
# Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Verify connectivity
npm ping
```

---

## 💾 Disk Space

### Requirements

Ensure sufficient disk space:

- **Project size:** ~500 MB - 2 GB (depending on dependencies)
- **Backup:** Same as project size
- **node_modules:** ~300 MB - 1 GB per version
- **Build artifacts:** ~100 MB - 500 MB

**Recommended:** 10 GB free disk space

### Check Available Space

**Windows:**
```powershell
Get-PSDrive C | Select-Object Used,Free
```

**macOS/Linux:**
```bash
df -h .
```

---

## 🧪 Test Environment

### Local Development

Recommended setup:
- ✅ Separate development branch
- ✅ Local backup of database (if applicable)
- ✅ Environment variables configured
- ✅ Development server can start

### Testing Tools

Ensure you have:
- ✅ Browser for testing (Chrome, Edge, Firefox)
- ✅ Browser DevTools accessible
- ✅ Test runners configured (Karma/Jest)

---

## 📚 Documentation Access

Keep these resources handy:

- 🔗 [Angular Update Guide](https://update.angular.io)
- 🔗 [Angular Documentation](https://angular.dev)
- 🔗 [Material Documentation](https://material.angular.io)
- 🔗 [TypeScript Documentation](https://www.typescriptlang.org/docs)
- 🔗 [This Migration Guide](README.md)

---

## ⚠️ Common Issues

### Issue: PowerShell Script Won't Run

**Error:** "cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Node.js Version Conflicts

**Error:** "requires Node.js version X"

**Solution:**
```powershell
# Use nvm to switch versions
nvm install 20
nvm use 20

# Or update Node.js
winget upgrade NodeJS
```

### Issue: npm Install Fails

**Error:** "EACCES: permission denied"

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Fix permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or reinstall Node.js with correct permissions
```

---

## ✅ Prerequisites Checklist

Before proceeding with migration:

- [ ] PowerShell 5.1+ or PowerShell 7+ installed
- [ ] Node.js 14.20+ installed (20.11+ recommended)
- [ ] npm 6+ installed (10+ recommended)
- [ ] Git installed and configured
- [ ] Angular CLI available (global or will use npx)
- [ ] Execution policy configured
- [ ] Sufficient disk space available (10+ GB)
- [ ] Network connectivity verified
- [ ] Project is on Angular 14.x
- [ ] All changes committed to git
- [ ] Project builds and tests pass
- [ ] Backup strategy planned

---

**All prerequisites met?** → Continue to [Backup Guide](01-pre-migration-backup.md)

**Need help?** → See [Troubleshooting](troubleshooting.md)
