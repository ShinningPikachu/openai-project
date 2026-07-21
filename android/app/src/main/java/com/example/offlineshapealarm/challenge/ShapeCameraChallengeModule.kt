package com.example.offlineshapealarm.challenge

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class ShapeCameraChallengeModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener, PermissionListener {
  private var permissionPromise: Promise? = null
  private var capturePromise: Promise? = null
  private var target = "circle"

  init {
    context.addActivityEventListener(this)
  }

  override fun getName() = "ShapeCameraChallenge"

  @ReactMethod
  fun getCameraPermissionStatus(promise: Promise) = promise.resolve(status())

  @ReactMethod
  fun requestCameraPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < 23) {
      promise.resolve("granted")
      return
    }
    val activity = currentActivity as? PermissionAwareActivity ?: run {
      promise.resolve(status())
      return
    }
    permissionPromise = promise
    activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_PERMISSION_REQUEST, this)
  }

  @ReactMethod
  fun captureAndAnalyze(targetShapeId: String, challengeDifficulty: String, promise: Promise) {
    if (status() != "granted") {
      promise.reject("CAMERA_PERMISSION_DENIED", "Camera permission is required.")
      return
    }
    if (capturePromise != null) {
      promise.reject("CAMERA_CAPTURE_IN_PROGRESS", "A camera challenge is already open.")
      return
    }
    val activity = currentActivity ?: run {
      promise.reject("CAMERA_UNAVAILABLE", "No active Android activity.")
      return
    }
    target = when (targetShapeId) {
      "square", "rectangle", "circle", "triangle", "spoon" -> targetShapeId
      else -> "circle"
    }
    capturePromise = promise
    activity.startActivityForResult(
      Intent(activity, ChallengeCameraActivity::class.java)
        .putExtra(ChallengeCameraActivity.EXTRA_TARGET, target)
        .putExtra(ChallengeCameraActivity.EXTRA_DIFFICULTY, challengeDifficulty),
      CAMERA_CAPTURE_REQUEST,
    )
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != CAMERA_CAPTURE_REQUEST) return
    val promise = capturePromise ?: return
    capturePromise = null
    if (resultCode != Activity.RESULT_OK) {
      val error = data?.getStringExtra(ChallengeCameraActivity.EXTRA_ERROR)
      promise.reject(
        if (error == null) "CAMERA_CHALLENGE_CANCELLED" else "CAMERA_UNAVAILABLE",
        error ?: "Camera challenge was cancelled.",
      )
      return
    }
    val resultData = data?.takeIf { it.hasExtra(ChallengeCameraActivity.EXTRA_MATCH_CONFIDENCE) }
    if (resultData == null) {
      promise.reject("CAMERA_RESULT_MISSING", "Camera challenge did not return a shape result.")
      return
    }
    val stableMatchConfidence = resultData.getDoubleExtra(ChallengeCameraActivity.EXTRA_MATCH_CONFIDENCE, 0.0)
    try {
      val result = Arguments.createMap().apply {
        putBoolean("accepted", true)
        putDouble("confidence", stableMatchConfidence)
        putString("targetShapeId", target)
        putDouble("processingDurationMs", resultData.getDoubleExtra(ChallengeCameraActivity.EXTRA_PROCESSING_DURATION_MS, 0.0))
      }
      val response = Arguments.createMap()
      response.putNull("image")
      response.putMap("result", result)
      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("CAMERA_RESULT_PROCESSING_FAILED", error.message, error)
    }
  }

  override fun onNewIntent(intent: Intent?) = Unit

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray): Boolean {
    if (requestCode != CAMERA_PERMISSION_REQUEST) return false
    permissionPromise?.resolve(status())
    permissionPromise = null
    return true
  }

  @ReactMethod
  fun openCameraSettings(promise: Promise) {
    context.startActivity(
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        .setData(Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
    promise.resolve(null)
  }

  private fun status(): String = if (
    Build.VERSION.SDK_INT < 23 || context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
  ) {
    "granted"
  } else {
    "denied"
  }

  private companion object {
    const val CAMERA_PERMISSION_REQUEST = 8844
    const val CAMERA_CAPTURE_REQUEST = 8845
  }
}

class ShapeCameraChallengePackage : com.facebook.react.ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext) = listOf(ShapeCameraChallengeModule(context))
  override fun createViewManagers(context: ReactApplicationContext) = emptyList<com.facebook.react.uimanager.ViewManager<*, *>>()
}
