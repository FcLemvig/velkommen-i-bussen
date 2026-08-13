"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shiftsOverlap } from "@/lib/shifts";
import { getSuperSaaSBookings } from "@/lib/supersaas-calendar";
import { eventSchema } from "@/lib/validation";

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function eventHasConflict(data: {
  date: Date;
  bus: string;
  startTime: string;
  endTime: string;
  driverProfileId?: string;
}) {
  const { start, end } = dayRange(data.date);
  const [bookings, shifts, events, supersaasBookings] = await Promise.all([
    prisma.busBooking.findMany({
      where: {
        bus: data.bus,
        bookingDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    }),
    prisma.driverShift.findMany({
      where: {
        bus: data.bus,
        shiftDate: { gte: start, lt: end }
      }
    }),
    prisma.event.findMany({
      where: {
        bus: data.bus,
        eventDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    }),
    getSuperSaaSBookings(start, end)
  ]);

  const busBusy = [
    ...bookings.map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime })),
    ...shifts.map((shift) => ({ startTime: shift.startTime, endTime: shift.endTime })),
    ...events.map((event) => ({ startTime: event.startTime, endTime: event.endTime })),
    ...supersaasBookings.filter((booking) => booking.bus === data.bus).map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime }))
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));

  if (busBusy) return "Bussen er allerede optaget i det tidsrum.";

  if (!data.driverProfileId) return null;

  const [driverBookings, driverShifts, driverEvents] = await Promise.all([
    prisma.busBooking.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        bookingDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    }),
    prisma.driverShift.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        shiftDate: { gte: start, lt: end }
      }
    }),
    prisma.event.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        eventDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    })
  ]);

  const driverBusy = [
    ...driverBookings.map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime })),
    ...driverShifts.map((shift) => ({ startTime: shift.startTime, endTime: shift.endTime })),
    ...driverEvents.map((event) => ({ startTime: event.startTime, endTime: event.endTime }))
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));

  return driverBusy ? "Chauffoeren er allerede optaget i det tidsrum." : null;
}

export async function createEventAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/admin/events?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const eventDate = new Date(`${parsed.data.date}T00:00:00`);
  const conflict = await eventHasConflict({
    date: eventDate,
    bus: parsed.data.bus,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    driverProfileId: parsed.data.driverProfileId
  });

  if (conflict) {
    redirect(`/dashboard/admin/events?error=${encodeURIComponent(conflict)}`);
  }

  await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      eventDate,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      pickupInfo: parsed.data.pickupInfo,
      capacity: parsed.data.capacity,
      bus: parsed.data.bus,
      driverProfileId: parsed.data.driverProfileId,
      status: parsed.data.status
    }
  });

  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/organization/buses");
  redirect("/dashboard/admin/events?success=Begivenheden%20er%20oprettet.");
}

export async function updateEventStatusAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const eventId = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!eventId || !["OPEN", "CLOSED", "CANCELLED"].includes(status)) {
    redirect("/dashboard/admin/events?error=Status%20kunne%20ikke%20opdateres.");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status }
  });

  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/organization/buses");
  redirect("/dashboard/admin/events?success=Status%20er%20opdateret.");
}

export async function deleteEventSignupAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const signupId = String(formData.get("signupId") ?? "");

  if (!signupId) {
    redirect("/dashboard/admin/events?error=Tilmeldingen%20kunne%20ikke%20fjernes.");
  }

  await prisma.eventSignup.delete({ where: { id: signupId } });
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  redirect("/dashboard/admin/events?success=Tilmeldingen%20er%20fjernet.");
}
