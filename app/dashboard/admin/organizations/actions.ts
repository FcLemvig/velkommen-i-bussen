"use server";

import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { sendOrganizationWelcomeEmail } from "@/lib/email";
import { organizationName } from "@/lib/organizations";
import { createPasswordResetToken, DRIVER_INVITE_MAX_AGE_MS } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { organizationAdminSchema } from "@/lib/validation";

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

function parseOrganization(formData: FormData) {
  return organizationAdminSchema.safeParse(Object.fromEntries(formData));
}

export async function createOrganizationAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const parsed = parseOrganization(formData);

  if (!parsed.success) {
    redirect(`/dashboard/admin/organizations/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const invite = createPasswordResetToken();
  let organizationId = "";

  try {
    const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name.trim(),
          email,
          passwordHash,
          role: "ORGANIZATION",
          organizationProfile: {
            create: {
              name: parsed.data.name.trim(),
              phone: parsed.data.phone.trim(),
              address: parsed.data.address.trim()
            }
          },
          membership: {
            create: {
              type: "ORGANIZATION",
              status: parsed.data.membershipStatus,
              startsAt: parsed.data.membershipStatus === "ACTIVE" ? new Date() : undefined
            }
          },
          passwordResetTokens: {
            create: {
              tokenHash: invite.tokenHash,
              expiresAt: new Date(Date.now() + DRIVER_INVITE_MAX_AGE_MS)
            }
          }
        },
        include: { organizationProfile: true }
      });

      organizationId = user.organizationProfile?.id ?? "";

      if (user.organizationProfile) {
        await tx.organizationContact.create({
          data: {
            userId: user.id,
            organizationProfileId: user.organizationProfile.id,
            role: "OWNER"
          }
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/dashboard/admin/organizations/new?error=Emailen%20er%20allerede%20i%20brug.");
    }

    redirect("/dashboard/admin/organizations/new?error=Foreningen%20kunne%20ikke%20oprettes.");
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "ORGANIZATION_CREATED",
    entityType: "ORGANIZATION_PROFILE",
    entityId: organizationId,
    description: `${admin.name} oprettede ${parsed.data.name.trim()} som forening/institution.`
  });

  const emailSent = await sendOrganizationWelcomeEmail(
    { email, name: parsed.data.name.trim() },
    invite.token
  );

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/admin");
  const message = emailSent
    ? "Foreningen er oprettet, og velkomstmailen er sendt."
    : "Foreningen er oprettet, men velkomstmailen kunne ikke sendes. Kontroller emailopsætningen.";
  redirect(`/dashboard/admin/organizations?${emailSent ? "success" : "error"}=${encodeURIComponent(message)}`);
}

export async function updateOrganizationAction(organizationProfileId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const parsed = parseOrganization(formData);

  if (!parsed.success) {
    redirect(`/dashboard/admin/organizations/${organizationProfileId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  try {
    const organization = await prisma.organizationProfile.findUnique({
      where: { id: organizationProfileId },
      select: { userId: true }
    });

    if (!organization) {
      redirect("/dashboard/admin/organizations?error=Foreningen%20blev%20ikke%20fundet.");
    }

    await prisma.$transaction([
      prisma.organizationProfile.update({
        where: { id: organizationProfileId },
        data: {
          name: parsed.data.name.trim(),
          phone: parsed.data.phone.trim(),
          address: parsed.data.address.trim(),
          user: {
            update: {
              email: parsed.data.email.trim().toLowerCase()
            }
          }
        }
      }),
      prisma.membership.upsert({
        where: { userId: organization.userId },
        create: {
          userId: organization.userId,
          type: "ORGANIZATION",
          status: parsed.data.membershipStatus,
          startsAt: parsed.data.membershipStatus === "ACTIVE" ? new Date() : undefined
        },
        update: {
          type: "ORGANIZATION",
          status: parsed.data.membershipStatus,
          endsAt: parsed.data.membershipStatus === "ENDED" ? new Date() : null
        }
      })
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/dashboard/admin/organizations/${organizationProfileId}?error=Emailen%20er%20allerede%20i%20brug.`);
    }

    redirect(`/dashboard/admin/organizations/${organizationProfileId}?error=Foreningen%20kunne%20ikke%20opdateres.`);
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "ORGANIZATION_UPDATED",
    entityType: "ORGANIZATION_PROFILE",
    entityId: organizationProfileId,
    description: `${admin.name} opdaterede ${parsed.data.name.trim()}.`
  });

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath(`/dashboard/admin/organizations/${organizationProfileId}`);
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin/organizations?success=Foreningen%20er%20opdateret.");
}

export async function deleteOrganizationAction(organizationProfileId: string) {
  const admin = await requireUser(["ADMIN"]);
  const organization = await prisma.organizationProfile.findUnique({
    where: { id: organizationProfileId },
    include: {
      user: {
        include: {
          citizenProfile: true,
          driverProfile: true
        }
      },
      _count: { select: { bookings: true } }
    }
  });

  if (!organization) {
    redirectToOrganizations("error", "Foreningen blev ikke fundet.");
  }

  const [otherOrganizationAccesses] = await Promise.all([
    prisma.organizationContact.count({
      where: {
        userId: organization.userId,
        organizationProfileId: { not: organization.id }
      }
    })
  ]);
  const deleteOwnerUser =
    organization.user.role === "ORGANIZATION" &&
    !organization.user.citizenProfile &&
    !organization.user.driverProfile &&
    otherOrganizationAccesses === 0;
  const displayName = organizationName(organization);

  try {
    await prisma.$transaction(async (tx) => {
      if (deleteOwnerUser) {
        await tx.user.delete({ where: { id: organization.userId } });
      } else {
        await tx.organizationProfile.delete({ where: { id: organization.id } });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ORGANIZATION_DELETED",
          entityType: "ORGANIZATION_PROFILE",
          entityId: organization.id,
          description: `${admin.name} slettede ${displayName} og ${organization._count.bookings} tilknyttede booking(er).`
        }
      });
    });
  } catch {
    redirect(`/dashboard/admin/organizations/${organizationProfileId}?error=Foreningen%20kunne%20ikke%20slettes.`);
  }

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
  redirectToOrganizations("success", `${displayName} er slettet.`);
}
