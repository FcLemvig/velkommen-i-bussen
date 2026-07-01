import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { Role, isRole } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "vib_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          citizenProfile: true,
          driverProfile: true,
          membership: true
        }
      }
    }
  });

  if (!session || session.expiresAt < new Date()) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}

export async function deleteExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isRole(user.role) || (roles && !roles.includes(user.role))) {
    redirect("/dashboard");
  }

  return user;
}

export function dashboardPathForRole(role: Role | string) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "DRIVER") return "/dashboard/driver";
  return "/dashboard/citizen";
}
