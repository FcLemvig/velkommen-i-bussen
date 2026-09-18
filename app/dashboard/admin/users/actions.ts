"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function redirectToUsers(messageType: "error" | "success", message: string): never {
  redirect(`/dashboard/admin/users?${messageType}=${encodeURIComponent(message)}`);
}

async function getUserForAccess(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      citizenProfile: true,
      driverProfile: true,
      organizationProfile: true,
      membership: true
    }
  });
}

export async function addCitizenAccessToUserAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const phone = String(formData.get("citizenPhone") ?? "").trim();
  const address = String(formData.get("citizenAddress") ?? "").trim();
  const membershipType = String(formData.get("membershipType") ?? "INDIVIDUAL");

  if (!userId || phone.length < 8 || address.length < 3 || !["INDIVIDUAL", "FAMILY"].includes(membershipType)) {
    redirectToUsers("error", "Udfyld telefon, adresse og medlemskabstype for borgeradgang.");
  }

  const user = await getUserForAccess(userId);

  if (!user || user.citizenProfile) {
    redirectToUsers("error", "Borgeradgangen kunne ikke tilføjes.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.citizenProfile.create({
      data: { userId: user.id, phone, address }
    });

    if (!user.membership) {
      await tx.membership.create({
        data: { userId: user.id, type: membershipType, status: "PENDING_PAYMENT" }
      });
    }
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/citizens");
  redirectToUsers("success", "Borgeradgang er tilføjet til brugeren.");
}

export async function addDriverAccessToUserAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const phone = String(formData.get("driverPhone") ?? "").trim();
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const notes = String(formData.get("driverNotes") ?? "").trim();

  if (!userId) {
    redirectToUsers("error", "Brugeren mangler.");
  }

  const user = await getUserForAccess(userId);

  if (!user || user.driverProfile) {
    redirectToUsers("error", "Chaufføradgangen kunne ikke tilføjes.");
  }

  await prisma.driverProfile.create({
    data: {
      userId: user.id,
      phone: phone || user.citizenProfile?.phone || user.organizationProfile?.phone || null,
      licenseNumber: licenseNumber || null,
      notes: notes || null,
      isActive: true
    }
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/drivers");
  redirectToUsers("success", "Chaufføradgang er tilføjet til brugeren.");
}

export async function addOrganizationAccessToUserAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("organizationName") ?? "").trim();
  const phone = String(formData.get("organizationPhone") ?? "").trim();
  const address = String(formData.get("organizationAddress") ?? "").trim();

  if (!userId || name.length < 2 || phone.length < 8 || address.length < 3) {
    redirectToUsers("error", "Udfyld foreningsnavn, telefon og adresse.");
  }

  const user = await getUserForAccess(userId);

  if (!user || user.organizationProfile) {
    redirectToUsers("error", "Foreningsadgangen kunne ikke tilføjes.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizationProfile.create({
      data: { userId: user.id, name, phone, address }
    });

    if (!user.membership) {
      await tx.membership.create({
        data: { userId: user.id, type: "ORGANIZATION", status: "PENDING_PAYMENT" }
      });
    }
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/organizations");
  redirectToUsers("success", "Foreningsadgang er tilføjet til brugeren.");
}
