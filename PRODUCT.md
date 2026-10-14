# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three groups use it, all every day:

- **Segreteria / direzione** (role `ADMIN`): plans the weekly lessons across all teachers and students, manages teachers' availability, handles cancellations and changes.
- **Docenti** (role `TEACHER`): set their own weekly availability slots and manage their own lessons (postpone, cancel), often between one lesson and the next.
- **Studenti e famiglie** (role `STUDENT`): check their own lessons. The current interface was built around staff tasks and does not yet serve this group well; designing for them is open work.

## Product Purpose

Pentagramma is the management app for a music school: it replaces ad-hoc scheduling with one shared weekly view of instrument lessons, built on each teacher's declared availability, so lessons can't be booked outside a teacher's hours or on top of another lesson for the same teacher or student.

Success means the school runs its week from the app: staff create and adjust lessons in seconds, teachers keep their availability current themselves, and students and families always know when their next lesson is.

It is intended for real use by the school, and it is also part of the author's portfolio, so it has to hold up both as a working tool and as a showcase of product craft.

## Positioning

Scheduling is availability-first: a teacher's weekly slots define what can be booked, and conflicts for teacher or student are prevented both in the UI and on the server. It is built for a single school with its own identity, not as a generic multi-tenant SaaS.

## Operating Context

- Used equally on desktop (office, weekly planning) and on phones (teachers between lessons). It's an installable PWA, so mobile is a primary context, not an afterthought.
- The unit of work is the **week** (Monday to Sunday). Availability is a recurring weekly pattern, while lessons are dated events inside a week.
- Interface language is Italian.

## Capabilities and Constraints

- **Today:** login (JWT cookie), weekly lesson list with filters (teacher, student, instrument, text), create lesson within availability slots, postpone by 15/30/60/90 minutes, cancel (soft: status becomes `CANCELLED`), manage teacher availability.
- **Lesson states:** Programmata (`SCHEDULED`), Annullata (`CANCELLED`), Svolta (`DONE`), Spostata (`MOVED`). Allowed durations: 30, 45, 60, 90, 120 minutes.
- **Planned, not built:** Eventi e news, Iscrizioni, Contatti (shown in the navigation as "presto"). Whether these become public-facing pages is undecided.
- **Stack:** Next.js (App Router) with Tailwind CSS v4, Prisma, and Postgres on Supabase.
- **Known issue:** lesson times picked in the create form are stored as UTC clock times, so they show shifted in Italian local time.

## Brand Commitments

- Name: **Pentagramma**, a school of music "con anima jazz".
- An existing visual identity is in the code (paper, terracotta and navy; editorial jazz). Visual specifics belong in DESIGN.md, not here.

## Evidence on Hand

- "40 anni di attività": confirmed real by the owner.
- Academic year is shown as computed from today's date (Italian school year starts in September).
- App icons in `public/` (`icon-*.png`, `apple-touch-icon.png`).
- No testimonials, photos, teacher bios, student numbers or press exist in the repo. Do not invent them.

## Product Principles

1. **The week is the canvas.** Every scheduling view answers "what happens this week, and when is the next free slot?" first.
2. **Prevent conflicts, don't just report them.** Only offer choices that are actually possible; explain why the others aren't.
3. **One tool, three roles.** Each role sees its own job first: planning for the office, my slots and my lessons for teachers, my next lesson for students.
4. **Phone-first parity.** Anything a teacher does between lessons must be fast on a phone.
5. **Real enough to run a school, polished enough to show.** No demo copy, debug output or placeholder claims in shipped screens.

## Accessibility & Inclusion

No specific standard has been set. Families of all ages use it, so keep text legible, contrast at WCAG AA, and every action reachable by keyboard and screen reader.
