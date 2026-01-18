# music-school-pwa

Next.js + Prisma + Supabase (Postgres) PWA for managing a music school.

## Features
- Auth (JWT stored in httpOnly cookie)
- Lessons (API + basic UI)

## Setup
1) Install dependencies
npm install

2) Create a .env (not committed) with:
DATABASE_URL=...
JWT_SECRET=...

3) Prisma
npx prisma generate
npx prisma migrate dev

4) Run
npm run dev
