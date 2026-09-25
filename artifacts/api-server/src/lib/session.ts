import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const PARTICIPANT_COOKIE = "balance_participant";
const ADMIN_COOKIE = "balance_admin";
const sessionSecret = process.env.SESSION_SECRET ?? "";

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be configured.");
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function encode(value: string): string {
  return `${value}.${sign(value)}`;
}

function decode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  return payload;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setParticipantSession(res: Response, participantId: string): void {
  res.cookie(PARTICIPANT_COOKIE, encode(participantId), {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function getParticipantId(req: Request): string | null {
  return decode(req.cookies?.[PARTICIPANT_COOKIE]);
}

export function setAdminSession(res: Response): void {
  res.cookie(ADMIN_COOKIE, encode("admin"), {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 12,
  });
}

export function clearAdminSession(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, cookieOptions);
}

export function isAdminAuthenticated(req: Request): boolean {
  return decode(req.cookies?.[ADMIN_COOKIE]) === "admin";
}