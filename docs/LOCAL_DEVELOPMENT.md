# Local Development Setup

This guide covers setting up the local development environment for the Ignite fulfillment application.

## Prerequisites Overview

| Tool | Purpose |
|------|---------|
| Bun | JavaScript runtime & package manager |
| Podman Desktop | Container runtime (Docker alternative) |
| Supabase CLI | Local backend stack (PostgreSQL, Auth, Edge Functions) |
| Deno | Edge Functions runtime (auto-managed by Supabase CLI) |

---

## macOS Setup

### 1. Install Homebrew (if not installed)

Homebrew is the standard package manager for macOS, used to install development tools and applications from the command line.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Bun

Bun is a fast JavaScript runtime and package manager that replaces Node.js and npm—we use it to install dependencies and run the Vite development server.

```sh
brew install oven-sh/bun/bun
```

Or via the official installer:
```sh
curl -fsSL https://bun.sh/install | bash
```

### 3. Install Podman

Podman is a daemonless container engine (Docker alternative) that Supabase CLI uses to run PostgreSQL, Auth, and other backend services in isolated containers.

```sh
# Install Podman CLI
brew install podman

# Optional: Install Podman Desktop GUI
brew install --cask podman-desktop
```

Initialize and start the Podman machine:

```sh
# Initialize the Podman machine with Docker compatibility (one-time setup)
podman machine init --rootful

# Start the Podman machine
podman machine start
```

**Note:** The `--rootful` flag enables full Docker API compatibility, allowing tools that expect a Docker socket to work seamlessly.

**Note:** You can also use Podman Desktop's GUI if you prefer, but the CLI commands above automate the entire setup.

#### Alias Docker to Podman

Supabase CLI expects the `docker` command to be available, so we create an alias that redirects `docker` calls to `podman`.

Add this alias to your shell config (`~/.zshrc` or `~/.bashrc`):

```sh
alias docker=podman
```

Then reload your shell:
```sh
source ~/.zshrc
```

### 4. Install Supabase CLI

Supabase CLI orchestrates the entire local backend stack—it spins up PostgreSQL, authentication (GoTrue), REST API (PostgREST), and the Deno runtime for Edge Functions, all managed through simple commands.

**Note:** Supabase CLI is installed as a project dependency (in `package.json`). After running `bun install`, you can use it via `bun run db:*` commands or directly with `bunx supabase`.

### 5. Clone and Setup Project

```sh
# Clone the repository
git clone <repository-url>
cd Ignite

# Install dependencies
bun install
```

### 6. Start Local Supabase

Make sure Podman Desktop is running, then:

```sh
bun run db:start
```

This will start the local PostgreSQL database, run all migrations, and display access URLs.

### 7. Seed the Database

To populate the local database with test users and sample data:

```sh
bun run db:seed
```

This runs `supabase db reset`, which reapplies all migrations and then runs `supabase/seed.sql`.

**Test Users** (all passwords: `password123`):

| Email | Role | Company |
|-------|------|---------|
| admin@msdirect.ch | system_admin | MSD |
| csm@msdirect.ch | msd_csm | MSD |
| admin@demo.com | admin | DEMO |
| viewer@demo.com | viewer | DEMO |

See `supabase/seed.sql` for the complete list of users, companies, and sample data.

### 8. Configure Environment for Local Development

This command automatically creates `.env.local` with the local Supabase URLs and keys:

```sh
bun run env:local
```

**You only need to run this once per machine.** The `.env.local` file persists and will be used every time you run `bun run dev`.

### 9. Start Development Server

```sh
bun run dev
```

The app will be available at `http://localhost:8080`

---

## Windows Setup

### 1. Verify winget is Available

Windows Package Manager (winget) is included with Windows 10 1809+ and Windows 11. Verify it's available:

```powershell
winget --version
```

If not available, install from the [Microsoft Store](https://www.microsoft.com/p/app-installer/9nblggh4nns1).

### 2. Install Bun

Bun is a fast JavaScript runtime and package manager that replaces Node.js and npm—we use it to install dependencies and run the Vite development server.

```powershell
winget install Oven-sh.Bun
```

Or via the official installer:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 3. Install Podman

Podman is a daemonless container engine (Docker alternative) that Supabase CLI uses to run PostgreSQL, Auth, and other backend services in isolated containers.

```powershell
# Install Podman CLI and Desktop
winget install RedHat.Podman

# Optional: Install Podman Desktop GUI (if not included above)
winget install RedHat.Podman-Desktop
```

Initialize and start the Podman machine:

```powershell
# Initialize the Podman machine with Docker compatibility (one-time setup)
podman machine init --rootful

# Start the Podman machine
podman machine start
```

**Note:** The `--rootful` flag enables full Docker API compatibility, allowing tools that expect a Docker socket to work seamlessly.

**Note:** You can also use Podman Desktop's GUI if you prefer, but the CLI commands above automate the entire setup.

#### Alias Docker to Podman

Supabase CLI expects the `docker` command to be available, so we create a PowerShell function that redirects `docker` calls to `podman`.

**Note:** We use a function instead of `Set-Alias` because PowerShell aliases don't support argument forwarding. A function with `$args` is required to pass through all arguments (e.g., `docker ps`, `docker run`, etc.) to podman correctly.

First, ensure scripts can run in PowerShell for the current user (doesn't require admin rights):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Create the PowerShell profile if it doesn't exist, then add the docker alias:
```powershell
# Create profile directory and file if they don't exist
New-Item -Path $PROFILE -ItemType File -Force | Out-Null

# Add the docker function
'function docker { podman $args }' | Add-Content $PROFILE
```

Then reload your profile:
```powershell
. $PROFILE
```

### 4. Install Supabase CLI

Supabase CLI orchestrates the entire local backend stack—it spins up PostgreSQL, authentication (GoTrue), REST API (PostgREST), and the Deno runtime for Edge Functions, all managed through simple commands.

**Note:** Supabase CLI is installed as a project dependency (in `package.json`). After running `bun install`, you can use it via `bun run db:*` commands or directly with `bunx supabase`.

### 5. Clone and Setup Project

```powershell
# Clone the repository
git clone <repository-url>
cd Ignite

# Install dependencies
bun install
```

### 6. Start Local Supabase

Make sure Podman Desktop is running, then:

```powershell
bun run db:start
```

This will start the local PostgreSQL database, run all migrations, and display access URLs.

### 7. Seed the Database

To populate the local database with test users and sample data:

```powershell
bun run db:seed
```

This runs `supabase db reset`, which reapplies all migrations and then runs `supabase/seed.sql`.

**Test Users** (all passwords: `password123`):

| Email | Role | Company |
|-------|------|---------||
| admin@msdirect.ch | system_admin | MSD |
| csm@msdirect.ch | msd_csm | MSD |
| admin@demo.com | admin | DEMO |
| viewer@demo.com | viewer | DEMO |

See `supabase/seed.sql` for the complete list of users, companies, and sample data.

### 8. Configure Environment for Local Development

This command automatically creates `.env.local` with the local Supabase URLs and keys:

```powershell
bun run env:local
```

**You only need to run this once per machine.** The `.env.local` file persists and will be used every time you run `bun run dev`.

### 9. Start Development Server

```powershell
bun run dev
```

The app will be available at `http://localhost:8080`

---

## Daily Development Workflow

Once the initial setup is complete, your daily workflow is simple:

1. **Start Podman Desktop** (if not already running)
2. **Start Supabase:** `bun run db:start`
3. **Start dev server:** `bun run dev`

---

## Environment Files Explained

| File | Purpose | Git Status |
|------|---------|------------|
| `.env` | Production Supabase credentials | Committed (safe public keys only) |
| `.env.local` | Local development overrides | Gitignored (auto-generated) |
| `.env.example` | Template for new developers | Committed |

Vite automatically loads `.env.local` over `.env` during development, so you don't need to manually switch between environments.

---

## Testing Against Production Supabase

By default, once you run `bun run env:local`, your app will always use the local Supabase instance when developing.

If you need to temporarily test against production Supabase:

1. **Delete `.env.local`:**
   ```sh
   rm .env.local              # Mac/Linux
   Remove-Item .env.local     # Windows PowerShell
   ```

2. **Run your dev server:** `bun run dev` — now connects to production Supabase

3. **Switch back to local development:**
   ```sh
   bun run env:local
   bun run dev
   ```

**Note:** Deployments always use `.env` (or platform environment variables), never `.env.local`.

---

## Common Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite development server |
| `bun run build` | Build for production |
| `bun run lint` | Run ESLint |
| `bun run env:local` | Generate `.env.local` with local Supabase credentials |
| `bun run db:start` | Start local Supabase stack |
| `bun run db:stop` | Stop local Supabase stack |
| `bun run db:status` | Show status of local Supabase services |
| `bun run db:seed` | Reset database, run migrations, and seed with test data |
| `bun run db:types` | Generate TypeScript types from local database |

## Troubleshooting

### Supabase start fails with Docker errors

1. Ensure Podman Desktop is running and the Podman machine is started
2. Verify the docker alias is working: `docker --version` should show Podman version
3. Try `bun run db:stop` then `bun run db:start`
4. Try restarting the Podman machine in Podman Desktop

### Port conflicts

If port 54321 or 8080 is already in use:
- For Supabase: check `supabase/config.toml` for port configuration
- For Vite: modify `vite.config.ts` server port
- Check if ports are available (Supabase uses 54321-54324)

### Can't connect to database

1. Ensure Supabase is running: `bun run db:status`
2. Run `bun run env:local` after starting Supabase
3. Check `.env.local` exists and has correct URLs
4. Restart your dev server

### Database migration errors

If migrations fail, try resetting the database:
```sh
bun run db:seed
```

This will drop all data and reapply migrations from scratch, then seed with test data.

---

## Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Studio](http://127.0.0.1:54323) (available after `supabase start`)
