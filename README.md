# AutoTools ERP & POS System

A full-stack ERP and Point-of-Sale system for managing multi-branch inventory, sales, stock transfers, ledger accounting, and user access control.

**Stack:** React 19 + TypeScript · Vite · TailwindCSS · tRPC · Drizzle ORM · MySQL 8 · Express

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Getting Started — Local Development](#getting-started--local-development)
4. [Deployment — Docker Compose](#deployment--docker-compose)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [User Roles](#user-roles)
8. [Scripts Reference](#scripts-reference)

---

## Features

| Module | Description |
|---|---|
| **POS** | Barcode / serial-number scan checkout, receipt printing, discount support, payment types |
| **Inventory** | Serial-number tracked stock, bulk import, reorder alerts |
| **Stock Transfers** | Multi-branch transfer workflow (Pending → InTransit → Completed) |
| **Products** | Product catalogue with landing cost, branch cost, retail price, and margin display |
| **Ledger** | Branch-level double-entry ledger with running balance, expenses, and HO payments |
| **Reports** | Monthly sales chart, top products, profit breakdown (70/30 split) |
| **Users** | Role-based access (Admin / Manager / User), branch assignment |
| **Audit Trail** | Immutable log of every significant action |
| **Branches** | Multi-branch support with warehouse flag |

---

## Architecture

```
autotools-erp/
├── client/src/
│   ├── pages/          # React page components (one per route)
│   ├── components/     # Shared UI components (DashboardLayout, etc.)
│   └── lib/            # tRPC client, query client, utilities
├── server/
│   ├── _core/          # Express entry point, OAuth, tRPC context
│   ├── routers/        # tRPC routers (pos, inventory, transfers, …)
│   └── db.ts           # All database access functions (Drizzle ORM)
├── drizzle/
│   ├── schema.ts       # Drizzle table definitions (source of truth)
│   └── init.sql        # SQL bootstrap script for Docker
├── shared/
│   └── types.ts        # Shared TypeScript types and constants
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Getting Started — Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL 8 (local or Docker)

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd autotools-erp
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, OWNER_OPEN_ID, etc.

# 3. Run database migrations
pnpm db:push

# 4. Start development server
pnpm dev
# App available at http://localhost:3000
```

---

## Deployment — Docker Compose

The recommended production deployment uses Docker Compose, which starts both the MySQL database and the application container.

```bash
# 1. Configure environment
cp .env.example .env
# Fill in all required values (see Environment Variables below)

# 2. Build and start
docker-compose up -d --build

# 3. Check status
docker-compose ps
docker-compose logs -f app

# 4. Stop
docker-compose down
```

The application will be available at `http://<your-server>:3000`.

> **Note:** The MySQL data is persisted in a named Docker volume (`db_data`). To reset the database, run `docker-compose down -v`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | No | HTTP port (default: `3000`) |
| `VITE_APP_ID` | Yes | OAuth App ID |
| `JWT_SECRET` | Yes | Secret for signing session tokens (min 32 chars) |
| `OAUTH_SERVER_URL` | Yes | OAuth provider base URL |
| `OWNER_OPEN_ID` | Yes | OpenID of the initial admin account |
| `DATABASE_URL` | Yes | MySQL connection string (`mysql://user:pass@host:port/db`) |
| `MYSQL_ROOT_PASSWORD` | Docker only | MySQL root password |
| `MYSQL_DATABASE` | Docker only | Database name |
| `MYSQL_USER` | Docker only | Database user |
| `MYSQL_PASSWORD` | Docker only | Database password |
| `APP_PORT` | Docker only | Host port to expose (default: `3000`) |

---

## Database

Schema is managed with **Drizzle ORM**. The `drizzle/schema.ts` file is the single source of truth.

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Generate + migrate in one step
pnpm db:push
```

For Docker deployments, the `drizzle/init.sql` file is automatically executed by MySQL on first container startup to create all tables.

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full access to all branches, users, transfers, reports, audit trail |
| **Manager** | Access scoped to assigned branches; can create transfers, view ledger, run POS |
| **User** | POS access only (scoped to assigned branch) |

---

## Scripts Reference

| Script | Description |
|---|---|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build client (Vite) and server (esbuild) for production |
| `pnpm start` | Start production server from built files |
| `pnpm check` | TypeScript type check (no emit) |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Generate + migrate in one step |
| `pnpm docker:build` | Build Docker image |
| `pnpm docker:up` | Start Docker Compose stack |
| `pnpm docker:down` | Stop Docker Compose stack |
| `pnpm docker:logs` | Tail application logs |

---

## Health Check

The server exposes a health check endpoint at `GET /api/health` that returns:

```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 3600,
  "timestamp": "2026-02-24T10:00:00.000Z"
}
```

This endpoint is used by Docker's `HEALTHCHECK` directive and can be used by external load balancers or monitoring tools.
