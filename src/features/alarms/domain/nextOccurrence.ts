import type { Alarm, RepeatDay } from "./alarm";

const dayToJsDay: Record<RepeatDay, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const jsDayToRepeatDay = new Map(Object.entries(dayToJsDay).map(([day, js]) => [js, day as RepeatDay]));

export function getNextAlarmOccurrence(alarm: Alarm, now: Date = new Date()): Date | null {
  if (!alarm.enabled) return null;
  const selected = new Set(alarm.repeatDays);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);
    const repeatDay = jsDayToRepeatDay.get(candidate.getDay());
    const isOneTime = selected.size === 0;
    const isSelectedRepeatDay = repeatDay ? selected.has(repeatDay) : false;
    if (isOneTime) {
      if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 1);
      return candidate;
    }
    if (isSelectedRepeatDay && candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

export function getNextAlarmOccurrenceEpochMillis(alarm: Alarm, now: Date = new Date()): number | null {
  return getNextAlarmOccurrence(alarm, now)?.getTime() ?? null;
}
