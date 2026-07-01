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

## Produktionsnoter

- Sessioner gemmes i databasen med hash af session-token og HTTP-only cookie.
- `SESSION_SECRET` skal være en lang tilfældig værdi i produktion.
- Brug Neon/Vercel backup og adgangsstyring, før rigtige borgere inviteres.
- Appen behandler persondata som navn, adresse, telefon, turformål og samtykkeoplysninger. Afklar GDPR, sletning og adgangsrettigheder før offentlig drift.
