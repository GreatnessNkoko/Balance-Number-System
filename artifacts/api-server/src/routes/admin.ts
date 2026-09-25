import { Router, type IRouter, type Response } from "express";
import { asc, eq, isNotNull } from "drizzle-orm";
import { db, participantsTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  GetAdminDashboardResponse,
} from "@workspace/api-zod";
import {
  clearAdminSession,
  isAdminAuthenticated,
  setAdminSession,
} from "../lib/session";
import { enforceRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

function errorResponse(
  res: Response,
  status: number,
  message: string,
  code: string,
): void {
  res.status(status).json({ message, code });
}

function requireAdmin(res: Response, authenticated: boolean): boolean {
  if (authenticated) return true;
  errorResponse(res, 401, "Administrator authentication required.", "not_authenticated");
  return false;
}

router.post("/admin/login", async (req, res): Promise<void> => {
  if (!enforceRateLimit(req, res, "admin-login", 10, 15 * 60 * 1000)) return;

  const parsed = AdminLoginBody.safeParse(req.body);
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!parsed.success || !configuredPassword) {
    req.log.warn("Failed administrator login attempt");
    errorResponse(res, 401, "Incorrect password.", "invalid_password");
    return;
  }

  if (parsed.data.password !== configuredPassword) {
    req.log.warn("Failed administrator login attempt");
    errorResponse(res, 401, "Incorrect password.", "invalid_password");
    return;
  }

  setAdminSession(res);
  req.log.info("Administrator login succeeded");
  res.json(AdminLoginResponse.parse({ authenticated: true }));
});

router.post("/admin/logout", (req, res): void => {
  clearAdminSession(res);
  res.sendStatus(204);
});

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  if (!requireAdmin(res, isAdminAuthenticated(req))) return;

  const participants = await db
    .select({
      name: participantsTable.name,
      selectedNumber: participantsTable.selectedNumber,
      selectedAt: participantsTable.selectedAt,
    })
    .from(participantsTable)
    .where(isNotNull(participantsTable.selectedNumber))
    .orderBy(asc(participantsTable.selectedNumber));

  const byNumber = new Map(
    participants.map((participant) => [participant.selectedNumber, participant]),
  );
  const assignments = Array.from({ length: 14 }, (_, index) => {
    const number = index + 1;
    const participant = byNumber.get(number);
    return {
      number,
      name: participant?.name ?? null,
      status: participant ? ("selected" as const) : ("available" as const),
      selectedAt: participant?.selectedAt?.toISOString() ?? null,
    };
  });

  res.json(
    GetAdminDashboardResponse.parse({
      totalNumbers: 14,
      selected: participants.length,
      remaining: 14 - participants.length,
      assignments,
    }),
  );
});

export default router;