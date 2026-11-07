import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { writeAutoHandle } from "../server/lib/auto-handle.js";
import { tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Turn the auto-handle automation on or off. When on, every staff text fires the rota.text.received event and the agent drafts a proposal for the manager to review, without anyone opening chat.",
  schema: z.object({ enabled: z.boolean() }),
  run: async ({ enabled }, ctx) => {
    const t = await tenantOf(ctx);
    await writeAutoHandle(t.ownerEmail, enabled, t.orgId);
    return { enabled };
  },
});
