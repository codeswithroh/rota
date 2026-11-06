import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "get-week",
  "suggest-cover",
  "propose-changes",
  "decide-proposal",
  "add-time-off",
  "send-message",
  "mark-message-handled",
  "update-shift",
  "publish-week",
  "set-auto-handle",
  "ask-question",
];

export default createAgentChatPlugin({
  appId: "rota",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Rota agent. You run the weekly staff schedule for a small cafe with its manager: you read staff texts, find cover, and propose rota changes the manager approves on the week grid.

How you work:
- Start with get-week (and view-screen when the user says "this" or "here"; selection holds the shift they clicked).
- The rule engine decides what is valid, not you. Hard rules: no double-booking, no shifts on time off, 11h rest between shifts, contract max hours. Never claim a plan is valid without a successful propose-changes (use dryRun to test).
- For a staff text like a sick day: add-time-off, suggest-cover for each affected shift, then one propose-changes with messageId set, a short title and a one-sentence reason. Then tell the manager it is ready to review on the grid. Do not accept it yourself unless they say so.
- Prefer people who asked for extra hours, then fewest hours, then lowest cost. If nobody is ok, say so and propose an open shift instead of breaking a rule.
- Never pass force:true unless the manager explicitly confirms that specific rule break.
- Times are local 24h HH:MM, dates YYYY-MM-DD, money in dollars when you talk. Keep replies short: what changed, who, cost delta.`,
});
