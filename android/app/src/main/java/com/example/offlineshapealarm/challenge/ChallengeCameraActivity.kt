package com.example.offlineshapealarm.challenge

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Region
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.util.Size
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.example.offlineshapealarm.BuildConfig
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class ChallengeCameraActivity : ComponentActivity() {
  companion object {
    const val EXTRA_TARGET = "target"
    const val EXTRA_DIFFICULTY = "difficulty"
    const val EXTRA_DEBUG = "debug"
    const val EXTRA_ERROR = "error"
    const val EXTRA_MATCH_CONFIDENCE = "matchConfidence"
    const val EXTRA_PROCESSING_DURATION_MS = "processingDurationMs"
    const val EXTRA_CONTOUR_AREA = "contourArea"
    const val EXTRA_CONTOUR_COUNT = "contourCount"
    const val EXTRA_BORDER_CONTACT_RATIO = "borderContactRatio"
    private const val FRAME_INTERVAL_MS = 100L
    private const val REQUIRED_MATCH_MS = 1_000L
    private const val TAG = "ShapeCameraChallenge"
  }

  private lateinit var previewFrame: AspectRatioFrameLayout
  private lateinit var previewView: PreviewView
  private lateinit var target: String
  private lateinit var difficulty: String
  private lateinit var feedback: TextView
  private lateinit var guide: TargetContourGuideView
  private var debugOverlay: ShapeDetectionDebugOverlayView? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var imageAnalysis: ImageAnalysis? = null
  private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val detectionPipeline = ShapeDetectionPipeline()
  private val stabilityTracker = DetectionStabilityTracker(requiredStableMs = REQUIRED_MATCH_MS)
  private var lastFrameAt = 0L
  private var luminanceBuffer = IntArray(0)
  private var chromaUBuffer = IntArray(0)
  private var chromaVBuffer = IntArray(0)
  private var lastMatchConfidence = 0.0
  private var lastAnalysis: ShapeAnalysis? = null
  private var cameraActive = false
  private var accepting = false
  private var debugEnabled = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    target = normalizeTarget(intent.getStringExtra(EXTRA_TARGET))
    difficulty = intent.getStringExtra(EXTRA_DIFFICULTY) ?: "normal"
    debugEnabled = BuildConfig.DEBUG && intent.getBooleanExtra(EXTRA_DEBUG, false)

    val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
    previewFrame = AspectRatioFrameLayout(this)
    previewView = PreviewView(this).apply {
      scaleType = PreviewView.ScaleType.FIT_CENTER
      implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    }
    previewFrame.addView(
      previewView,
      FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
    )
    guide = TargetContourGuideView(this, target)
    previewFrame.addView(
      guide,
      FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
    )
    if (debugEnabled) {
      debugOverlay = ShapeDetectionDebugOverlayView(this)
      previewFrame.addView(
        debugOverlay,
        FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
      )
    }
    root.addView(
      previewFrame,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT,
        Gravity.CENTER,
      ),
    )

    val title = TextView(this).apply {
      text = "Align a ${targetDescription()} shape inside the light guide"
      setTextColor(Color.WHITE)
      setTextSize(16f)
      setPadding(dp(18), dp(12), dp(18), dp(12))
      setBackgroundColor(Color.argb(145, 15, 23, 42))
      gravity = Gravity.CENTER
    }
    root.addView(
      title,
      FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP),
    )

    feedback = TextView(this).apply {
      text = "Move object to the center"
      setTextColor(Color.WHITE)
      setTextSize(16f)
      gravity = Gravity.CENTER
      setPadding(dp(16), dp(12), dp(16), dp(12))
      setBackgroundColor(Color.argb(170, 15, 23, 42))
    }
    root.addView(
      feedback,
      FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM).apply {
        setMargins(dp(24), dp(8), dp(24), dp(24))
      },
    )
    setContentView(root)
  }

  override fun onResume() {
    super.onResume()
    cameraActive = true
    startCamera()
  }

  override fun onPause() {
    cameraActive = false
    stabilityTracker.reset()
    lastMatchConfidence = 0.0
    lastFrameAt = 0L
    stopCamera()
    super.onPause()
  }

  override fun onDestroy() {
    analysisExecutor.shutdownNow()
    super.onDestroy()
  }

  private fun startCamera() {
    val providerFuture = ProcessCameraProvider.getInstance(this)
    providerFuture.addListener(
      {
        if (!cameraActive || isFinishing) return@addListener
        runCatching {
          cameraProvider = providerFuture.get()
          bindCameraUseCases(cameraProvider!!)
        }.onFailure {
          finishWithError("Camera preview is unavailable.")
        }
      },
      ContextCompat.getMainExecutor(this),
    )
  }

  private fun bindCameraUseCases(provider: ProcessCameraProvider) {
    @Suppress("DEPRECATION")
    val targetRotation = windowManager.defaultDisplay.rotation
    val resolution = Size(640, 480)
    val preview = Preview.Builder()
      .setTargetResolution(resolution)
      .setTargetRotation(targetRotation)
      .build()
      .also { it.setSurfaceProvider(previewView.surfaceProvider) }
    val analysis = ImageAnalysis.Builder()
      .setTargetResolution(resolution)
      .setTargetRotation(targetRotation)
      .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also { it.setAnalyzer(analysisExecutor, ::analyzeImage) }
    provider.unbindAll()
    provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
    imageAnalysis = analysis
  }

  private fun stopCamera() {
    imageAnalysis?.clearAnalyzer()
    imageAnalysis = null
    cameraProvider?.unbindAll()
  }

  private fun analyzeImage(image: ImageProxy) {
    try {
      if (!cameraActive || accepting || isFinishing) return
      val now = SystemClock.elapsedRealtime()
      if (now - lastFrameAt < FRAME_INTERVAL_MS) return
      lastFrameAt = now
      val planes = image.planes
      val luminancePlane = planes.firstOrNull() ?: return
      val sourceWidth = image.width
      val sourceHeight = image.height
      val requiredSize = sourceWidth * sourceHeight
      if (luminanceBuffer.size != requiredSize) luminanceBuffer = IntArray(requiredSize)
      copyLuminance(luminancePlane.buffer, luminancePlane.rowStride, luminancePlane.pixelStride, sourceWidth, sourceHeight, luminanceBuffer)
      val chromaAvailable = planes.size >= 3
      if (chromaAvailable) {
        if (chromaUBuffer.size != requiredSize) chromaUBuffer = IntArray(requiredSize)
        if (chromaVBuffer.size != requiredSize) chromaVBuffer = IntArray(requiredSize)
        copyChroma(
          planes[1].buffer,
          planes[1].rowStride,
          planes[1].pixelStride,
          sourceWidth,
          sourceHeight,
          chromaUBuffer,
        )
        copyChroma(
          planes[2].buffer,
          planes[2].rowStride,
          planes[2].pixelStride,
          sourceWidth,
          sourceHeight,
          chromaVBuffer,
        )
      }
      val rotationDegrees = image.imageInfo.rotationDegrees
      updatePreviewAspect(sourceWidth, sourceHeight, rotationDegrees)
      val analysis = detectionPipeline.analyze(
        luminance = luminanceBuffer,
        sourceWidth = sourceWidth,
        sourceHeight = sourceHeight,
        targetValue = target,
        difficulty = difficulty,
        rotationDegrees = rotationDegrees,
        includeDebug = debugEnabled,
        chromaU = if (chromaAvailable) chromaUBuffer else null,
        chromaV = if (chromaAvailable) chromaVBuffer else null,
      )
      runOnUiThread {
        if (cameraActive && !accepting && !isFinishing) updateGuideFromAnalysis(analysis)
      }
    } catch (error: Exception) {
      Log.w(TAG, "Frame analysis failed", error)
      runOnUiThread {
        if (cameraActive && !accepting && !isFinishing) resetMatch("No object detected", GuideState.NEUTRAL)
      }
    } finally {
      image.close()
    }
  }

  private fun copyLuminance(
    buffer: java.nio.ByteBuffer,
    rowStride: Int,
    pixelStride: Int,
    width: Int,
    height: Int,
    destination: IntArray,
  ) {
    for (y in 0 until height) {
      val rowOffset = y * rowStride
      for (x in 0 until width) {
        destination[y * width + x] = buffer.get(rowOffset + x * pixelStride).toInt() and 0xFF
      }
    }
  }

  private fun copyChroma(
    buffer: java.nio.ByteBuffer,
    rowStride: Int,
    pixelStride: Int,
    width: Int,
    height: Int,
    destination: IntArray,
  ) {
    val chromaWidth = (width + 1) / 2
    val chromaHeight = (height + 1) / 2
    for (y in 0 until height) {
      val sourceY = min(y / 2, chromaHeight - 1)
      val rowOffset = sourceY * rowStride
      for (x in 0 until width) {
        val sourceX = min(x / 2, chromaWidth - 1)
        destination[y * width + x] = buffer.get(rowOffset + sourceX * pixelStride).toInt() and 0xFF
      }
    }
  }

  private fun updatePreviewAspect(sourceWidth: Int, sourceHeight: Int, rotationDegrees: Int) {
    val rotated = rotationDegrees % 180 != 0
    val previewWidth = if (rotated) sourceHeight else sourceWidth
    val previewHeight = if (rotated) sourceWidth else sourceHeight
    runOnUiThread { previewFrame.setAspectRatio(previewWidth, previewHeight) }
  }

  private fun updateGuideFromAnalysis(analysis: ShapeAnalysis) {
    lastAnalysis = analysis
    val temporal = stabilityTracker.update(analysis, SystemClock.elapsedRealtime())
    guide.setState(
      when {
        temporal.stable -> GuideState.MATCHED
        temporal.guideMatched -> GuideState.CANDIDATE
        analysis.state == DetectionState.MISMATCH -> GuideState.MISMATCH
        else -> GuideState.NEUTRAL
      },
    )
    feedback.text = temporal.feedback
    lastMatchConfidence = temporal.smoothedConfidence
    debugOverlay?.update(analysis, temporal)
    if (debugEnabled) {
      Log.d(TAG, "${analysis.structuredLog()} rolling=${formatConfidence(temporal.smoothedConfidence)} progress=${formatConfidence(temporal.progress)}")
    }
    if (temporal.stable) acceptStableMatch()
  }

  private fun resetMatch(message: String, state: GuideState) {
    stabilityTracker.reset()
    lastMatchConfidence = 0.0
    guide.setState(state)
    feedback.text = message
  }

  private fun acceptStableMatch() {
    if (accepting) return
    accepting = true
    imageAnalysis?.clearAnalyzer()
    guide.setState(GuideState.MATCHED)
    feedback.text = "Shape detected"
    val result = Intent()
      .putExtra(EXTRA_MATCH_CONFIDENCE, lastMatchConfidence)
      .putExtra(EXTRA_PROCESSING_DURATION_MS, lastAnalysis?.processingDurationMs?.toDouble() ?: 0.0)
      .putExtra(EXTRA_CONTOUR_AREA, lastAnalysis?.features?.contourArea ?: 0.0)
      .putExtra(EXTRA_CONTOUR_COUNT, lastAnalysis?.candidateCount ?: 0)
      .putExtra(EXTRA_BORDER_CONTACT_RATIO, lastAnalysis?.features?.borderContactRatio ?: 0.0)
    setResult(Activity.RESULT_OK, result)
    finish()
  }

  private fun finishWithError(message: String) {
    setResult(Activity.RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, message))
    finish()
  }

  private fun normalizeTarget(value: String?): String = when (value) {
    "circle", "triangle", "square", "rectangle", "spoon" -> value
    else -> "circle"
  }

  private fun targetDescription(): String = when (target) {
    "square" -> "square"
    "rectangle" -> "rectangle"
    "triangle" -> "triangle"
    "spoon" -> "spoon-like"
    else -> "round"
  }

  private fun formatConfidence(value: Double): String = "%.2f".format(java.util.Locale.US, value)

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}

private enum class GuideState { NEUTRAL, CANDIDATE, MATCHED, MISMATCH }

private class TargetContourGuideView(context: Context, private val target: String) : android.view.View(context) {
  private val panelPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val panelStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = dp(2).toFloat() }
  private val shapeFill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val shapeStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = dp(3).toFloat() }
  private var state = GuideState.NEUTRAL

  fun setState(nextState: GuideState) {
    if (state == nextState) return
    state = nextState
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val side = min(width, height) * CENTER_GUIDE_SIZE_RATIO
    val guide = RectF(width / 2f - side / 2, height / 2f - side / 2, width / 2f + side / 2, height / 2f + side / 2)
    val guidePath = Path().apply { addRoundRect(guide, dp(24).toFloat(), dp(24).toFloat(), Path.Direction.CW) }
    canvas.save()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      canvas.clipOutPath(guidePath)
    } else {
      @Suppress("DEPRECATION")
      canvas.clipPath(guidePath, Region.Op.DIFFERENCE)
    }
    canvas.drawColor(Color.argb(118, 0, 0, 0))
    canvas.restore()
    val colors = when (state) {
      GuideState.MATCHED -> GuideColors(Color.rgb(74, 222, 128), Color.argb(64, 34, 197, 94), Color.argb(80, 34, 197, 94))
      GuideState.CANDIDATE -> GuideColors(Color.rgb(250, 204, 21), Color.argb(54, 250, 204, 21), Color.argb(70, 250, 204, 21))
      GuideState.MISMATCH -> GuideColors(Color.rgb(248, 113, 113), Color.argb(56, 239, 68, 68), Color.argb(72, 239, 68, 68))
      GuideState.NEUTRAL -> GuideColors(Color.rgb(253, 230, 138), Color.argb(52, 255, 255, 255), Color.argb(64, 255, 255, 255))
    }
    panelPaint.color = colors.panel
    panelStroke.color = colors.stroke
    shapeFill.color = colors.shape
    shapeStroke.color = colors.stroke
    canvas.drawRoundRect(guide, dp(24).toFloat(), dp(24).toFloat(), panelPaint)
    canvas.drawRoundRect(guide, dp(24).toFloat(), dp(24).toFloat(), panelStroke)
    drawTargetContour(canvas, guide)
  }

  private fun drawTargetContour(canvas: Canvas, guide: RectF) {
    val centerX = guide.centerX()
    val centerY = guide.centerY()
    val shapeSize = guide.width() * 0.54f
    val shapeBounds = RectF(centerX - shapeSize / 2, centerY - shapeSize / 2, centerX + shapeSize / 2, centerY + shapeSize / 2)
    when (target) {
      "square" -> drawRoundedRect(canvas, shapeBounds)
      "rectangle" -> drawRoundedRect(canvas, RectF(shapeBounds.left, centerY - shapeSize * 0.3f, shapeBounds.right, centerY + shapeSize * 0.3f))
      "triangle" -> {
        val triangle = Path().apply {
          moveTo(centerX, shapeBounds.top)
          lineTo(shapeBounds.left, shapeBounds.bottom)
          lineTo(shapeBounds.right, shapeBounds.bottom)
          close()
        }
        canvas.drawPath(triangle, shapeFill)
        canvas.drawPath(triangle, shapeStroke)
      }
      "spoon" -> drawSpoon(canvas, centerX, centerY, shapeSize)
      else -> {
        canvas.drawOval(shapeBounds, shapeFill)
        canvas.drawOval(shapeBounds, shapeStroke)
      }
    }
  }

  private fun drawRoundedRect(canvas: Canvas, bounds: RectF) {
    val radius = dp(10).toFloat()
    canvas.drawRoundRect(bounds, radius, radius, shapeFill)
    canvas.drawRoundRect(bounds, radius, radius, shapeStroke)
  }

  private fun drawSpoon(canvas: Canvas, centerX: Float, centerY: Float, size: Float) {
    val bowl = RectF(centerX - size * 0.23f, centerY - size * 0.45f, centerX + size * 0.23f, centerY + size * 0.02f)
    val handle = RectF(centerX - size * 0.075f, centerY - size * 0.02f, centerX + size * 0.075f, centerY + size * 0.45f)
    canvas.drawOval(bowl, shapeFill)
    canvas.drawRoundRect(handle, size * 0.075f, size * 0.075f, shapeFill)
    canvas.drawOval(bowl, shapeStroke)
    canvas.drawRoundRect(handle, size * 0.075f, size * 0.075f, shapeStroke)
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}

private class AspectRatioFrameLayout(context: Context) : FrameLayout(context) {
  private var aspectRatio = 0f

  fun setAspectRatio(contentWidth: Int, contentHeight: Int) {
    if (contentWidth <= 0 || contentHeight <= 0) return
    val nextRatio = contentWidth.toFloat() / contentHeight
    if (aspectRatio == nextRatio) return
    aspectRatio = nextRatio
    requestLayout()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val availableWidth = MeasureSpec.getSize(widthMeasureSpec)
    val availableHeight = MeasureSpec.getSize(heightMeasureSpec)
    if (aspectRatio <= 0f || availableWidth == 0 || availableHeight == 0) {
      super.onMeasure(widthMeasureSpec, heightMeasureSpec)
      return
    }
    var measuredWidth = availableWidth
    var measuredHeight = availableHeight
    if (availableWidth.toFloat() / availableHeight > aspectRatio) {
      measuredWidth = (availableHeight * aspectRatio).roundToInt()
    } else {
      measuredHeight = (availableWidth / aspectRatio).roundToInt()
    }
    super.onMeasure(
      MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY),
    )
    setMeasuredDimension(measuredWidth, measuredHeight)
  }
}

private data class GuideColors(val stroke: Int, val panel: Int, val shape: Int)
