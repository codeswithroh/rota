import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description: "Mark an inbound staff message as handled (or reopen it).",
  schema: z.object({
    id: z.string().describe("Message id"),
    handled: z.boolean().default(true),
  }),
  run: async ({ id, handled }, ctx) => {
    const t = await tenantOf(ctx);
    const [row] = await getDb()
      .update(schema.messages)
      .set({ status: handled ? "handled" : "new" })
      .where(and(eq(schema.messages.id, id), scoped(schema.messages, t)))
      .returning({ id: schema.messages.id });
    if (!row) fail("Message not found.", { errorCode: "not_found", statusCode: 404 });
    return { id, status: handled ? "handled" : "new" };
  },
});
