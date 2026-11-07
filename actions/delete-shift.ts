import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description: "Delete one confirmed shift (manager edit).",
  schema: z.object({ id: z.string().describe("Shift id") }),
  run: async ({ id }, ctx) => {
    const t = await tenantOf(ctx);
    const [deleted] = await getDb()
      .delete(schema.shifts)
      .where(
        and(
          eq(schema.shifts.id, id),
          eq(schema.shifts.status, "confirmed"),
          scoped(schema.shifts, t),
        ),
      )
      .returning({ id: schema.shifts.id });
    if (!deleted) {
      fail("Shift not found.", { errorCode: "not_found", statusCode: 404 });
    }
    return { id, deleted: true };
  },
});
