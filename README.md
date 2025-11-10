# LifeLine Pipeline Scout

**EMS Opportunity Intelligence Platform** - Continuously scouts and summarizes EMS-related business development opportunities from public procurement sites, delivering weekly pipeline-ready reports.

## Project info

**URL**: https://lovable.dev/projects/39ba6a08-40be-4eac-ac30-593bbf400887

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/39ba6a08-40be-4eac-ac30-593bbf400887) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/39ba6a08-40be-4eac-ac30-593bbf400887) and click on Share -> Publish.

## Domains & Entry Modes (ewproto.com)

This application uses a **multi-entry mode** deployment strategy with `ewproto.com` subdomains to support different user contexts.

### Deployment Mapping

Three entry modes are controlled via the `VITE_ENTRY_MODE` environment variable:

| Mode | Domain | Behavior | Use Case |
|------|--------|----------|----------|
| `landing` | `scout.ewproto.com` | Shows landing page with Internal vs Demo choice | Public entry point |
| `internal` | `scout-internal.ewproto.com` | Direct to internal dashboard, internal auth only | LifeLine staff |
| `demo` | `scout-demo.ewproto.com` | Direct to demo with synthetic data | Prospects/evaluation |

### Entry Mode Details

**Landing Mode** (`VITE_ENTRY_MODE=landing`)
- Root `/` shows landing page with two entry options
- "Internal" button → `/auth` (internal staff login)
- "External Demo" button → `/demo` (demo experience)
- Used for `scout.ewproto.com`

**Internal Mode** (`VITE_ENTRY_MODE=internal`)
- Root `/` redirects to dashboard (requires auth)
- `/auth` shows internal-only login (no signup)
- No demo access or CTAs
- Long session durations to minimize login friction
- Used for `scout-internal.ewproto.com`

**Demo Mode** (`VITE_ENTRY_MODE=demo`)
- Root `/` shows demo with synthetic data
- Public signup/login allowed
- Strict data isolation from internal
- No access to real LifeLine data
- Used for `scout-demo.ewproto.com`

### Running Locally

Set the entry mode via environment variable:

```bash
# Landing version (default)
VITE_ENTRY_MODE=landing npm run dev

# Internal-only version
VITE_ENTRY_MODE=internal npm run dev

# Demo-only version
VITE_ENTRY_MODE=demo npm run dev
```

### Deployment

Each subdomain deployment should set the appropriate `VITE_ENTRY_MODE`:

1. **scout.ewproto.com**: Set `VITE_ENTRY_MODE=landing`
2. **scout-internal.ewproto.com**: Set `VITE_ENTRY_MODE=internal`
3. **scout-demo.ewproto.com**: Set `VITE_ENTRY_MODE=demo`

**Note**: This app is designed for `ewproto.com`. The `lifeline-ems.com` domain is **not** configured by default and is managed separately by LifeLine IT.

### Custom Domain Setup

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
