// Drop assignments — map product handle → drop number.
// Anything not listed defaults to Drop 01.
export const DROP_ASSIGNMENTS: Record<string, number> = {
  "showed-up-late-tee": 2,
  "work-in-progress-oversized-tee": 2,
};

export const DEFAULT_DROP = 1;

export function getDropForHandle(handle: string): number {
  return DROP_ASSIGNMENTS[handle] ?? DEFAULT_DROP;
}

export function formatDropLabel(drop: number): string {
  return `Drop ${String(drop).padStart(2, "0")}`;
}
