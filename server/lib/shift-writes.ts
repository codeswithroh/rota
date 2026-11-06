import { fail } from "@agent-native/core/action";

import {
  effectiveShifts,
  evaluateRota,
  newViolations,
  type RotaInput,
  type ShiftLite,
  type Violation,
} from "../../shared/rota-rules.js";

/**
 * Compare the confirmed rota before and after a direct edit. Throws a 409
 * `rule_violation` with the new error-level violations unless `force` is set.
 * Returns new warnings so callers can surface them.
 */
export function guardEdit(
  input: RotaInput,
  nextConfirmed: ShiftLite[],
  force: boolean | undefined,
): { warnings: Violation[]; errors: Violation[] } {
  const before = evaluateRota({
    ...input,
    shifts: effectiveShifts(input.shifts, "current"),
  });
  const after = evaluateRota({ ...input, shifts: nextConfirmed });
  const added = newViolations(before.violations, after.violations);
  const errors = added.filter((v) => v.severity === "error");
  if (errors.length && !force) {
    fail(errors.map((v) => v.message).join(" "), {
      errorCode: "rule_violation",
      statusCode: 409,
      details: { violations: errors },
    });
  }
  return { warnings: added.filter((v) => v.severity === "warn"), errors };
}
