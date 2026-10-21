import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { readFileSync } from "fs";
import { TextDecoder } from "util";

const prisma = new PrismaClient();

function parseCsv(input: string, delimiter = ";") {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function noteFromAddress(address: string) {
  return address ? `Importeret fra chauffoerark. Adresse: ${address}` : "Importeret fra chauffoerark.";
}

async function main() {
  const filePath = process.argv[2];
  const password = process.argv[3] ?? "Velkommen123!";

  if (!filePath) {
    throw new Error("Skriv sti til CSV-filen som argument.");
  }

  const rows = parseCsv(new TextDecoder("windows-1252").decode(readFileSync(filePath)));
  const headers = rows[0].map((header) => clean(header));
  const dataRows = rows.slice(1);
  const passwordHash = await hash(password, 12);

  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    invalid: [] as string[]
  };

  for (const row of dataRows) {
    const record = Object.fromEntries(headers.map((header, index) => [header, clean(row[index])]));
    const name = clean(record["Dit fulde navn"] || record["Navn"]);
    const email = normalizeEmail(record["Mailadresse"] || record["Mail"]);
    const phone = clean(record["Telefonnummer"]);
    const address = clean(record["Adresse"]);

    if (!name || !email || !email.includes("@")) {
      result.skipped += 1;
      result.invalid.push(`${name || "Ukendt"} <${email || "ingen email"}>`);
      continue;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { driverProfile: true, membership: true }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          membership: existingUser.membership ? undefined : { create: { status: "ACTIVE" } },
          driverProfile: existingUser.driverProfile
            ? {
                update: {
                  phone,
                  notes: noteFromAddress(address),
                  isActive: true
                }
              }
            : {
                create: {
                  phone,
                  notes: noteFromAddress(address),
                  isActive: true
                }
              }
        }
      });
      result.updated += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "DRIVER",
        membership: { create: { status: "ACTIVE" } },
        driverProfile: {
          create: {
            phone,
            notes: noteFromAddress(address),
            isActive: true
          }
        }
      }
    });
    result.created += 1;
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
