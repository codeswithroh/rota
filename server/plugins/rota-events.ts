import { registerEvent } from "@agent-native/core/event-bus";
import { z } from "zod";

/** Fired when a staff member texts the manager (see actions/receive-message.ts). */
registerEvent({
  name: "rota.text.received",
  description:
    "A staff member sent the manager a text (sick day, swap request, availability).",
  payloadSchema: z.object({
    messageId: z.string(),
    staffId: z.string(),
    staffName: z.string(),
    body: z.string(),
    receivedAt: z.string(),
  }),
  example: {
    messageId: "msg_123",
    staffId: "staff_123",
    staffName: "Leo Okafor",
    body: "Can't do Saturday, kid is sick",
    receivedAt: "2026-11-06T06:12:00.000Z",
  },
});

export default () => {};
