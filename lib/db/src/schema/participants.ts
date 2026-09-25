import { createInsertSchema } from "drizzle-zod";
import { pgTable, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const participantsTable = pgTable("participants", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
  selectedNumber: integer("selected_number").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  selectedAt: timestamp("selected_at", { withTimezone: true }),
});

export const insertParticipantSchema = createInsertSchema(participantsTable).omit({
  createdAt: true,
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participantsTable.$inferSelect;