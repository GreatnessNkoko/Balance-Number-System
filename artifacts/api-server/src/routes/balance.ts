import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { eq, isNotNull } from "drizzle-orm";
import { db, participantsTable, pool } from "@workspace/db";
import {
  GetMeResponse,
  GetNumbersResponse,
  RegisterUserBody,
  RegisterUserResponse,
  SelectNumberBody,
  SelectNumberResponse,
} from "@workspace/api-zod";
import { getParticipantId, setParticipantSession } from "../lib/session";
import { enforceRateLimit } from "../lib/rate-limit";
import { cleanName, isValidName, normalizeName } from "../lib/names";

const router: IRouter = Router();
const ALL_NUMBERS = Array.from({ length: 14 }, (_, index) => index + 1);

function errorResponse(
  res: Response,
  status: number,
  message: string,
  code: string,
): void {
  res.status(status).json({ message, code });
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

async function availableCount(): Promise<number> {
  const selected = await db
    .select({ selectedNumber: participantsTable.selectedNumber })
    .from(participantsTable)
    .where(isNotNull(participantsTable.selectedNumber));
  return 14 - selected.length;
}

router.post("/users/register", async (req, res): Promise<void> => {
  if (!enforceRateLimit(req, res, "register", 20, 10 * 60 * 1000)) return;

  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success || typeof parsed.data.name !== "string") {
    errorResponse(res, 400, "Please enter a valid name.", "invalid_name");
    return;
  }

  const name = cleanName(parsed.data.name);
  if (name.length === 0) {
    errorResponse(res, 400, "Please enter your name.", "empty_name");
    return;
  }
  if (!isValidName(name)) {
    errorResponse(res, 400, "Please enter a valid name.", "invalid_name");
    return;
  }

  try {
    const [participant] = await db
      .insert(participantsTable)
      .values({
        id: randomUUID(),
        name,
        normalizedName: normalizeName(name),
      })
      .returning();

    setParticipantSession(res, participant.id);
    const count = await availableCount();
    req.log.info({ participantId: participant.id }, "Participant registered");
    res.status(201).json(
      RegisterUserResponse.parse({
        userId: participant.id,
        name: participant.name,
        hasSelection: participant.selectedNumber !== null,
        selectedNumber: participant.selectedNumber,
        availableCount: count,
      }),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      req.log.warn("Duplicate participant name attempt");
      errorResponse(
        res,
        409,
        "This name has already been used. Please enter a different name.",
        "duplicate_name",
      );
      return;
    }
    req.log.error({ err: error }, "Participant registration failed");
    errorResponse(res, 500, "Something went wrong. Please try again.", "server_error");
  }
});

router.get("/numbers", async (req, res): Promise<void> => {
  const participantId = getParticipantId(req);
  if (!participantId) {
    errorResponse(res, 401, "Please enter your name first.", "not_authenticated");
    return;
  }

  const participant = await db
    .select({
      id: participantsTable.id,
      selectedNumber: participantsTable.selectedNumber,
    })
    .from(participantsTable)
    .where(eq(participantsTable.id, participantId))
    .limit(1);

  if (participant.length === 0) {
    errorResponse(res, 401, "Please enter your name first.", "not_authenticated");
    return;
  }

  const selectedRows = await db
    .select({ selectedNumber: participantsTable.selectedNumber })
    .from(participantsTable)
    .where(isNotNull(participantsTable.selectedNumber));
  const selected = new Set(
    selectedRows
      .map((row) => row.selectedNumber)
      .filter((number): number is number => number !== null),
  );

  res.json(
    GetNumbersResponse.parse({
      numbers: shuffle(
        ALL_NUMBERS.map((number) => ({ number, available: !selected.has(number) })),
      ),
      selectedNumber: participant[0].selectedNumber,
      availableCount: ALL_NUMBERS.filter((number) => !selected.has(number)).length,
    }),
  );
});

router.post("/numbers/select", async (req, res): Promise<void> => {
  if (!enforceRateLimit(req, res, "select", 30, 10 * 60 * 1000)) return;

  const participantId = getParticipantId(req);
  if (!participantId) {
    errorResponse(res, 401, "Please enter your name first.", "not_authenticated");
    return;
  }

  const parsed = SelectNumberBody.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 400, "Please choose a valid number.", "invalid_number");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const participantResult = await client.query<{
      selected_number: number | null;
    }>(
      "SELECT selected_number FROM participants WHERE id = $1 FOR UPDATE",
      [participantId],
    );
    if (participantResult.rowCount === 0) {
      await client.query("ROLLBACK");
      errorResponse(res, 401, "Please enter your name first.", "not_authenticated");
      return;
    }

    if (participantResult.rows[0].selected_number !== null) {
      await client.query("ROLLBACK");
      errorResponse(res, 409, "You have already selected a number.", "already_selected");
      return;
    }

    const countResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM participants WHERE selected_number IS NOT NULL",
    );
    if (Number(countResult.rows[0].count) >= 14) {
      await client.query("ROLLBACK");
      errorResponse(
        res,
        409,
        "All numbers have already been selected. Thank you.",
        "all_numbers_taken",
      );
      return;
    }

    const updateResult = await client.query<{ selected_at: Date }>(
      "UPDATE participants SET selected_number = $1, selected_at = NOW() WHERE id = $2 AND selected_number IS NULL RETURNING selected_at",
      [parsed.data.number, participantId],
    );
    await client.query("COMMIT");

    const selectedAt = new Date(updateResult.rows[0].selected_at).toISOString();
    req.log.info({ participantId, number: parsed.data.number }, "Number selected");
    res.status(201).json(
      SelectNumberResponse.parse({
        selectedNumber: parsed.data.number,
        selectedAt,
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isUniqueViolation(error)) {
      req.log.warn({ number: parsed.data.number }, "Taken number attempt");
      errorResponse(
        res,
        409,
        "This number has already been selected. Please choose another available number.",
        "number_taken",
      );
      return;
    }
    req.log.error({ err: error }, "Number selection failed");
    errorResponse(res, 500, "Something went wrong. Please try again.", "server_error");
  } finally {
    client.release();
  }
});

router.get("/me", async (req, res): Promise<void> => {
  const participantId = getParticipantId(req);
  if (!participantId) {
    res.json(GetMeResponse.parse({ authenticated: false, name: null, selectedNumber: null }));
    return;
  }

  const [participant] = await db
    .select({
      name: participantsTable.name,
      selectedNumber: participantsTable.selectedNumber,
    })
    .from(participantsTable)
    .where(eq(participantsTable.id, participantId))
    .limit(1);

  res.json(
    GetMeResponse.parse(
      participant
        ? {
            authenticated: true,
            name: participant.name,
            selectedNumber: participant.selectedNumber,
          }
        : { authenticated: false, name: null, selectedNumber: null },
    ),
  );
});

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export default router;