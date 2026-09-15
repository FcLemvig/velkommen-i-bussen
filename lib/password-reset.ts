import { createHash, randomBytes } from "crypto";

export const PASSWORD_RESET_MAX_AGE_MS = 60 * 60 * 1000;
export const DRIVER_INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
