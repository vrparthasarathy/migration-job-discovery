import { readFile } from "node:fs/promises";

const OPEN_STATUSES = ["released", "clarification-requested"];

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

function requireDate(value: string, name: string): void {
  if (!isIsoDate(value)) throw new Error(`${name} "${value}" is not YYYY-MM-DD`);
}

export function addWorkingDays(date: string, n: number, holidays: string[] = []): string {
  requireDate(date, "date");
  holidays.forEach((holiday) => requireDate(holiday, "holiday"));
  if (!Number.isInteger(n) || n < 0) throw new Error(`working days "${n}" must be a whole number, zero or more`);
  const day = new Date(`${date}T00:00:00Z`);
  for (let left = n; left > 0; ) {
    day.setUTCDate(day.getUTCDate() + 1);
    const iso = day.toISOString().slice(0, 10);
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    if (!weekend && !holidays.includes(iso)) left--;
  }
  return day.toISOString().slice(0, 10);
}

export function dueOn(releasedOn: string, holidays: string[] = []): string {
  return addWorkingDays(releasedOn, 2, holidays);
}

export function isOverdue(today: string, dueOnDate: string, answerStatus: string, status: string): boolean {
  requireDate(today, "today");
  if (dueOnDate === "") return false;
  requireDate(dueOnDate, "due_on");
  if (today <= dueOnDate || !OPEN_STATUSES.includes(status)) return false;
  return status === "clarification-requested" || answerStatus !== "answered";
}

export async function readHolidays(path: string): Promise<string[]> {
  const holidays: string[] = [];
  (await readFile(path, "utf8")).split(/\r?\n/).forEach((line, index) => {
    const value = line.trim();
    if (value === "") return;
    if (!isIsoDate(value)) throw new Error(`${path}: line ${index + 1}: "${value}" is not YYYY-MM-DD`);
    holidays.push(value);
  });
  return holidays;
}
