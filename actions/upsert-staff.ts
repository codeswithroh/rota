import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { scoped, tenantOf } from "../server/lib/rota.js";
import { ROLES } from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Add a staff member, or update one when id is given (name, role, hourly rate, contract hours, active).",
  schema: z.object({
    id: z.string().optional().describe("Existing staff id; omit to add"),
    name: z.string().min(1).max(60).optional(),
    role: z.enum(ROLES).optional(),
    hourlyRate: z.coerce
      .number()
      .min(0)
      .max(500)
      .optional()
      .describe("Dollars per hour"),
    maxHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(80)
      .optional()
      .describe("Contracted max hours per week"),
    active: z.boolean().optional(),
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const db = getDb();
    if (args.id) {
      const patch: Partial<typeof schema.staff.$inferInsert> = {};
      if (args.name) patch.name = args.name;
      if (args.role) patch.role = args.role;
      if (args.hourlyRate !== undefined)
        patch.hourlyRateCents = Math.round(args.hourlyRate * 100);
      if (args.maxHours !== undefined) patch.maxHours = args.maxHours;
      if (args.active !== undefined) patch.active = args.active;
      const [row] = await db
        .update(schema.staff)
        .set(patch)
        .where(and(eq(schema.staff.id, args.id), scoped(schema.staff, t)))
        .returning({ id: schema.staff.id, name: schema.staff.name });
      if (!row) fail("Staff member not found.", { errorCode: "not_found", statusCode: 404 });
      return { id: row.id, name: row.name, updated: true };
    }
    if (!args.name || !args.role || args.hourlyRate === undefined || !args.maxHours) {
      fail("name, role, hourlyRate and maxHours are required to add someone.", {
        errorCode: "missing_fields",
      });
    }
    const id = crypto.randomUUID();
    await db.insert(schema.staff).values({
      id,
      name: args.name,
      role: args.role,
      hourlyRateCents: Math.round(args.hourlyRate * 100),
      maxHours: args.maxHours,
      ownerEmail: t.ownerEmail,
      orgId: t.orgId,
    });
    return { id, name: args.name, updated: false };
  },
});
