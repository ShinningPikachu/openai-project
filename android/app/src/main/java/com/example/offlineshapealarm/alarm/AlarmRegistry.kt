package com.example.offlineshapealarm.alarm
import android.content.Context
import org.json.JSONObject

open class PayloadRegistry(context: Context, name: String) {
  private val preferences = context.getSharedPreferences(name, Context.MODE_PRIVATE)

  fun upsert(payload: AlarmPayload) {
    payload.validate()
    preferences.edit().putString(payload.alarmId, payload.toJson()).apply()
  }

  fun remove(id: String) {
    preferences.edit().remove(id).apply()
  }

  fun all(): List<AlarmPayload> = preferences.all.values.mapNotNull {
    runCatching { AlarmPayload.fromJson(it as String) }.getOrNull()
  }

  fun get(id: String): AlarmPayload? = preferences.getString(id, null)?.let {
    runCatching { AlarmPayload.fromJson(it) }.getOrNull()
  }

  fun clear() {
    preferences.edit().clear().apply()
  }
}

class AlarmRegistry(context: Context) : PayloadRegistry(context, "shape_alarm_registry")

class SnoozeRegistry(context: Context) : PayloadRegistry(context, "shape_alarm_snoozes")

class ActiveAlarmStore(context: Context) {
  private val preferences = context.getSharedPreferences("shape_alarm_active", Context.MODE_PRIVATE)

  fun ringing(payload: AlarmPayload) {
    preferences.edit()
      .putString("alarmId", payload.alarmId)
      .putString("label", payload.label)
      .putString("payload", payload.toJson())
      .putString("triggeredAt", java.time.Instant.now().toString())
      .putString("status", "ringing")
      .apply()
  }

  fun dismissed(id: String, reason: String) {
    preferences.edit()
      .putString("alarmId", id)
      .putString("status", "dismissed")
      .putString("dismissReason", reason)
      .apply()
  }

  fun current(): JSONObject? = preferences.getString("alarmId", null)
    ?.takeIf { preferences.getString("status", null) == "ringing" }
    ?.let {
      JSONObject()
        .put("alarmId", it)
        .put("label", preferences.getString("label", "Alarm"))
        .put("triggeredAt", preferences.getString("triggeredAt", java.time.Instant.now().toString()))
        .put("status", "ringing")
    }

  fun payload(): AlarmPayload? = preferences.getString("payload", null)?.let {
    runCatching { AlarmPayload.fromJson(it) }.getOrNull()
  }

  fun clear() {
    preferences.edit().clear().apply()
  }
}
