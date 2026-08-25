"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { eventSignupSchema } from "@/lib/validation";

export async function signupForEventAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const parsed = eventSignupSchema.safeParse(Object.fromEntries(formData));

  if (!user.citizenProfile) {
    redirect("/dashboard/citizen/events?error=Profilen%20kunne%20ikke%20findes.");
  }

  if (!parsed.success) {
    redirect(`/dashboard/citizen/events?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const event = await prisma.event.findUnique({
    where: { id: parsed.data.eventId },
    include: { signups: true }
  });

  if (!event || event.status !== "OPEN") {
    redirect("/dashboard/citizen/events?error=Begivenheden%20er%20ikke%20%C3%A5ben%20for%20tilmelding.");
  }

  const alreadySignedUp = event.signups.some((signup) => signup.citizenProfileId === user.citizenProfile?.id);
  if (alreadySignedUp) {
    redirect("/dashboard/citizen/events?error=Du%20er%20allerede%20tilmeldt.");
  }

  const takenSeats = event.signups.reduce((sum, signup) => sum + signup.passengers, 0);
  if (takenSeats + parsed.data.passengers > event.capacity) {
    redirect("/dashboard/citizen/events?error=Der%20er%20ikke%20plads%20til%20det%20antal%20passagerer.");
  }

  const signup = await prisma.eventSignup.create({
    data: {
      eventId: event.id,
      citizenProfileId: user.citizenProfile.id,
      pickupAddress: parsed.data.pickupAddress?.trim() || null,
      passengers: parsed.data.passengers,
      notes: parsed.data.notes?.trim() || null
    }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "EVENT_SIGNUP_CREATED",
    entityType: "EventSignup",
    entityId: signup.id,
    description: `${user.name} tilmeldte ${parsed.data.passengers} passager(er) til ${event.title}.`
  });

  if (event.driverProfileId) {
    const driver = await prisma.driverProfile.findUnique({
      where: { id: event.driverProfileId },
      select: { userId: true }
    });
    if (driver) {
      await createNotification({
        userId: driver.userId,
        title: "Ny passager på din fællestur",
        body: `${user.name} har tilmeldt ${parsed.data.passengers} passager(er) til ${event.title}.`,
        href: "/dashboard/driver#mine-ture",
        driverType: "RIDE_CHANGES"
      });
    }
  }

  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/");
  redirect("/dashboard/citizen/events?success=Du%20er%20tilmeldt%20ved%20opsamling.");
}

export async function cancelEventSignupAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const signupId = String(formData.get("signupId") ?? "");

  if (!user.citizenProfile || !signupId) {
    redirect("/dashboard/citizen/events?error=Tilmeldingen%20kunne%20ikke%20fjernes.");
  }

  const signup = await prisma.eventSignup.delete({
    where: {
      id: signupId,
      citizenProfileId: user.citizenProfile.id
    },
    include: { event: true }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "EVENT_SIGNUP_CANCELLED",
    entityType: "EventSignup",
    entityId: signup.id,
    description: `${user.name} frameldte sig ${signup.event.title}.`
  });

  if (signup.event.driverProfileId) {
    const driver = await prisma.driverProfile.findUnique({
      where: { id: signup.event.driverProfileId },
      select: { userId: true }
    });
    if (driver) {
      await createNotification({
        userId: driver.userId,
        title: "Framelding fra din fællestur",
        body: `${user.name} har frameldt sig ${signup.event.title}.`,
        href: "/dashboard/driver#mine-ture",
        driverType: "RIDE_CHANGES"
      });
    }
  }

  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/");
  redirect("/dashboard/citizen/events?success=Tilmeldingen%20er%20fjernet.");
}
