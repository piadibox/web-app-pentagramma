---
name: Pentagramma
description: Gestionale di una scuola di musica con anima jazz, impaginato come un programma di sala.
colors:
  terracotta: "#bc4e31"
  terracotta-dark: "#983e27"
  blu-notte: "#121923"
  blu-notte-soft: "#1c2736"
  header-night: "#101721"
  carta-da-spartito: "#f2e7d2"
  carta-soft: "#f7efdf"
  carta-deep: "#f4e7d1"
  crema: "#fff8e9"
  sabbia: "#f3dfc3"
  inchiostro: "#1d1712"
  seppia: "#6f5c4c"
  seppia-chiara: "#8a7765"
  filetto: "#c6ad8e"
  filetto-soft: "#e3d2b4"
  ardesia: "#2d3950"
  salvia: "#4f6b55"
typography:
  display:
    fontFamily: "Bodoni Moda, Didot, Times New Roman, serif"
    fontSize: "clamp(2.25rem, 6vw, 3rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Crimson Pro, Iowan Old Style, Palatino Linotype, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Crimson Pro, Iowan Old Style, Palatino Linotype, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
  body:
    fontFamily: "Nunito Sans, Avenir Next, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Oswald, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.12em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.crema}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-dark}"
    textColor: "{colors.crema}"
  button-secondary:
    backgroundColor: "{colors.crema}"
    textColor: "{colors.terracotta-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-ghost-dark:
    backgroundColor: "transparent"
    textColor: "{colors.sabbia}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.crema}"
    textColor: "{colors.inchiostro}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  card-paper:
    backgroundColor: "{colors.crema}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-dark:
    backgroundColor: "{colors.blu-notte}"
    textColor: "{colors.crema}"
    rounded: "{rounded.lg}"
    padding: "16px"
  nav-link-active:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.crema}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  status-badge:
    backgroundColor: "transparent"
    textColor: "{colors.ardesia}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Pentagramma

## Overview

**Creative North Star: "Il Programma di Sala"**

Pentagramma looks like the printed programme handed out at a jazz concert: warm paper stock, a Bodoni masthead, condensed capitals for section labels, and one ink color doing all the shouting. Each screen is a page you read top to bottom, not a dashboard of floating widgets. The "jazz" lives in the contrast between the daytime paper where work is read (lists, forms, availability) and the night-club navy where things happen (header, the new-lesson panel, login).

Density is moderate. These are working screens used every day by office staff, teachers and families, on desktop and phone alike, so scanability comes before ornament. The brand shows in precise details: the type pairing, a single terracotta voice, hairline rules the color of aged paper, and long soft shadows that lift sheets off the desk.

The system rejects SaaS defaults: no pill buttons, no glassmorphism, no gradient text, no icon-plus-heading card grids, no kicker labels above headings.

**Key Characteristics:**
- Warm paper ground with a faint printed grain; navy reserved for chrome and action panels.
- Terracotta is the only accent: primary actions, active navigation, page titles, "today".
- Four-voice type: Bodoni display, Crimson headings, Nunito body, Oswald labels.
- Nearly square corners (4px) and 1px paper-colored rules.
- Times and dates set in tabular figures, like a printed schedule.

## Colors

A warm, low-saturation palette of paper, ink and one fired-clay accent, plus a nocturnal navy for contrast.

### Primary
- **Terracotta**: the single voice of the system. Primary buttons, the active nav item, page titles (display), the "Oggi" marker, focus rings, the text caret and the cancelled-lesson badge. **Terracotta Scura** is its hover/pressed state and the color of secondary-button text and links on paper.

### Secondary
- **Blu Notte**: night surfaces. The header (in the slightly deeper Header Night tone with terracotta glows), the "Nuova lezione" panel, the login form, the modal backdrop tint. Text on it is Crema, with Sabbia for labels.

### Tertiary
- **Ardesia**: status color for scheduled lessons ("Programmata"), as a 10% tint with a hairline ring.
- **Salvia**: success, for completed lessons ("Svolta") and the success-toast dot.

### Neutral
- **Carta da Spartito**: the page background, under a faint repeating-radial grain and two soft white light pools.
- **Carta Soft / Carta Deep**: secondary paper tones for nested information (the confirm-dialog summary, availability slot chips).
- **Crema**: the brightest paper. Card faces, input fields, toolbar strips, secondary-button fill.
- **Sabbia**: form labels and secondary text on Blu Notte.
- **Inchiostro**: primary text on paper.
- **Seppia**: secondary text, field labels on paper, meta lines (instrument · teacher).
- **Seppia Chiara**: placeholder text and "Nessuna fascia" empty notes.
- **Filetto**: card borders, input strokes, dashed empty-state frames.
- **Filetto Soft**: inner dividers between list rows and under day headings.

### Named Rules
**The One Voice Rule.** Terracotta is the only saturated hue on a paper screen. Ardesia and Salvia show up only as status tints, never as decoration.

**The Day/Night Rule.** Paper is for reading and reviewing. Blu Notte is for chrome and for the main creation action on a page. A screen never has more than one navy panel besides the header.

## Typography

**Display Font:** Bodoni Moda (with Didot, Times New Roman)
**Heading Font:** Crimson Pro (with Iowan Old Style, Palatino Linotype)
**Body Font:** Nunito Sans (with Avenir Next, Segoe UI)
**Label Font:** Oswald (with Franklin Gothic Medium, Arial Narrow)

All four are self-hosted through `next/font` and exposed as CSS variables.

**Character:** a high-contrast Didone masthead over a bookish old-style serif, with a soft humanist sans for reading and a condensed grotesque for the small capitals of a printed programme.

### Hierarchy
- **Display** (Bodoni 700, 2.25rem to 3rem, uppercase, line-height 1): one per page. The page title ("Lezioni", "Disponibilità") in Terracotta, and the "Pentagramma" wordmark.
- **Headline** (Crimson 600, 1.5rem, often uppercase): section titles such as "Nuova fascia", "Settimana tipo", "Nuova lezione".
- **Title** (Crimson 600, 1.25rem): day headings in the lesson list ("Martedì 14 ottobre") and lesson start times, with tabular figures.
- **Body** (Nunito 400, 0.875rem to 1rem, line-height 1.625): content, names, help text. Names are set at 600.
- **Label** (Oswald 400, 0.75rem to 0.875rem, uppercase, 0.08em to 0.14em tracking): field labels, buttons, nav items, status badges, "Oggi".

### Named Rules
**The Small Capitals Rule.** Oswald is for labels and controls, never for running text or headings. Buttons are always uppercase Oswald, tracked 0.08em.

**The Printed Schedule Rule.** Every time, date range and count uses tabular figures (the `.tabular` utility).

**The No Kicker Rule.** No eyebrow labels above headings. The heading carries its own weight; context goes in a line below it.

## Layout

- **Container:** centered, max width 80rem, 16px side gutter, 24px vertical padding (32px from `md` up).
- **Rhythm:** 24px between page blocks. Inside panels, 12px between controls and 16px padding (20px from `md` up). A toolbar strip sits on Crema above the panel content, split from it by a Filetto rule.
- **Lists:** lessons are grouped under day headings and laid out as full-width rows divided by Filetto Soft hairlines, not as cards. On desktop a row is a four-column grid (time, who, status, actions). On mobile the actions wrap to a full row underneath.
- **Availability:** a seven-column week from `lg` up, two columns from `sm`, one column on phones.
- **Breakpoints:** Tailwind defaults (sm 640px, md 768px, lg 1024px, xl 1280px).
- **Header:** one row with the wordmark on the left and the user plus "Esci" on the right, then a horizontally scrollable nav strip (scrollbar hidden on phones).

## Elevation & Depth

The system is mostly flat paper sheets with long, low ambient shadows: depth says "this is a sheet on the desk", never "this floats". The shadows have large negative spread and generous blur, so they read as a soft pool underneath rather than a halo.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 26px 50px -36px rgba(24, 16, 10, 0.5)`): every paper panel (`surface-paper`).
- **Night lift** (`box-shadow: 0 22px 42px -26px rgba(12, 16, 24, 0.45)`): navy panels (`surface-dark`).
- **Press** (`box-shadow: 0 16px 28px -20px rgba(152, 62, 39, 0.9)`): primary button hover, together with a 1px rise.

### Named Rules
**The Sheet Rule.** Only top-level panels carry a shadow. Rows, chips and fields inside a panel are separated by rules and tone, never by shadows of their own.

## Shapes

Nearly square printed forms. Controls, badges, chips and toasts use 4px corners. Panels use 8px. Circles are reserved for the "P" monogram and small status dots. Borders are always 1px, either Filetto or a translucent cream line on navy. A thick colored border-left is never used to mark state; "today" uses a full 1px Terracotta border plus a warmer paper tint.

## Components

### Buttons
Printed tickets: square, uppercase, quiet until pressed.
- **Shape:** nearly square (4px).
- **Primary:** Terracotta fill, 1px Terracotta Scura border, Crema Oswald label, 8px by 16px padding. Used for one main action per panel ("Crea lezione", "Aggiungi fascia", "Accedi").
- **Hover / Active:** goes to Terracotta Scura, rises 1px and gains the Press shadow. Active drops back flat. Transitions run 180ms on `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Secondary:** Crema fill, Filetto border, Terracotta Scura label. On hover the border turns Terracotta and the fill warms.
- **Ghost on night:** transparent with a Sabbia hairline, used for "Esci" in the header.
- **Text action:** Terracotta Scura label with no border, a 10% Terracotta hover wash. Used for destructive-but-confirmed actions ("Annulla") and inline links with a 4px underline offset.
- **Disabled:** 50% opacity and a `not-allowed` cursor; hover effects are suppressed.
- **Focus:** a 2px Terracotta outline at a 2px offset (Sabbia on navy).

### Inputs / Fields
- **Style:** Crema at 92% opacity, 1px Filetto stroke, 4px corners, 8px by 12px padding, Nunito 0.875rem. Labels are Oswald capitals above the field, with 6px between label and field.
- **Focus:** the stroke turns Terracotta, with a 3px Terracotta ring at 18% opacity.
- **Error / Disabled:** `aria-invalid` turns the stroke Terracotta and an inline message in Terracotta Scura appears below. Disabled fields dim to Carta Deep with Seppia text.
- **Search:** a 16px stroked magnifier inset on the left.

### Cards / Containers
- **Paper panel:** 8px corners, a Crema-to-Carta-Soft vertical gradient, Filetto border, Sheet shadow.
- **Night panel:** 8px corners, a navy diagonal gradient, a 14% cream hairline, Night lift shadow. Its title strip is a deeper navy band.
- **Internal padding:** 16px (20px from `md`).

### Lesson Row (signature)
The schedule line of the programme. The start time in Crimson title size with tabular figures, end time and duration (′) below it in Seppia; the student name in Nunito 600 with "instrument · con teacher" underneath; an Oswald status badge as a 10% tint plus hairline ring; actions on the right (shift select joined to "Posticipa", then a text "Annulla"). Cancelled rows strike through the time in Terracotta and mute to Seppia.

### Status Badges
- **Style:** Oswald capitals at 0.75rem, 4px corners, a 10% tint of the status color with an inset 1px ring at 35 to 40%.
- **Mapping:** Programmata uses Ardesia, Annullata Terracotta, Svolta Salvia, Spostata Inchiostro.

### Navigation
- **Style:** Oswald capitals at 0.875rem on a translucent navy track (4px padding, 6px corners).
- **States:** the active link has a Terracotta fill and Crema text. Inactive links are Sabbia-tinted, with a 30% Terracotta wash on hover. Upcoming sections sit after a hairline divider at 40% opacity, with an outlined "presto" tag.
- **Mobile:** the strip scrolls horizontally, edge to edge.

### Toasts
Top-right on desktop and full width on phones. A Carta panel with a 1px tone border, a colored 8px dot, an Oswald tone label (Fatto, Errore, Avviso), the message, and a close button. They enter with a 260ms rise-and-scale. Errors stay for 6s, everything else for 3.2s.

## Do's and Don'ts

### Do:
- **Do** keep Terracotta to one primary action per panel plus the active or "today" markers (The One Voice Rule).
- **Do** set every time, date range and count in tabular figures.
- **Do** group schedule data by day under Crimson day headings, with hairline-divided rows.
- **Do** use the `surface-paper` / `surface-dark` panels and the `btn-*` / `field-theme` classes rather than restyling controls ad hoc.
- **Do** write all UI copy in Italian with correct accents (Lunedì, Disponibilità, già).
- **Do** respect `prefers-reduced-motion`. Animations already collapse to 1ms globally.

### Don't:
- **Don't** add eyebrow or kicker labels above headings.
- **Don't** nest bordered cards inside cards. Use rules and tone inside a panel.
- **Don't** use pill-shaped buttons, glass or blur effects, gradient text, or a colored border-left above 1px.
- **Don't** introduce a second saturated accent color.
- **Don't** put Seppia or Filetto text on Blu Notte. Labels on navy use Sabbia.
- **Don't** add unlayered global CSS resets (`* { margin: 0; padding: 0 }`). In Tailwind v4 they override every spacing utility.
