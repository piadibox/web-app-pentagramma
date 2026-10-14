# Pentagramma

Gestionale per una scuola di musica "con anima jazz": un'unica vista settimanale delle lezioni di strumento, costruita sulle disponibilità dichiarate da ogni docente. Le lezioni non si possono prenotare fuori dall'orario di un docente né sovrapporre a un'altra lezione dello stesso docente o studente: i conflitti vengono bloccati sia nell'interfaccia sia sul server.

È una PWA installabile, pensata per essere usata tanto dalla scrivania della segreteria quanto dal telefono di un docente tra una lezione e l'altra.

## Funzionalità

- **Accesso** con username e password; sessione JWT in un cookie `httpOnly`.
- **Tre ruoli**: `ADMIN` (segreteria/direzione), `TEACHER` (docenti), `STUDENT` (studenti e famiglie).
- **Lezioni**: elenco settimanale (lunedì–domenica) con filtri per docente, studente, strumento e testo libero.
- **Creazione lezioni** solo dentro gli slot di disponibilità del docente, con durate di 30, 45, 60, 90 o 120 minuti.
- **Rinvio** di 15, 30, 60 o 90 minuti e **annullamento** (lo stato passa ad `Annullata`, la lezione resta in archivio).
- **Disponibilità docenti**: fasce orarie settimanali ricorrenti, gestite dai docenti stessi o dalla segreteria.

Stati di una lezione: Programmata, Annullata, Svolta, Spostata.

### In arrivo

Eventi e news, Iscrizioni e Contatti compaiono già nella navigazione con l'etichetta "presto".

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) e React 19
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Prisma](https://www.prisma.io/) 6 con PostgreSQL (ospitato su [Supabase](https://supabase.com/))
- [jose](https://github.com/panva/jose) per i JWT, bcrypt per gli hash delle password

## Avvio in locale

Servono Node.js 20 o superiore e un database PostgreSQL (va bene un progetto Supabase).

1. Installa le dipendenze e genera il client Prisma (`npm install` da solo non lo genera):

   ```bash
   npm install
   npx prisma generate
   ```

2. Crea un file `.env` nella radice del progetto (è escluso da git):

   ```env
   DATABASE_URL="postgresql://utente:password@host:5432/postgres"
   JWT_SECRET="una-stringa-lunga-e-casuale"
   APP_URL="http://localhost:3000"
   ```

   Se `JWT_SECRET` manca, l'app ripiega su un segreto di sviluppo: impostalo sempre in produzione.

3. Crea le tabelle e carica i dati di prova:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   Il seed crea tre utenti, tutti con password `password123`: `admin`, `teacher1` e `student1`.

4. Avvia il server di sviluppo e apri <http://localhost:3000>:

   ```bash
   npm run dev
   ```

## Script

| Comando               | Cosa fa                                                   |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Server di sviluppo                                        |
| `npm run build`       | Build di produzione                                       |
| `npm run start`       | Avvia la build di produzione                              |
| `npm run db:push`     | Allinea il database allo schema Prisma e rigenera il client |
| `npm run db:seed`     | Inserisce gli utenti di prova                             |
| `npm run db:studio`   | Apre Prisma Studio per consultare i dati                  |
| `npm run db:validate` | Valida `prisma/schema.prisma`                             |

## Struttura

```
prisma/
  schema.prisma        modello dati (utenti, strumenti, disponibilità, lezioni)
  seed.ts              utenti di prova
src/
  app/
    api/               route handler (auth, lessons, availability, lookups)
    lessons/           vista settimanale delle lezioni
    availability/      gestione delle disponibilità
    login/             pagina di accesso
  lib/                 auth e client Prisma
  middleware.ts        protezione delle pagine riservate
public/                icone e risorse della PWA
```

## Problemi noti

- Gli orari scelti nel modulo di creazione vengono salvati come ore UTC, quindi appaiono spostati rispetto all'ora italiana.
- Non c'è ancora una suite di test automatici.

## Licenza

© 2026 Francesco Di Iorio. Tutti i diritti riservati.

Il codice è pubblicato solo per essere consultato. Non è consentito copiarlo, modificarlo, distribuirlo o usarlo senza un permesso scritto dell'autore. Vedi [LICENSE](LICENSE).
