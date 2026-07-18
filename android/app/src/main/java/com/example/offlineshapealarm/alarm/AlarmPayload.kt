package com.example.offlineshapealarm.alarm

import org.json.JSONArray
import org.json.JSONObject

data class AlarmPayload(val alarmId: String, val label: String, val triggerAtEpochMillis: Long, val hour: Int, val minute: Int, val repeatDays: List<String>, val vibrationEnabled: Boolean, val soundId: String, val challengeType: String, val requestCode: Int = stableRequestCode(alarmId)) {
  fun validate() { require(alarmId.isNotBlank()); require(triggerAtEpochMillis > 0); require(hour in 0..23); require(minute in 0..59) }
  fun toJson() = JSONObject().put("alarmId", alarmId).put("label", label).put("triggerAtEpochMillis", triggerAtEpochMillis).put("hour", hour).put("minute", minute).put("repeatDays", JSONArray(repeatDays)).put("vibrationEnabled", vibrationEnabled).put("soundId", soundId).put("challengeType", challengeType).put("requestCode", requestCode).toString()
  companion object { fun fromJson(raw: String): AlarmPayload { val o=JSONObject(raw); val days=o.optJSONArray("repeatDays") ?: JSONArray(); return AlarmPayload(o.getString("alarmId"), o.optString("label","Alarm"), o.getLong("triggerAtEpochMillis"), o.getInt("hour"), o.getInt("minute"), (0 until days.length()).map{days.getString(it)}, o.optBoolean("vibrationEnabled", true), o.optString("soundId","default"), o.optString("challengeType","shape-photo"), o.optInt("requestCode", stableRequestCode(o.getString("alarmId")))).also{it.validate()} } }
}
fun stableRequestCode(alarmId: String): Int { val digest = java.security.MessageDigest.getInstance("SHA-256").digest(alarmId.toByteArray()); return java.nio.ByteBuffer.wrap(digest.copyOfRange(0,4)).int and 0x7fffffff }
