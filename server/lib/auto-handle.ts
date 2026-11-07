import { resourceGetByPath, resourcePut } from "@agent-native/core/resources";

export const AUTO_HANDLE_PATH = "jobs/rota-auto-handle-texts.md";

export function autoHandleJob(ownerEmail: string, enabled: boolean, orgId: string | null = null): string {
  return `---
schedule: ""
enabled: ${enabled}
triggerType: event
event: rota.text.received
mode: agentic
domain: rota
runAs: creator
createdBy: ${ownerEmail}
${orgId ? `orgId: ${orgId}\n` : ""}appId: rota
---
A staff member just texted the manager. The event payload has messageId, staffId, staffName and body.

If the text is not about the schedule (a thank-you, a question), call mark-message-handled with messageId and stop.

Otherwise, handle it the way the manager would:
1. get-week for the week the text is about (default this week).
2. If they can't work a day, add-time-off with messageId, then suggest-cover for each of their shifts that day.
3. Make ONE propose-changes with messageId set, a short title like "Priya covers Leo on Saturday" and a one-sentence reason. Prefer people who asked for extra hours, then fewest hours, then lowest cost. If nobody passes the rule check, propose leaving it as an open shift.
4. If propose-changes says a proposal is already pending for that week, stop there: the time off is recorded and the manager can use "Handle with agent" later.
5. Do not accept the proposal and do not text anyone. The manager reviews it on the grid.
`;
}

export async function readAutoHandle(ownerEmail: string): Promise<boolean> {
  const res = await resourceGetByPath(ownerEmail, AUTO_HANDLE_PATH);
  if (!res) return false;
  return /enabled:\s*true/.test(res.content);
}

// The job runs as its creator; without orgId it runs outside the workspace
// and sees an empty rota.
export async function writeAutoHandle(ownerEmail: string, enabled: boolean, orgId: string | null) {
  await resourcePut(ownerEmail, AUTO_HANDLE_PATH, autoHandleJob(ownerEmail, enabled, orgId), "text/markdown");
}

/** Rewrites an enabled job whose orgId doesn't match the sender's workspace. */
export async function ensureAutoHandleOrg(ownerEmail: string, orgId: string | null) {
  const res = await resourceGetByPath(ownerEmail, AUTO_HANDLE_PATH);
  if (!res || !/enabled:\s*true/.test(res.content)) return;
  const current = /^orgId:\s*(\S+)/m.exec(res.content)?.[1] ?? null;
  const body = (c: string) => c.split(/^---$/m).slice(2).join("---").trim();
  const stale = body(res.content) !== body(autoHandleJob(ownerEmail, true, orgId));
  if (current !== orgId || stale) await writeAutoHandle(ownerEmail, true, orgId);
}

export async function autoHandleOrgId(ownerEmail: string): Promise<string | null> {
  const res = await resourceGetByPath(ownerEmail, AUTO_HANDLE_PATH);
  return (res && /^orgId:\s*(\S+)/m.exec(res.content)?.[1]) || null;
}
