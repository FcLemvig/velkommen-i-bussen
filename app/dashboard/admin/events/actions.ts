"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { createNotification, createNotifications } from "@/lib/notifications";
import { prisma, scheduleTransaction } from "@/lib/prisma";
import { shiftsOverlap } from "@/lib/shifts";
import { eventSchema } from "@/lib/validation";

function dayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function eventHasConflict(data: {
  date: Date;
  bus: string;
  startTime: string;
  endTime: string;
  driverProfileId?: string;
  excludeEventId?: string;
  excludeRideRequestId?: string;
  skipBusConflicts?: boolean;
}) {
  const { start, end } = dayRange(data.date);
  const [bookings, shifts, events] = await Promise.all([
    prisma.busBooking.findMany({
      where: {
        bus: data.bus,
        bookingDate: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.driverShift.findMany({
      where: {
        bus: data.bus,
        shiftDate: { gte: start, lt: end },
      },
    }),
    prisma.event.findMany({
      where: {
        bus: data.bus,
        eventDate: { gte: start, lt: end },
        id: data.excludeEventId ? { not: data.excludeEventId } : undefined,
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  const busBusy =
    !data.skipBusConflicts &&
    [
      ...bookings.map((booking) => ({
        startTime: booking.startTime,
        endTime: booking.endTime,
      })),
      ...shifts
        .filter((shift) => shift.rideRequestId !== data.excludeRideRequestId)
        .map((shift) => ({
          startTime: shift.startTime,
          endTime: shift.endTime,
        })),
      ...events.map((event) => ({
        startTime: event.startTime,
        endTime: event.endTime,
      })),
    ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));

  if (busBusy) return "Bussen er allerede optaget i det tidsrum.";

  if (!data.driverProfileId) return null;

  const [driverBookings, driverShifts, driverEvents] = await Promise.all([
    prisma.busBooking.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        bookingDate: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.driverShift.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        shiftDate: { gte: start, lt: end },
      },
    }),
    prisma.event.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        eventDate: { gte: start, lt: end },
        id: data.excludeEventId ? { not: data.excludeEventId } : undefined,
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  const driverBusy = [
    ...driverBookings.map((booking) => ({
      startTime: booking.startTime,
      endTime: booking.endTime,
    })),
    ...driverShifts
      .filter((shift) => shift.rideRequestId !== data.excludeRideRequestId)
      .map((shift) => ({ startTime: shift.startTime, endTime: shift.endTime })),
    ...driverEvents.map((event) => ({
      startTime: event.startTime,
      endTime: event.endTime,
    })),
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));

  return driverBusy ? "Chaufføren er allerede optaget i det tidsrum." : null;
}

export async function createEventAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/admin/events?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const eventDate = new Date(`${parsed.data.date}T00:00:00Z`);
  if (Number.isNaN(eventDate.getTime())) {
    redirect("/dashboard/admin/events?error=Datoen%20er%20ikke%20gyldig.");
  }

  const { event } = await scheduleTransaction(async () => {
    if (parsed.data.driverProfileId) {
      const driverExists = await prisma.driverProfile.findFirst({
        where: { id: parsed.data.driverProfileId, isActive: true },
        select: { id: true },
      });

      if (!driverExists) {
        redirect("/dashboard/admin/events?error=Den%20valgte%20chauff%C3%B8r%20kunne%20ikke%20findes.");
      }
    }
    const conflict = await eventHasConflict({
      date: eventDate,
      bus: parsed.data.bus,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      driverProfileId: parsed.data.driverProfileId,
    });

    if (conflict) {
      redirect(`/dashboard/admin/events?error=${encodeURIComponent(conflict)}`);
    }

    let event;
    try {
      event = await prisma.event.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          location: parsed.data.location,
          eventDate,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          pickupInfo: parsed.data.pickupInfo?.trim() || null,
          capacity: parsed.data.capacity,
          bus: parsed.data.bus,
          driverProfileId: parsed.data.driverProfileId,
          status: parsed.data.status,
        },
        include: {
          driverProfile: { include: { user: true } },
        },
      });
    } catch (error) {
      console.error("[event create error]", error);
      redirect("/dashboard/admin/events?error=Begivenheden%20kunne%20ikke%20gemmes.%20Pr%C3%B8v%20igen.");
    }

    return { event };
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "EVENT_CREATED",
    entityType: "Event",
    entityId: event.id,
    description: `${admin.name} oprettede begivenheden ${event.title}.`,
  });

  if (event.driverProfile) {
    await createNotification({
      userId: event.driverProfile.userId,
      title: "Ny tildelt fællestur",
      body: `${event.title} den ${event.eventDate.toLocaleDateString("da-DK")} kl. ${event.startTime}.`,
      href: "/dashboard/driver#mine-ture",
      driverType: "ASSIGNED_RIDES",
    });
  }

  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/organization/buses");
  revalidatePath("/");
  redirect("/dashboard/admin/events?success=Begivenheden%20er%20oprettet.");
}

export async function updateEventStatusAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const eventId = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!eventId || !["OPEN", "CLOSED", "CANCELLED"].includes(status)) {
    redirect("/dashboard/admin/events?error=Status%20kunne%20ikke%20opdateres.");
  }

  const event = await scheduleTransaction(async () => {
    const existing = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        signups: { include: { citizenProfile: true } },
        driverProfile: true,
      },
    });
    if (!existing) redirect("/dashboard/admin/events?error=" + encodeURIComponent("Begivenheden findes ikke længere."));
    if (status !== "CANCELLED") {
      const conflict = await eventHasConflict({
        date: existing.eventDate,
        bus: existing.bus,
        startTime: existing.startTime,
        endTime: existing.endTime,
        driverProfileId: existing.driverProfileId ?? undefined,
        excludeEventId: existing.id,
        excludeRideRequestId: existing.sourceRideRequestId ?? undefined,
      });
      if (conflict) redirect("/dashboard/admin/events?error=" + encodeURIComponent(conflict));
      if (existing.sourceRideRequestId) {
        const ride = await prisma.rideRequest.findUnique({
          where: { id: existing.sourceRideRequestId },
        });
        if (!ride || ["CANCELLED", "COMPLETED"].includes(ride.status))
          redirect("/dashboard/admin/events?error=" + encodeURIComponent("Den tilknyttede tur er afsluttet."));
      }
    }
    await prisma.event.update({ where: { id: eventId }, data: { status } });
    return existing;
  });
  const recipients = new Set(event.signups.map((signup) => signup.citizenProfile.userId));
  if (event.driverProfile) recipients.add(event.driverProfile.userId);
  await createNotifications(
    [...recipients].map((userId) => ({
      userId,
      title: status === "CANCELLED" ? "Fællesturen er aflyst" : "Fællesturen er opdateret",
      body: event.title + ": Se den nye status i appen.",
      href: "/dashboard/notifications",
    })),
  );
  revalidatePath("/dashboard/driver");
  revalidatePath("/");

  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/organization/buses");
  redirect("/dashboard/admin/events?success=Status%20er%20opdateret.");
}

export async function updateEventAction(eventId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/admin/events/${eventId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const { event, existingEvent } = await scheduleTransaction(async () => {
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        signups: { include: { citizenProfile: { include: { user: true } } } },
        driverProfile: { include: { user: true } },
      },
    });

    if (!existingEvent) {
      redirect("/dashboard/admin/events?error=Begivenheden%20kunne%20ikke%20findes.");
    }

    const eventDate = new Date(`${parsed.data.date}T00:00:00Z`);
    if (Number.isNaN(eventDate.getTime())) {
      redirect(`/dashboard/admin/events/${eventId}?error=Datoen%20er%20ikke%20gyldig.`);
    }

    if (existingEvent.sourceRideRequestId)
      redirect(
        "/dashboard/admin/rides/" +
          existingEvent.sourceRideRequestId +
          "?error=" +
          encodeURIComponent("Redigér den tilknyttede tur, så pladser, bus og tidspunkt følges ad."),
      );

    const takenSeats = existingEvent.signups.reduce((sum, signup) => sum + signup.passengers, 0);
    if (parsed.data.capacity < takenSeats) {
      redirect(
        `/dashboard/admin/events/${eventId}?error=${encodeURIComponent(`Der er allerede tilmeldt ${takenSeats} passagerer. Antallet af pladser kan ikke sættes lavere.`)}`,
      );
    }

    if (parsed.data.driverProfileId) {
      const driverExists = await prisma.driverProfile.findFirst({
        where: { id: parsed.data.driverProfileId, isActive: true },
        select: { id: true },
      });

      if (!driverExists) {
        redirect(`/dashboard/admin/events/${eventId}?error=Den%20valgte%20chauff%C3%B8r%20kunne%20ikke%20findes.`);
      }
    }

    if (parsed.data.status !== "CANCELLED") {
      const conflict = await eventHasConflict({
        date: eventDate,
        bus: parsed.data.bus,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        driverProfileId: parsed.data.driverProfileId,
        excludeEventId: eventId,
        excludeRideRequestId: existingEvent.sourceRideRequestId ?? undefined,
        skipBusConflicts: false,
      });

      if (conflict) {
        redirect(`/dashboard/admin/events/${eventId}?error=${encodeURIComponent(conflict)}`);
      }
    }

    const event = await scheduleTransaction(() =>
      prisma.event.update({
        where: { id: eventId },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          location: parsed.data.location,
          eventDate,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          pickupInfo: parsed.data.pickupInfo?.trim() || null,
          capacity: parsed.data.capacity,
          bus: parsed.data.bus,
          driverProfileId: parsed.data.driverProfileId || null,
          status: parsed.data.status,
        },
      }),
    );

    return { event, existingEvent };
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "EVENT_UPDATED",
    entityType: "Event",
    entityId: event.id,
    description: `${admin.name} redigerede begivenheden ${event.title} den ${event.eventDate.toLocaleDateString("da-DK")} kl. ${event.startTime}-${event.endTime}.`,
  });

  await createNotifications(
    existingEvent.signups.map((signup) => ({
      userId: signup.citizenProfile.userId,
      title: "En begivenhed er ændret",
      body: `${event.title} afholdes den ${event.eventDate.toLocaleDateString("da-DK")} kl. ${event.startTime}. Se de opdaterede oplysninger i appen.`,
      href: "/dashboard/citizen/events",
    })),
  );

  if (parsed.data.driverProfileId && parsed.data.driverProfileId !== existingEvent.driverProfileId) {
    const newDriver = await prisma.driverProfile.findUnique({
      where: { id: parsed.data.driverProfileId },
      select: { userId: true },
    });
    if (newDriver) {
      await createNotification({
        userId: newDriver.userId,
        title: "Ny tildelt fællestur",
        body: `${event.title} den ${event.eventDate.toLocaleDateString("da-DK")} kl. ${event.startTime}.`,
        href: "/dashboard/driver#mine-ture",
        driverType: "ASSIGNED_RIDES",
      });
    }
  }

  if (existingEvent.driverProfile && existingEvent.driverProfileId !== parsed.data.driverProfileId) {
    await createNotification({
      userId: existingEvent.driverProfile.userId,
      title: "Din fællestur er ændret",
      body: `Du er ikke længere tilknyttet ${existingEvent.title}.`,
      href: "/dashboard/driver#mine-ture",
      driverType: "RIDE_CHANGES",
    });
  }

  revalidateEventPaths();
  redirect("/dashboard/admin/events?success=Begivenheden%20er%20opdateret.");
}

export async function deleteEventAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const eventId = String(formData.get("eventId") ?? "");

  if (!eventId) {
    redirect("/dashboard/admin/events?error=Begivenheden%20kunne%20ikke%20slettes.");
  }

  const { event } = await scheduleTransaction(async () => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        signups: { include: { citizenProfile: { include: { user: true } } } },
        driverProfile: { include: { user: true } },
      },
    });

    if (!event) {
      redirect("/dashboard/admin/events?error=Begivenheden%20kunne%20ikke%20findes.");
    }

    await scheduleTransaction(() => prisma.event.delete({ where: { id: event.id } }));

    return { event };
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "EVENT_DELETED",
    entityType: "Event",
    entityId: event.id,
    description: `${admin.name} slettede begivenheden ${event.title} den ${event.eventDate.toLocaleDateString("da-DK")}. ${event.signups.length} tilmelding(er) blev fjernet.`,
  });

  await createNotifications(
    event.signups.map((signup) => ({
      userId: signup.citizenProfile.userId,
      title: "En begivenhed er slettet",
      body: `${event.title} den ${event.eventDate.toLocaleDateString("da-DK")} er slettet, og din tilmelding er fjernet.`,
      href: "/dashboard/citizen/events",
    })),
  );

  if (event.driverProfile) {
    await createNotification({
      userId: event.driverProfile.userId,
      title: "En fællestur er slettet",
      body: `${event.title} den ${event.eventDate.toLocaleDateString("da-DK")} er slettet.`,
      href: "/dashboard/driver#mine-ture",
      driverType: "RIDE_CHANGES",
    });
  }

  revalidateEventPaths();
  redirect("/dashboard/admin/events?success=Begivenheden%20er%20slettet.");
}

function revalidateEventPaths() {
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/organization/buses");
  revalidatePath("/");
}

export async function deleteEventSignupAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const signupId = String(formData.get("signupId") ?? "");

  if (!signupId) {
    redirect("/dashboard/admin/events?error=Tilmeldingen%20kunne%20ikke%20fjernes.");
  }

  await scheduleTransaction(() => prisma.eventSignup.delete({ where: { id: signupId } }));
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  redirect("/dashboard/admin/events?success=Tilmeldingen%20er%20fjernet.");
}
