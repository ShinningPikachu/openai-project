import type { RepeatDay } from "@/features/alarms/domain/alarm";
export const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
const short: Record<RepeatDay, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
export const formatRepeatDays = (days: RepeatDay[]) => days.length === 0 ? "Once" : days.length === 7 ? "Every day" : days.map((day) => short[day]).join(", ");
