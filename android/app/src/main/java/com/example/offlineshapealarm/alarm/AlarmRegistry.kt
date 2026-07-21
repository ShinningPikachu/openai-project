package com.example.offlineshapealarm.alarm
import android.content.Context
import org.json.JSONObject
class AlarmRegistry(context: Context) { private val prefs=context.getSharedPreferences("shape_alarm_registry", Context.MODE_PRIVATE)
 fun upsert(payload: AlarmPayload) { payload.validate(); prefs.edit().putString(payload.alarmId, payload.toJson()).apply() }
 fun remove(id: String) { prefs.edit().remove(id).apply() }
 fun clear() { prefs.edit().clear().apply() }
 fun all(): List<AlarmPayload> = prefs.all.values.mapNotNull { runCatching { AlarmPayload.fromJson(it as String) }.getOrNull() }
 fun get(id: String): AlarmPayload? = prefs.getString(id,null)?.let { runCatching { AlarmPayload.fromJson(it) }.getOrNull() }
}
class ActiveAlarmStore(context: Context) { private val prefs=context.getSharedPreferences("shape_alarm_active", Context.MODE_PRIVATE)
 fun ringing(payload: AlarmPayload) { prefs.edit().putString("alarmId",payload.alarmId).putString("label",payload.label).putString("triggeredAt", java.time.Instant.now().toString()).putString("status","ringing").apply() }
 fun dismissed(id:String, reason:String) { prefs.edit().putString("alarmId",id).putString("status","dismissed").putString("dismissReason",reason).apply() }
 fun current(): JSONObject? = prefs.getString("alarmId", null)
  ?.takeIf { prefs.getString("status", null) == "ringing" }
  ?.let { JSONObject().put("alarmId", it).put("label", prefs.getString("label","Alarm")).put("triggeredAt", prefs.getString("triggeredAt", java.time.Instant.now().toString())).put("status", "ringing") }
 fun clear(){ prefs.edit().clear().apply() }
}
