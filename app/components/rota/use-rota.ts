import {
  actionErrorMessage,
  setClientAppState,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import {
  effectiveShifts,
  evaluateRota,
  mondayOf,
  todayLocal,
  type RotaInput,
  type ShiftLite,
} from "@shared/rota-rules";

export const ROLE_COLORS: Record<"barista" | "kitchen" | "floor", string> = {
  barista: "#0ea5e9",
  kitchen: "#f97316",
  floor: "#10b981",
};

export const ACCENT = "#4f46e5";

export function useWeekParam() {
  const [params, setParams] = useSearchParams();
  const week = mondayOf(params.get("week") || todayLocal());
  const shiftId = params.get("shift");
  const setWeek = useCallback(
    (next: string) =>
      setParams((p) => {
        const n = new URLSearchParams(p);
        n.set("week", mondayOf(next));
        n.delete("shift");
        return n;
      }),
    [setParams],
  );
  const selectShift = useCallback(
    (id: string | null, label?: string) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          if (id) n.set("shift", id);
          else n.delete("shift");
          return n;
        },
        { replace: true },
      );
      void setClientAppState(
        "selection",
        id ? { kind: "rota.shift", shiftId: id, label, capturedAt: Date.now() } : null,
        { keepalive: true },
      ).catch(() => {});
    },
    [setParams],
  );
  return { week, shiftId, setWeek, selectShift };
}

export type WeekData = AgentNativeActionRegistry["get-week"]["result"];

export function useRotaWeek(week: string) {
  const params = useMemo(() => ({ week }), [week]);
  const query = useActionQuery("get-week", params, {
    // While the auto-handle automation works on a fresh text in the
    // background, poll so its proposal shows up without a reload.
    refetchInterval: (q) => {
      const d = q.state.data as WeekData | undefined;
      const waiting = d?.autoHandle && d.messages.some(
        (m) => m.direction === "in" && m.status === "new" && !m.proposalId &&
          Date.now() - new Date(m.createdAt).getTime() < 180_000,
      );
      return waiting ? 3000 : false;
    },
  });
  const data = query.data;

  // The grid re-runs the shared rule engine locally, so optimistic edits
  // update violations and metrics instantly.
  const derived = useMemo(() => {
    if (!data) return null;
    const input: RotaInput = {
      week: data.week,
      staff: data.staff,
      shifts: data.shifts as ShiftLite[],
      timeOff: data.timeOff,
      coverage: data.coverage,
      budgetCents: data.budgetCents,
    };
    const current = evaluateRota({
      ...input,
      shifts: effectiveShifts(input.shifts, "current"),
    });
    const hasProposal = input.shifts.some((s) => s.status === "proposed");
    const proposed = hasProposal
      ? evaluateRota({ ...input, shifts: effectiveShifts(input.shifts, "proposed") })
      : null;
    return { input, current, proposed };
  }, [data]);

  return { query, data, derived, queryKey: ["action", "get-week", params] };
}

export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "errorCode" in error) {
    const code = (error as { errorCode?: unknown }).errorCode;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function useShiftMutations(queryKey: unknown[]) {
  const qc = useQueryClient();
  const patchShifts = (fn: (shifts: ShiftLite[]) => ShiftLite[]) => {
    const previous = qc.getQueryData(queryKey);
    qc.setQueryData(queryKey, (old: WeekData | undefined) =>
      old ? { ...old, shifts: fn(old.shifts as ShiftLite[]) } : old,
    );
    return { previous };
  };
  const rollback = (ctx: unknown) =>
    qc.setQueryData(queryKey, (ctx as { previous?: unknown } | undefined)?.previous);

  const update = useActionMutation("update-shift", {
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey });
      return patchShifts((shifts) =>
        shifts.map((s) =>
          s.id === input.id
            ? {
                ...s,
                staffId: input.staffId === undefined ? s.staffId : input.staffId,
                date: input.date ?? s.date,
              }
            : s,
        ),
      );
    },
    onError: (error, _input, ctx) => {
      rollback(ctx);
      toast.error(actionErrorMessage(error) ?? "Could not move that shift.");
    },
  });

  const remove = useActionMutation("delete-shift", {
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey });
      return patchShifts((shifts) => shifts.filter((s) => s.id !== id));
    },
    onError: (error, _input, ctx) => {
      rollback(ctx);
      toast.error(actionErrorMessage(error) ?? "Could not delete that shift.");
    },
  });

  return { update, remove };
}

export function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function hours(minutes: number) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return "now";
  if (diff < 60) return `${Math.round(diff)}m`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h`;
  return `${Math.round(diff / 1440)}d`;
}
