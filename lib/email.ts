import { RideStatus } from "@/lib/domain";
import { rideStatusLabels } from "@/lib/labels";

type EmailRecipient = {
  email: string;
  name?: string | null;
};

type RideEmailData = {
  citizenName: string;
  pickupAddress: string;
  destinationAddress: string;
  rideDate: Date;
  rideTime: string;
  passengers: number;
  purpose: string;
  notes?: string | null;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://velkommen-i-bussen.vercel.app";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
const fromEmail = process.env.EMAIL_FROM || "Velkommen i Bussen <onboarding@resend.dev>";

function formatRideDate(date: Date) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function rideSummary(ride: RideEmailData) {
  const lines = [
    `Borger: ${ride.citizenName}`,
    `Dato: ${formatRideDate(ride.rideDate)} kl. ${ride.rideTime}`,
    `Fra: ${ride.pickupAddress}`,
    `Til: ${ride.destinationAddress}`,
    `Passagerer: ${ride.passengers}`,
    `Form\u00e5l: ${ride.purpose}`
  ];

  if (ride.notes) {
    lines.push(`Note: ${ride.notes}`);
  }

  return lines.join("\n");
}

async function sendEmail(to: EmailRecipient, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(`[email skipped] ${subject} -> ${to.email}`);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to.email],
      subject,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email failed] ${response.status} ${body}`);
    return false;
  }

  return true;
}

async function safelySendEmail(to: EmailRecipient | null | undefined, subject: string, text: string) {
  if (!to?.email) return false;

  try {
    return await sendEmail(to, subject, text);
  } catch (error) {
    console.error("[email error]", error);
    return false;
  }
}

export async function sendDriverWelcomeEmail(to: EmailRecipient, setupToken?: string) {
  const loginUrl = `${appUrl}/login`;
  const notificationsUrl = `${appUrl}/dashboard/notifications`;
  const accessSection = setupToken
    ? `Vælg først din egen adgangskode her:\n${appUrl}/reset-password?token=${encodeURIComponent(setupToken)}\n\nLinket virker i 7 dage og kan kun bruges én gang.`
    : `Du har allerede en profil i appen. Brug din nuværende email og adgangskode til at logge ind:\n${loginUrl}`;

  return safelySendEmail(
    to,
    "Velkommen som frivillig chauffør",
    `Hej ${to.name || "chauffør"}\n\nDu er nu oprettet som frivillig chauffør i Velkommen i Bussen.\n\n${accessSection}\n\nSådan kommer du i gang:\n1. Log ind på ${loginUrl}\n2. Åbn Chauffør fra Min side.\n3. Under Ledige vagter kan du læse om en kørsel og tage den.\n4. Dine vagter og tildelte ture vises på chaufførsiden. Her kan du også skrive med borgeren og markere turen som gennemført.\n\nGem appen på mobilen:\nAndroid: Åbn siden i Chrome, tryk på menuen med tre prikker, og vælg Installer app eller Føj til startskærm.\niPhone: Åbn siden i Safari, tryk på Del, vælg Føj til hjemmeskærm, og tryk Tilføj.\n\nNotifikationer:\nÅbn ${notificationsUrl} efter login, tryk Slå push til, og tillad notifikationer. Du kan vælge beskeder om nye vagter, tildelte ture samt ændringer og aflysninger.\n\nHar du brug for hjælp, kan du kontakte Velkommen i Bussen.\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function sendOrganizationWelcomeEmail(to: EmailRecipient, setupToken: string) {
  const loginUrl = `${appUrl}/login`;
  const setupUrl = `${appUrl}/reset-password?token=${encodeURIComponent(setupToken)}`;

  return safelySendEmail(
    to,
    "Velkommen til Velkommen i Bussen",
    `Hej ${to.name || "forening/institution"}\n\nJeres profil er nu oprettet i Velkommen i Bussen.\n\nVælg først en adgangskode her:\n${setupUrl}\n\nLinket virker i 7 dage og kan kun bruges én gang.\n\nNår adgangskoden er valgt, kan I logge ind på:\n${loginUrl}\n\nI appen kan I se buskalenderen, booke en ledig bus og tilknytte en frivillig chauffør. Jeres bookinger samles på foreningssiden.\n\nHar I brug for hjælp, kan I kontakte Velkommen i Bussen.\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function notifyAdminAboutNewRide(ride: RideEmailData) {
  await safelySendEmail(
    adminEmail ? { email: adminEmail, name: "Velkommen i Bussen" } : null,
    "Ny k\u00f8rselsanmodning",
    `Der er kommet en ny k\u00f8rselsanmodning.\n\n${rideSummary(ride)}\n\nSe den i admin:\n${appUrl}/dashboard/admin`
  );
}

export async function notifyCitizenAboutAssignment(
  citizen: EmailRecipient,
  ride: RideEmailData,
  driver: EmailRecipient
) {
  await safelySendEmail(
    citizen,
    "Din tur er tildelt",
    `Hej ${citizen.name || ride.citizenName}\n\nDin tur er nu tildelt til ${driver.name || "en chauff\u00f8r"}.\n\n${rideSummary(ride)}\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function notifyDriverAboutAssignment(
  driver: EmailRecipient,
  ride: RideEmailData
) {
  await safelySendEmail(
    driver,
    "Du har f\u00e5et tildelt en tur",
    `Hej ${driver.name || "chauff\u00f8r"}\n\nDu har f\u00e5et tildelt en tur.\n\n${rideSummary(ride)}\n\nSe dine ture her:\n${appUrl}/dashboard/driver`
  );
}

export async function notifyCitizenAboutStatus(
  citizen: EmailRecipient,
  ride: RideEmailData,
  status: RideStatus
) {
  await safelySendEmail(
    citizen,
    `Status p\u00e5 din tur: ${rideStatusLabels[status]}`,
    `Hej ${citizen.name || ride.citizenName}\n\nStatus p\u00e5 din tur er \u00e6ndret til: ${rideStatusLabels[status]}.\n\n${rideSummary(ride)}\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function notifyCitizenAboutDriverMessage(
  citizen: EmailRecipient,
  ride: RideEmailData,
  driver: EmailRecipient,
  message: string
) {
  await safelySendEmail(
    citizen,
    "Besked fra din chauff\u00f8r",
    `Hej ${citizen.name || ride.citizenName}\n\n${driver.name || "Din chauff\u00f8r"} har sendt en besked om din tur:\n\n${message}\n\n${rideSummary(ride)}\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function notifyDriverAboutCitizenMessage(
  driver: EmailRecipient,
  ride: RideEmailData,
  citizen: EmailRecipient,
  message: string
) {
  await safelySendEmail(
    driver,
    "Svar fra borger",
    `Hej ${driver.name || "chauff\u00f8r"}\n\n${citizen.name || ride.citizenName} har sendt et svar om turen:\n\n${message}\n\n${rideSummary(ride)}\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}

export async function sendPasswordResetEmail(to: EmailRecipient, token: string) {
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await safelySendEmail(
    to,
    "Vælg en ny adgangskode",
    `Hej ${to.name || ""}\n\nVi har modtaget en anmodning om at vælge en ny adgangskode til din profil i Velkommen i Bussen.\n\nVælg en ny adgangskode her:\n${resetUrl}\n\nLinket virker i 1 time og kan kun bruges én gang. Hvis du ikke har bedt om dette, kan du blot se bort fra mailen.\n\nVenlig hilsen\nVelkommen i Bussen`
  );
}
