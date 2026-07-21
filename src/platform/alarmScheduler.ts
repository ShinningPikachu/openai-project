import { z } from "zod";
import { getNextAlarmOccurrenceEpochMillis } from "@/features/alarms/domain/nextOccurrence";
import { alarmSchema, repeatDaySchema, challengeTypeSchema, type Alarm } from "@/features/alarms/domain/alarm";

export type ExactAlarmPermission = "granted" | "denied" | "not-required" | "unknown";
export type NotificationPermission = "granted" | "denied" | "not-required" | "unknown";
export interface AlarmPermissionStatus { exactAlarm: ExactAlarmPermission; notifications: NotificationPermission; fullScreenIntent: "available" | "restricted" | "unknown"; }
export interface ActiveAlarmState { alarmId: string; label: string; triggeredAt: string; status: "ringing" | "dismissed"; }
export interface NativeAlarmPayload { alarmId: string; label: string; triggerAtEpochMillis: number; hour: number; minute: number; repeatDays: z.infer<typeof repeatDaySchema>[]; vibrationEnabled: boolean; soundId: string; challengeType: z.infer<typeof challengeTypeSchema>; }
export interface NativeScheduledAlarmRecord extends NativeAlarmPayload { requestCode: number; }
export class ExactAlarmPermissionError extends Error {
  name = "ExactAlarmPermissionError";
  constructor() {
    super("Exact alarm access is required.");
  }
}
export class NotificationPermissionError extends Error {
  name = "NotificationPermissionError";
  constructor() {
    super("Notification permission is required.");
  }
}
export class AlarmSchedulingError extends Error { name = "AlarmSchedulingError"; constructor(readonly alarmId: string, readonly cause: unknown) { super(`Could not schedule alarm ${alarmId}: ${String(cause)}`); } }
export class AlarmCancellationError extends Error { name = "AlarmCancellationError"; }
export class AlarmServiceUnavailableError extends Error { name = "AlarmServiceUnavailableError"; }

const payloadSchema = z.object({ alarmId: z.string().min(1), label: z.string(), triggerAtEpochMillis: z.number().int().positive(), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59), repeatDays: z.array(repeatDaySchema), vibrationEnabled: z.boolean(), soundId: z.string().min(1), challengeType: challengeTypeSchema });
type NativeModule = { scheduleAlarm(payload: NativeAlarmPayload): Promise<void>; cancelAlarm(alarmId: string): Promise<void>; cancelAllAlarms(): Promise<void>; getAlarmPermissionStatus(): Promise<AlarmPermissionStatus>; openExactAlarmSettings(): Promise<void>; openNotificationSettings(): Promise<void>; requestNotificationPermission(): Promise<AlarmPermissionStatus>; getActiveAlarm(): Promise<ActiveAlarmState | null>; getScheduledAlarms(): Promise<NativeScheduledAlarmRecord[]>; stopActiveAlarm(alarmId: string, reason: string): Promise<void>; };
declare const require: (name: string) => { NativeModules?: Record<string, unknown>; Platform?: { OS?: string } };
const reactNative = () => require("react-native");
const isAndroid = () => reactNative().Platform?.OS === "android";
const nativeModule = () => reactNative().NativeModules?.ShapeAlarmScheduler as NativeModule | undefined;
const native = (): NativeModule => { const module = nativeModule(); if (!module) throw new AlarmServiceUnavailableError("Native alarm scheduler is unavailable in Expo Go or this platform."); return module; };
export const isNativeAlarmSchedulerAvailable = () => isAndroid() && Boolean(nativeModule());
const isNativeExactAlarmPermissionError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const nativeError = error as { code?: unknown; message?: unknown };
  return nativeError.code === "EXACT_ALARM_PERMISSION_REQUIRED" || nativeError.message === "Exact alarm permission is required";
};
export const isExactAlarmPermissionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const alarmError = error as { name?: unknown; cause?: unknown };
  return alarmError.name === "ExactAlarmPermissionError" || isNativeExactAlarmPermissionError(error) || isExactAlarmPermissionError(alarmError.cause);
};
export const isNotificationPermissionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const alarmError = error as { name?: unknown; cause?: unknown };
  return alarmError.name === "NotificationPermissionError" || isNotificationPermissionError(alarmError.cause);
};
export interface AlarmScheduler { schedule(alarm: Alarm): Promise<void>; cancel(alarmId: string): Promise<void>; rescheduleAll(alarms: Alarm[]): Promise<void>; requestPermissions(): Promise<AlarmPermissionStatus>; getPermissionStatus(): Promise<AlarmPermissionStatus>; }
export function toNativeAlarmPayload(alarm: Alarm, now = new Date()): NativeAlarmPayload | null { const parsed = alarmSchema.parse(alarm); const triggerAtEpochMillis = getNextAlarmOccurrenceEpochMillis(parsed, now); if (!parsed.enabled || triggerAtEpochMillis === null) return null; return payloadSchema.parse({ alarmId: parsed.id, label: parsed.label || "Alarm", triggerAtEpochMillis, hour: parsed.hour, minute: parsed.minute, repeatDays: parsed.repeatDays, vibrationEnabled: parsed.vibrationEnabled, soundId: "default", challengeType: parsed.challengeType }); }
const nonAndroidPermissionStatus: AlarmPermissionStatus = { exactAlarm: "not-required", notifications: "not-required", fullScreenIntent: "unknown" };
const unavailablePermissionStatus: AlarmPermissionStatus = { exactAlarm: "unknown", notifications: "unknown", fullScreenIntent: "unknown" };
export class NativeAlarmScheduler implements AlarmScheduler { private get available() { return isNativeAlarmSchedulerAvailable(); } async schedule(alarm: Alarm) { if (!isAndroid() || !this.available) return; const payload = toNativeAlarmPayload(alarm); if (!payload) { await this.cancel(alarm.id); return; } const permissions = await this.getPermissionStatus(); if (permissions.exactAlarm === "denied") throw new ExactAlarmPermissionError(); if (permissions.notifications === "denied") throw new NotificationPermissionError(); try { await native().scheduleAlarm(payload); } catch (error) { if (isNativeExactAlarmPermissionError(error)) throw new ExactAlarmPermissionError(); throw error; } } async cancel(alarmId: string) { if (this.available) await native().cancelAlarm(alarmId); } async rescheduleAll(alarms: Alarm[]) { if (!isAndroid() || !this.available) return; const enabledAlarms = alarms.filter((alarm) => alarm.enabled); if (enabledAlarms.length) { const permissions = await this.getPermissionStatus(); if (permissions.exactAlarm === "denied") throw new ExactAlarmPermissionError(); if (permissions.notifications === "denied") throw new NotificationPermissionError(); } await native().cancelAllAlarms(); for (const alarm of enabledAlarms) await this.schedule(alarm); } requestPermissions() { if (!isAndroid()) return Promise.resolve(nonAndroidPermissionStatus); return this.available ? native().requestNotificationPermission() : Promise.resolve(unavailablePermissionStatus); } getPermissionStatus() { if (!isAndroid()) return Promise.resolve(nonAndroidPermissionStatus); return this.available ? native().getAlarmPermissionStatus() : Promise.resolve(unavailablePermissionStatus); } }
export const alarmNativeActions = { openExactAlarmSettings: () => native().openExactAlarmSettings(), openNotificationSettings: () => native().openNotificationSettings(), getActiveAlarm: () => native().getActiveAlarm(), getScheduledAlarms: () => native().getScheduledAlarms(), stopActiveAlarm: (alarmId: string, reason: "shape-success" | "long-press" | "emergency-override") => native().stopActiveAlarm(alarmId, reason) };
export const LocalAlarmScheduler = NativeAlarmScheduler;
