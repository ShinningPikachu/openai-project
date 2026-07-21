package com.example.offlineshapealarm.challenge

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import kotlin.math.max
import kotlin.math.min

internal class ShapeDetectionDebugOverlayView(context: Context) : View(context) {
  private val panelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(210, 15, 23, 42) }
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    textSize = dp(11).toFloat()
  }
  private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(130, 34, 197, 94) }
  private val contourPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.rgb(248, 113, 113)
    style = Paint.Style.STROKE
    strokeWidth = dp(1).toFloat()
  }
  private var analysis: ShapeAnalysis? = null
  private var temporal: TemporalDetection? = null

  init {
    setWillNotDraw(false)
  }

  fun update(nextAnalysis: ShapeAnalysis, nextTemporal: TemporalDetection) {
    analysis = nextAnalysis
    temporal = nextTemporal
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val current = analysis ?: return
    val currentTemporal = temporal ?: return
    val padding = dp(8).toFloat()
    val top = dp(64).toFloat()
    val panelWidth = min(width - padding * 2, dp(344).toFloat())
    val panelHeight = min(height - top - padding, dp(282).toFloat())
    val panel = RectF(padding, top, padding + panelWidth, top + panelHeight)
    canvas.drawRoundRect(panel, dp(8).toFloat(), dp(8).toFloat(), panelPaint)

    val imageSide = min(dp(106).toFloat(), panelHeight - padding * 2)
    val imageBounds = RectF(panel.left + padding, panel.top + padding, panel.left + padding + imageSide, panel.top + padding + imageSide)
    current.debugSnapshot?.let { drawSnapshot(canvas, it, imageBounds) }

    val textLeft = imageBounds.right + padding
    val textTop = panel.top + padding + textPaint.textSize
    val score = current.featureScores
    val lines = listOf(
      "target=${current.target.id} detected=${current.classifiedShape?.id ?: "-"}",
      "state=${currentTemporal.state.wireValue} confidence=${format(currentTemporal.smoothedConfidence)}",
      "threshold=${format(current.acceptanceThreshold)} stable=${(currentTemporal.progress * 100).toInt()}%",
      "contour=${format(score?.contourSimilarity)} silhouette=${format(score?.silhouette)}",
      "poly=${format(score?.polygon)} circle=${format(score?.circularity)} axis=${format(score?.axisRatio)}",
      "hu=${format(score?.huMoments)} width=${format(score?.widthProfile)} color=${format(score?.colorUniformity)} solid=${format(score?.solidity)}",
      "extent=${format(score?.extent)} area=${format(score?.area)} pos=${format(score?.position)} border=${format(current.features?.borderContactRatio)}",
      "candidates=${current.candidateCount} time=${current.processingDurationMs}ms",
      "reason=${current.failureReason ?: "accepted"}",
      "mask=${current.debugSnapshot?.candidateSource ?: "-"}",
      "region=${current.debugSnapshot?.regionSummary ?: "luminance fallback"}",
    )
    val maxLines = ((panel.bottom - textTop - padding) / (textPaint.textSize * 1.28f)).toInt().coerceAtLeast(0)
    lines.take(maxLines).forEachIndexed { index, line ->
      canvas.drawText(line, textLeft, textTop + index * textPaint.textSize * 1.28f, textPaint)
    }
  }

  private fun drawSnapshot(canvas: Canvas, snapshot: DebugFrameSnapshot, bounds: RectF) {
    val sampleStep = max(1, max(snapshot.width, snapshot.height) / 72)
    val cellWidth = bounds.width() * sampleStep / snapshot.width
    val cellHeight = bounds.height() * sampleStep / snapshot.height
    for (y in 0 until snapshot.height step sampleStep) {
      for (x in 0 until snapshot.width step sampleStep) {
        val value = snapshot.normalizedFrame[y * snapshot.width + x].coerceIn(0, 255)
        imagePaint.color = Color.rgb(value, value, value)
        val left = bounds.left + x.toFloat() / snapshot.width * bounds.width()
        val top = bounds.top + y.toFloat() / snapshot.height * bounds.height()
        canvas.drawRect(left, top, left + cellWidth + 1, top + cellHeight + 1, imagePaint)
        if (snapshot.selectedMask?.get(y * snapshot.width + x) == true) {
          canvas.drawRect(left, top, left + cellWidth + 1, top + cellHeight + 1, maskPaint)
        }
      }
    }
    val hull = snapshot.hull
    if (hull.size > 1) {
      val path = Path()
      hull.forEachIndexed { index, point ->
        val x = bounds.left + point.x.toFloat() / snapshot.width * bounds.width()
        val y = bounds.top + point.y.toFloat() / snapshot.height * bounds.height()
        if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
      }
      path.close()
      canvas.drawPath(path, contourPaint)
    }
  }

  private fun format(value: Double?): String = value?.let { "%.2f".format(java.util.Locale.US, it) } ?: "-"

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
