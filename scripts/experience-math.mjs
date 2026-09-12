function monthIndex(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) throw new Error(`Invalid experience month: ${value}`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

export function completedExperienceMonths(periods, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid current date");
  const currentMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();

  // Dates have month precision. Include a finished role's last month, but
  // count only completed months for ongoing roles, using UTC for all visitors.
  const ranges = periods
    .map(({ start, end }) => {
      const first = monthIndex(start);
      const last = end == null ? currentMonth : monthIndex(end) + 1;
      if (end != null && last <= first)
        throw new Error("Experience ends before it starts");
      return [first, Math.min(last, currentMonth)];
    })
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  // Merge concurrent roles so the same month never counts twice.
  let total = 0;
  let coveredUntil = -Infinity;
  for (const [start, end] of ranges) {
    total += Math.max(0, end - Math.max(start, coveredUntil));
    coveredUntil = Math.max(coveredUntil, end);
  }
  return total;
}
