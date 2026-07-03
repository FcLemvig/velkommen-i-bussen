"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shiftsOverlap } from "@/lib/shifts";
import { organizationBookingSchema } from "@/lib/validation";

async function busIsBooked(data: {
  bus: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const bookingDate = new Date(`${data.date}T00:00:00`);
  const [shifts, bookings] = await Promise.all([
    prisma.driverShift.findMany({
      where: {
        bus: data.bus,
        shiftDate: bookingDate
      }
    }),
    prisma.busBooking.findMany({
      where: {
        bus: data.bus,
        bookingDate,
        status: { not: "CANCELLED" }
      }
    })
  ]);

  return (
    shifts.some((shift) => shiftsOverlap(data.startTime, data.endTime, shift.startTime, shift.endTime)) ||
    bookings.some((booking) => shiftsOverlap(data.startTime, data.endTime, booking.startTime, booking.endTime))
  );
}

async function driverIsBooked(data: {
  driverProfileId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const bookingDate = new Date(`${data.date}T00:00:00`);
  const [shifts, bookings] = await Promise.all([
    prisma.driverShift.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        shiftDate: bookingDate
      }
    }),
    prisma.busBooking.findMany({
      where: {
        driverProfileId: data.driverProfileId,
        bookingDate,
        status: { not: "CANCELLED" }
      }
    })
  ]);

  return (
    shifts.some((shift) => shiftsOverlap(data.startTime, data.endTime, shift.startTime, shift.endTime)) ||
    bookings.some((booking) => shiftsOverlap(data.startTime, data.endTime, booking.startTime, booking.endTime))
  );
}

export async function createOrganizationBookingAction(formData: FormData) {
  const user = await requireUser(["ORGANIZATION"]);

  if (!user.organizationProfile) {
    redirect("/dashboard/organization?error=Foreningsprofilen%20mangler.");
  }

  const parsed = organizationBookingSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/organization?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const driver = await prisma.driverProfile.findFirst({
    where: {
      id: parsed.data.driverProfileId,
      isActive: true
    }
  });

  if (!driver) {
    redirect("/dashboard/organization?error=V%C3%A6lg%20en%20aktiv%20frivillig%20chauff%C3%B8r.");
  }

  if (await busIsBooked(parsed.data)) {
    redirect("/dashboard/organization?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.");
  }

  if (await driverIsBooked(parsed.data)) {
    redirect("/dashboard/organization?error=Chauff%C3%B8ren%20er%20allerede%20optaget%20i%20det%20tidsrum.");
  }

  await prisma.busBooking.create({
    data: {
      organizationProfileId: user.organizationProfile.id,
      driverProfileId: parsed.data.driverProfileId,
      bus: parsed.data.bus,
      bookingDate: new Date(`${parsed.data.date}T00:00:00`),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      purpose: parsed.data.purpose,
      notes: parsed.data.notes
    }
  });

  revalidatePath("/dashboard/organization");
  revalidatePath("/dashboard/admin/buses");
  redirect("/dashboard/organization?success=Bookingen%20er%20oprettet.");
}

export async function cancelOrganizationBookingAction(formData: FormData) {
  const user = await requireUser(["ORGANIZATION"]);
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!user.organizationProfile || !bookingId) {
    redirect("/dashboard/organization?error=Bookingen%20kunne%20ikke%20annulleres.");
  }

  const booking = await prisma.busBooking.findFirst({
    where: {
      id: bookingId,
      organizationProfileId: user.organizationProfile.id
    }
  });

  if (!booking) {
    redirect("/dashboard/organization?error=Du%20kan%20kun%20annullere%20dine%20egne%20bookinger.");
  }

  await prisma.busBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" }
  });

  revalidatePath("/dashboard/organization");
  revalidatePath("/dashboard/admin/buses");
  redirect("/dashboard/organization?success=Bookingen%20er%20annulleret.");
}
