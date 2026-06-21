# UI Polish Pass — Design

## Goal

Improve visual polish and consistency across the four existing pages (header/nav, lessons, availability, login) without introducing new colors, fonts, or dependencies. This is a refinement of the existing "editorial jazz" design system (paper/terracotta/navy palette, `surface-paper`/`surface-dark`/`btn-primary`/`btn-secondary`/`field-theme` utility classes defined in `src/app/globals.css`), not a redesign.

## Non-goals

- No new design tokens, fonts, or packages.
- No backend/API/data changes.
- No new pages or features (e.g., not implementing "Eventi e News" or "Iscrizioni" as real pages).

## Changes by area

### 1. Header & navigation (`src/app/components/AppHeader.tsx`)

- "Eventi e News", "Iscrizioni", "Contatti" currently render as static `<li>` items styled identically to the real nav links (`Lezioni di Strumento`, `Disponibilita Docenti`), implying they're clickable when they aren't.
- Restyle these placeholder items as visibly inactive: lower opacity, no hover background change, `cursor-default`, and a small "presto" (coming soon) marker so the visual distinction from real links is obvious at a glance.
- Tighten vertical spacing in the header's top row (logo circle / title / role badge) on mobile widths so it doesn't feel as heavy when stacked.

### 2. Lessons page (`src/app/lessons/page.tsx`)

- The filter bar currently mixes a checkbox, search input, three `<select>` filters, and a count readout into one wrapping flex row, which crowds awkwardly at medium widths.
- Restructure into two clear rows: (a) search input + "hide cancelled" checkbox + count, (b) the three filter selects (teacher/student/instrument) grouped together with consistent widths.
- De-emphasize the raw lesson UUID shown in each card — shrink it and visually subordinate it (it's debug-level info, not user-facing signal).
- Add a subtle hover lift (`translateY` + shadow) to lesson cards, consistent with the existing `.btn-primary:hover` treatment, so the list feels more interactive.

### 3. Availability page (`src/app/availability/page.tsx`)

- The "Fasce attive" day grid currently renders plain, uniform boxes with no visual rhythm.
- Highlight the current weekday's card (e.g., terracotta accent border) and add a small count badge showing how many fasce each day has.
- Align the "Nuova fascia" form field widths/spacing with the filter-bar styling used on the Lessons page for visual consistency.

### 4. Login page (`src/app/login/page.tsx`)

- Other full-page views (`lessons`, `availability`) wrap their `<main>` content with a soft radial-gradient texture overlay (`pointer-events-none absolute inset-0 bg-[radial-gradient(...)]`); the login page's `<main>` lacks this, making it feel like a slightly different surface.
- Add the same overlay treatment for consistency with the rest of the app.

## Testing

Manual visual verification only (no behavior/logic changes): run the dev server, view each of the four pages at mobile and desktop widths, confirm no regressions to existing functionality (filters, lesson actions, availability CRUD, login flow).
