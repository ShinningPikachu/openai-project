package com.example.offlineshapealarm.alarm

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class AlarmActivity : Activity() {
  private lateinit var payload: AlarmPayload
  private lateinit var message: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    payload = payloadFromIntent() ?: run {
      finish()
      return
    }
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(48, 48, 48, 48)
      setBackgroundColor(Color.rgb(241, 245, 249))
    }
    root.addView(TextView(this).apply {
      text = payload.label.ifBlank { "Alarm" }
      textSize = 32f
      setTextColor(Color.rgb(15, 23, 42))
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = "Your alarm is ringing. Start the challenge to dismiss it, or delay it for five minutes."
      textSize = 18f
      setTextColor(Color.rgb(51, 65, 85))
      gravity = Gravity.CENTER
      setPadding(0, 20, 0, 32)
    })
    root.addView(button("Start challenge", Color.rgb(7, 89, 133), Color.WHITE) {
      startActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse("shapealarm://challenge/${payload.alarmId}"))
          .setPackage(packageName)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
      finish()
    }, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 16 })
    root.addView(button("Delay 5 minutes", Color.rgb(224, 242, 254), Color.rgb(7, 89, 133)) {
      delayAlarm()
    }, LinearLayout.LayoutParams(-1, -2))
    message = TextView(this).apply {
      setTextColor(Color.rgb(180, 35, 24))
      gravity = Gravity.CENTER
      setPadding(0, 20, 0, 0)
    }
    root.addView(message)
    setContentView(root)
  }

  @Deprecated("Back navigation is disabled while an alarm is ringing.")
  override fun onBackPressed() = Unit

  private fun button(label: String, background: Int, foreground: Int, action: () -> Unit) = Button(this).apply {
    text = label
    textSize = 18f
    setTextColor(foreground)
    setBackgroundColor(background)
    setPadding(24, 20, 24, 20)
    setOnClickListener { action() }
  }

  private fun delayAlarm() {
    try {
      AlarmScheduling.snooze(this, payload)
      startService(
        Intent(this, AlarmForegroundService::class.java)
          .setAction(AlarmForegroundService.ACTION_STOP_ALARM)
          .putExtra("alarmId", payload.alarmId)
          .putExtra("reason", "snoozed"),
      )
      finish()
    } catch (_: Exception) {
      message.text = "Could not delay this alarm. It is still ringing."
    }
  }

  private fun payloadFromIntent(): AlarmPayload? {
    intent.getStringExtra(AlarmScheduling.EXTRA_PAYLOAD)
      ?.let { raw -> runCatching { AlarmPayload.fromJson(raw) }.getOrNull() }
      ?.let { return it }
    ActiveAlarmStore(this).payload()?.let { return it }
    val alarmId = intent.getStringExtra("alarmId") ?: return null
    return AlarmRegistry(this).get(alarmId) ?: AlarmPayload(
      alarmId = alarmId,
      label = intent.getStringExtra("label") ?: "Alarm",
      triggerAtEpochMillis = System.currentTimeMillis(),
      hour = 0,
      minute = 0,
      repeatDays = emptyList(),
      vibrationEnabled = true,
      soundId = "default",
      challengeType = intent.getStringExtra("challengeType") ?: "shape-photo",
    )
  }
}
