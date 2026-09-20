"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { organizationName } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

function redirectToOrganizations(type: "error" | "success", message: string): never {
  redirect(`/dashboard/admin/organizations?${type}=${encodeURIComponent(message)}`);
}

export async function addOrganizationContactAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const organizationProfileId = String(formData.get("organizationProfileId") ?? "");
  const email = String(formData.get("contactEmail") ?? "").trim().toLowerCase();

  if (!organizationProfileId || !/^\S+@\S+\.\S+$/.test(email)) {
    redirectToOrganizations("error", "Skriv en gyldig email på kontaktpersonen.");
  }

  const [organization, user] = await Promise.all([
    prisma.organizationProfile.findUnique({
      where: { id: organizationProfileId },
      include: { user: true }
    }),
    prisma.user.findUnique({
      where: { email }
    })
  ]);

  if (!organization) {
    redirectToOrganizations("error", "Foreningen blev ikke fundet.");
  }

  if (!user) {
    redirectToOrganizations("error", "Brugeren findes ikke endnu. Opret personen først under brugeroprettelse eller bed personen oprette sig.");
  }

  await prisma.organizationContact.upsert({
    where: {
      userId_organizationProfileId: {
        userId: user.id,
        organizationProfileId: organization.id
      }
    },
    create: {
      userId: user.id,
      organizationProfileId: organization.id,
      role: user.id === organization.userId ? "OWNER" : "CONTACT"
    },
    update: {}
  });

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/admin/users");
  redirectToOrganizations("success", `${user.name} er tilføjet som kontaktperson for ${organizationName(organization)}.`);
}

export async function removeOrganizationContactAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const contactId = String(formData.get("contactId") ?? "");

  if (!contactId) {
    redirectToOrganizations("error", "Kontaktpersonen kunne ikke fjernes.");
  }

  const contact = await prisma.organizationContact.findUnique({
    where: { id: contactId },
    include: { organizationProfile: true }
  });

  if (!contact || contact.role === "OWNER" || contact.userId === contact.organizationProfile.userId) {
    redirectToOrganizations("error", "Ejeren af foreningen kan ikke fjernes som kontaktperson.");
  }

  await prisma.organizationContact.delete({
    where: { id: contact.id }
  });

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/admin/users");
  redirectToOrganizations("success", "Kontaktpersonen er fjernet.");
}
