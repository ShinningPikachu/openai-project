import type { Alarm } from "@/features/alarms/domain/alarm";
export interface AlarmScheduler { schedule(alarm: Alarm): Promise<void>; cancel(alarmId: string): Promise<void>; rescheduleAll(alarms: Alarm[]): Promise<void>; }
export class LocalAlarmScheduler implements AlarmScheduler { async schedule(_alarm: Alarm) {} async cancel(_alarmId: string) {} async rescheduleAll(_alarms: Alarm[]) {} }
