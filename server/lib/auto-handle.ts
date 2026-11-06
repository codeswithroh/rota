import { resourceGetByPath, resourcePut } from "@agent-native/core/resources";

export const AUTO_HANDLE_PATH = "jobs/rota-auto-handle-texts.md";

export function autoHandleJob(ownerEmail: string, enabled: boolean): string {
  return `---
schedule: ""
enabled: ${enabled}
triggerType: event
event: rota.text.received
mode: agentic
domain: rota
runAs: creator
createdBy: ${ownerEmail}
appId: rota
---
A staff member just texted the manager. The event payload has messageId, staffId, staffName and body.

If the text is not about the schedule (a thank-you, a question), do nothing.

Otherwise, handle it the way the manager would:
1. get-week for the week the text is about (default this week).
2. If they can't work a day, add-time-off with messageId, then suggest-cover for each of their shifts that day.
3. Make ONE propose-changes with messageId set, a short title like "Priya covers Leo on Saturday" and a one-sentence reason. Prefer people who asked for extra hours, then fewest hours, then lowest cost. If nobody passes the rule check, propose leaving it as an open shift.
4. Do not accept the proposal and do not text anyone. The manager reviews it on the grid.
`;
}

export async function readAutoHandle(ownerEmail: string): Promise<boolean> {
  const res = await resourceGetByPath(ownerEmail, AUTO_HANDLE_PATH);
  if (!res) return false;
  return /enabled:\s*true/.test(res.content);
}

export async function writeAutoHandle(ownerEmail: string, enabled: boolean) {
  await resourcePut(ownerEmail, AUTO_HANDLE_PATH, autoHandleJob(ownerEmail, enabled), "text/markdown");
}
