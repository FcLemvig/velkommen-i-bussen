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
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to.name ? `${to.name} <${to.email}>` : to.email],
      subject,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email failed] ${response.status} ${body}`);
  }
}

async function safelySendEmail(to: EmailRecipient | null | undefined, subject: string, text: string) {
  if (!to?.email) return;

  try {
    await sendEmail(to, subject, text);
  } catch (error) {
    console.error("[email error]", error);
  }
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
