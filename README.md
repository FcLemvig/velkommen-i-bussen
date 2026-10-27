# Velkommen i Bussen

MVP webapp til en dansk frivillig busordning. Appen er bygget med Next.js App Router, TypeScript, Tailwind CSS, Prisma og PostgreSQL.

## Funktioner

- Offentlig landingsside på dansk
- Login og oprettelse af profil
- Rollebaseret adgang for borger, chauffør og admin
- Borger kan oprette og slette egne kørselsanmodninger
- Samtykkefelter ved kørsel med børn og unge
- Admin kan se alle anmodninger, filtrere på status, oprette/redigere chauffører, tildele chauffør og ændre status
- Admin kan oprette og redigere 2-timers vagter
- Chauffører kan tage ledige vagter og se tildelte ture
- Vagter matcher automatisk ikke-tildelte ture i samme dato og tidsrum
- Chauffører kan uploade profilbillede, som borgeren kan se
- Emailnotifikationer ved ny tur, tildeling og statusændring

## Lokal opsætning med PostgreSQL

1. Installer afhængigheder:

```bash
pnpm install
```

2. Opret `.env` fra eksemplet:

```bash
cp .env.example .env
```

3. Sæt `DATABASE_URL` i `.env` til en PostgreSQL database.

4. Kør migrationer:

```bash
pnpm prisma migrate deploy
```

5. Indlæs testdata:

```bash
pnpm prisma:seed
```

6. Start appen:

```bash
pnpm dev
```

Åbn derefter `http://localhost:3000`.

## Testbrugere

Alle seedede brugere har adgangskoden:

```text
Velkommen123!
```

- Admin: `admin@vib.dk`
- Borger: `kirsten@example.dk`
- Borger: `poul@example.dk`
- Chauffør: `lars@example.dk`
- Chauffør: `mette@example.dk`

## Testproduktion på Vercel + Neon

1. Opret en PostgreSQL database hos Neon.
2. Kopiér Neon connection string.
3. Opret et projekt på Vercel fra GitHub-repositoriet.
4. Tilføj miljøvariabler i Vercel:

```text
DATABASE_URL=<Neon connection string>
SESSION_SECRET=<lang tilfældig tekst>
NEXT_PUBLIC_APP_URL=<appens offentlige URL>
ADMIN_NOTIFICATION_EMAIL=<email til koordinator/admin>
EMAIL_FROM=<afsender, fx Velkommen i Bussen <mail@ditdomæne.dk>>
RESEND_API_KEY=<API-nøgle fra Resend>
```

5. Deploy appen.
6. Kør migrationer mod Neon databasen:

```bash
pnpm prisma migrate deploy
```

7. Kør eventuelt seed-data mod testdatabasen:

```bash
pnpm prisma:seed
```

## Emailnotifikationer

Email sendes via Resend, når `RESEND_API_KEY` er sat. Uden nøglen springes mails over, så appen stadig virker.

Appen sender email ved:

- Ny kørselsanmodning til admin/koordinator
- Tildeling af chauffør til borger og chauffør
- Statusændring til borger
- Gennemført tur til borger

## Kontrol og rettelser fra oktober 2026

Kør `pnpm test`, `pnpm lint`, `pnpm typecheck` og `pnpm build` før udgivelse.
Testene bruger en isoleret PGlite-database og testdata; de tilgår ikke `DATABASE_URL`.
Bookinghandlinger bruger en fælles PostgreSQL-transaktionslås, så kontrol og skrivning
udføres på samme forbindelse. Beskeder sendes efter transaktionen er gemt.

### Adresseopslag

DAWA er erstattet af den officielle Adressevælger. Appen bruger som standard det
fælles token adressevaelger123, som Klimadatastyrelsen anbefaler pr. 21. oktober 2026.
Der kræves endnu ingen personlig nøgle: https://confluence.kds.dk/display/ADV/Brugerstyring
Når personlig brugerstyring indføres, kan tokenet erstattes via servervariablen
ADDRESS_LOOKUP_TOKEN. Ved nedbrud kan brugeren stadig indtaste adressen manuelt.
Fritekst er fortsat tilladt til opsamlingssteder.

### Database og udgivelse

Migrationen `20260801000000_restore_missing_tables` genskaber manglende historiske
definitioner og er bevidst placeret før de migrationer, der henviser til tabellerne.
Den kan også køres på en eksisterende database, hvor tabellerne allerede findes;
den sletter ingen data. `20261021090000_complete_indexes` tilføjer manglende indeks.
Eksisterende migrationsfiler er ikke ændret.

Tag en databasebackup og kontrollér `pnpm exec prisma migrate status` i det valgte
driftsmiljø. Kør derefter `pnpm exec prisma migrate deploy` som led i udgivelsen.
Den lokale gennemgang har ikke kørt migrationer mod driftsdatabasen eller udgivet appen.
Kontrollér tidligere gemte kalenderdatoer ved udgivelse: nye datoer gemmes konsekvent
som UTC-midnat, mens dagens dato bestemmes i Europe/Copenhagen. Gamle datoer ændres
ikke automatisk, da deres oprindelige tidszone først skal fastslås.

### Eksterne tjenester

Buskalenderen og ledighedskontrollen bruger udelukkende appens egne bookinger,
vagter og begivenheder. Reservationer i andre systemer skal oprettes i appen
for at blokere tidsrummet.

Mail kræver `RESEND_API_KEY`, `EMAIL_FROM` og `ADMIN_NOTIFICATION_EMAIL`.
Push kræver både `NEXT_PUBLIC_VAPID_PUBLIC_KEY` og `VAPID_PRIVATE_KEY` fra samme
nøglepar. Uden pushopsætning vises ingen aktiv tilmeldingsknap.

## Øvrige produktionsnoter

- Sessioner gemmes i databasen med hash af session-token og HTTP-only cookie.
- Sessionsikkerheden bygger på tilfældige tokens, som kun gemmes som hash. `SESSION_SECRET` bruges ikke af den nuværende sessionskode.
- Brug Neon/Vercel backup og adgangsstyring, før rigtige borgere inviteres.
- Appen behandler persondata som navn, adresse, telefon, turformål og samtykkeoplysninger. Afklar GDPR, sletning og adgangsrettigheder før offentlig drift.
