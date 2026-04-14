# Project Overview for AI Agents

## Current State

The project directory (`/Users/dkoryto/_projekty/ollama_manager`) contains a **Next.js 16** application (App Router) for managing local Ollama LLM models.

## Technology Stack

- **Framework:** Next.js 16.2.3 (Turbopack, App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui + Base UI (Radix)
- **State:** React Context + localStorage
- **Runtime:** Node.js 20 (Alpine in Docker)
- **Output:** `standalone` (optimized for Docker)

## Build & Run

```bash
npm install
npm run build
npm run lint
```

Docker:
```bash
docker compose build --no-cache
docker compose up -d
```

## Important Notes

- The working directory was renamed from `ceo_ai` to `ollama_manager`.
- Always run Docker commands from `/Users/dkoryto/_projekty/ollama_manager`.
- After renaming, rebuild the Docker image to ensure everything works correctly.
