# IAUE-ITE Research Project Validator API

A production-minded NestJS backend for the Ignatius Ajuru University of
Education (IAUE) Information Technology Education Department. It helps public
users check proposed postgraduate research titles against a managed archive of
completed projects, while giving authenticated administrators controlled
archive-management and reporting tools.

## What It Does

- Checks a submitted title for an exact normalized-title duplicate.
- When no exact duplicate exists, returns advisory similar titles using equal
  weighting across Levenshtein, trigram, and token-set Jaccard scores.
- Exposes a public, read-only endpoint for a matched project's abstract.
- Lets authenticated admins create, search, update, and soft-delete project
  records.
- Lets Super Admins manage administrator accounts, roles, account status, and
  password resets.
- Produces project totals by year, programme, and programme/year.
- Seeds the IAUE-ITE department and its PGD, MSc, and PhD programmes on startup.

Students and other public users do not have accounts in this MVP and cannot
create, update, or delete project records.

## Stack

- NestJS 11 and TypeScript
- PostgreSQL / Neon with Prisma ORM
- JWT authentication with server-side session revocation
- Argon2id password hashing
- PostgreSQL `pg_trgm` candidate retrieval with a deterministic similarity engine

## Main API Areas

| Area | Base route | Access |
| --- | --- | --- |
| Public title validation | `POST /projects/validate` | Public |
| Public abstract retrieval | `GET /projects/:id/abstract` | Public |
| Admin authentication | `/auth-admin/*` | Login is public; logout/me require JWT |
| Development bootstrap | `POST /internal/super-admin/register` | `NODE_ENV=development` only |
| Administrator management | `/admin-management/admins/*` | `SUPER_ADMIN` only |
| Project archive management | `/admin/projects/*` | Authenticated admin |
| Reports | `/admin/reports/*` | Authenticated admin |

Protected requests use:

```http
Authorization: Bearer <access-token>
```

## Local Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and provide your Neon `DATABASE_URL` and a
   strong `JWT_SECRET`.

3. Apply migrations.

   ```bash
   npx prisma migrate deploy
   ```

4. Start the API.

   ```bash
   npm run start:dev
   ```

For local Super Admin bootstrap, set `NODE_ENV=development` and call
`POST /internal/super-admin/register`. The endpoint only creates an account
when no Super Admin exists. It is disabled outside development.

## Quality Commands

```bash
npx prisma validate
npm run build
npm test -- --runInBand
npx eslint "src/**/*.ts" "test/**/*.ts"
```

## Configuration

`.env.example` documents all supported environment variables, including JWT
lifetimes, CORS origin configuration, and configurable similarity thresholds
and result limits.

## Database Notes

Project titles are stored in both original and normalized forms. Exact matching
always runs first and is authoritative. Similarity results are ranked advisory
matches only; they never automatically accept or reject a proposed topic.

Project records use soft deletion and retain version/audit history for
administrative accountability.
