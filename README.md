# Origins Client Portal — SvelteKit + Supabase + PostgreSQL + Drizzle

Production-oriented client portal matching the supplied Origins landing-page design.

## Stack

- SvelteKit + Svelte 5
- Supabase Auth / Storage / PostgreSQL
- Drizzle ORM + drizzle-kit
- Postgres.js
- Responsive warm-cream light theme + deep green dark theme

## Setup

```bash
npm install
cp .env.example .env
# add Supabase URL, anon key, and PostgreSQL connection string
npm run db:push
npm run dev
```

For Supabase, create a project and use its database connection string. For production, prefer the pooled connection string.

## Database

Schema is in `src/lib/server/db/schema.ts`. It includes organizations, profiles, projects, quotes, invoices, documents, conversations and messages.

The portal is intentionally multi-tenant: organization IDs are part of the data model. Add Supabase RLS policies before production launch so users can only read/write rows belonging to their organization.

## UI

The light theme is intentionally warm rather than white: parchment/cream surfaces, muted ink text and the same restrained green accent. Theme preference is persisted in localStorage.

## Health check

Once configured, `GET /api/health` verifies the server can reach PostgreSQL.
