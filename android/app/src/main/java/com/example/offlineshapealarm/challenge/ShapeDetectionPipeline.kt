package com.example.offlineshapealarm.challenge

import java.util.ArrayDeque
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sign
import kotlin.math.sin
import kotlin.math.sqrt

internal const val CENTER_GUIDE_SIZE_RATIO = 0.68f

internal enum class SupportedShape(val id: String) {
  CIRCLE("circle"),
  TRIANGLE("triangle"),
  SQUARE("square"),
  RECTANGLE("rectangle"),
  SPOON("spoon");

  companion object {
    fun from(value: String): SupportedShape = values().firstOrNull { it.id == value } ?: CIRCLE
  }
}

internal enum class DetectionState(val wireValue: String, val feedback: String) {
  NO_OBJECT("no-object-detected", "No object detected"),
  MOVE_INSIDE_GUIDE("move-inside-guide", "Move object inside the guide"),
  MOVE_CLOSER("move-closer", "Move closer"),
  PARTIAL_MATCH("partial-match", "Shape partially matched"),
  HOLD_STEADY("hold-steady", "Hold steady"),
  MATCHED("matched", "Shape detected"),
  MISMATCH("mismatch", "Shape does not match"),
  PROCESSING_FAILED("processing-failed", "No object detected");
}

internal data class DetectionBox(
  val x: Int,
  val y: Int,
  val width: Int,
  val height: Int,
)

internal data class ContourPoint(val x: Int, val y: Int)

internal data class ShapeFeatureVector(
  val contourArea: Double,
  val imageAreaRatio: Double,
  val perimeter: Double,
  val boundingBox: DetectionBox,
  val aspectRatio: Double,
  val orientedAspectRatio: Double,
  val circularity: Double,
  val solidity: Double,
  val convexity: Double,
  val extent: Double,
  val cornerCount: Int,
  val borderContactRatio: Double,
  val centerOffset: Double,
  val huMoments: DoubleArray,
  val radialSignature: DoubleArray,
  val widthProfile: DoubleArray,
  val endWidthRatio: Double,
)

internal data class FeatureScores(
  val contourSimilarity: Double,
  val silhouette: Double,
  val polygon: Double,
  val circularity: Double,
  val aspectRatio: Double,
  val solidity: Double,
  val convexity: Double,
  val extent: Double,
  val huMoments: Double,
  val axisRatio: Double,
  val widthProfile: Double,
  val colorUniformity: Double,
  val area: Double,
  val position: Double,
  val weightedConfidence: Double,
)

internal data class ShapeAnalysis(
  val target: SupportedShape,
  val confidence: Double,
  val acceptanceThreshold: Double,
  val rawAccepted: Boolean,
  val state: DetectionState,
  val failureReason: String?,
  val features: ShapeFeatureVector?,
  val featureScores: FeatureScores?,
  val candidateCount: Int,
  val meanBrightness: Double,
  val processingDurationMs: Long,
  val classifiedShape: SupportedShape?,
)

internal data class FeatureWeights(
  val contourSimilarity: Double,
  val polygon: Double,
  val circularity: Double,
  val aspectRatio: Double,
  val solidity: Double,
  val convexity: Double,
  val extent: Double,
  val huMoments: Double,
  val axisRatio: Double,
  val widthProfile: Double,
  val colorUniformity: Double,
  val area: Double,
  val position: Double,
)

internal data class ColorRegionTolerance(
  val luminanceDistance: Double,
  val chromaDistance: Double,
  val seedCount: Int = 6,
)

internal data class ShapeThresholdConfig(
  val acceptanceEasy: Double,
  val acceptanceNormal: Double,
  val acceptanceHard: Double,
  val partialThreshold: Double,
  val minimumNoiseAreaRatio: Double,
  val minimumAreaRatio: Double,
  val maximumAreaRatio: Double,
  val maximumBorderContact: Double,
  val expectedCorners: Int,
  val expectedCircularity: Double,
  val expectedExtent: Double,
  val expectedAxisRatio: Double,
  val weights: FeatureWeights,
  val colorTolerance: ColorRegionTolerance,
) {
  fun acceptanceThreshold(difficulty: String): Double = when (difficulty) {
    "easy" -> acceptanceEasy
    "hard" -> acceptanceHard
    else -> acceptanceNormal
  }
}

internal object ShapeThresholdConfiguration {
  private val neutralColorTolerance = ColorRegionTolerance(
    luminanceDistance = 42.0,
    chromaDistance = 34.0,
  )
  private val reflectiveColorTolerance = ColorRegionTolerance(
    luminanceDistance = 54.0,
    chromaDistance = 42.0,
    seedCount = 8,
  )
  private val commonWeights = FeatureWeights(
    contourSimilarity = 0.2,
    polygon = 0.12,
    circularity = 0.12,
    aspectRatio = 0.1,
    solidity = 0.07,
    convexity = 0.04,
    extent = 0.07,
    huMoments = 0.12,
    axisRatio = 0.06,
    widthProfile = 0.07,
    colorUniformity = 0.05,
    area = 0.05,
    position = 0.05,
  )

  private val configurations = mapOf(
    SupportedShape.CIRCLE to ShapeThresholdConfig(
      acceptanceEasy = 0.48,
      acceptanceNormal = 0.58,
      acceptanceHard = 0.68,
      partialThreshold = 0.35,
      minimumNoiseAreaRatio = 0.003,
      minimumAreaRatio = 0.018,
      maximumAreaRatio = 0.84,
      maximumBorderContact = 0.34,
      expectedCorners = 0,
      expectedCircularity = 0.98,
      expectedExtent = 0.79,
      expectedAxisRatio = 1.0,
      weights = commonWeights.copy(circularity = 0.17, polygon = 0.08, aspectRatio = 0.12),
      colorTolerance = neutralColorTolerance,
    ),
    SupportedShape.SQUARE to ShapeThresholdConfig(
      acceptanceEasy = 0.46,
      acceptanceNormal = 0.56,
      acceptanceHard = 0.66,
      partialThreshold = 0.34,
      minimumNoiseAreaRatio = 0.003,
      minimumAreaRatio = 0.018,
      maximumAreaRatio = 0.84,
      maximumBorderContact = 0.34,
      expectedCorners = 4,
      expectedCircularity = PI / 4,
      expectedExtent = 0.95,
      expectedAxisRatio = 1.0,
      weights = commonWeights.copy(polygon = 0.17, contourSimilarity = 0.18, extent = 0.09),
      colorTolerance = neutralColorTolerance,
    ),
    SupportedShape.TRIANGLE to ShapeThresholdConfig(
      acceptanceEasy = 0.43,
      acceptanceNormal = 0.53,
      acceptanceHard = 0.63,
      partialThreshold = 0.31,
      minimumNoiseAreaRatio = 0.003,
      minimumAreaRatio = 0.018,
      maximumAreaRatio = 0.84,
      maximumBorderContact = 0.34,
      expectedCorners = 3,
      expectedCircularity = 0.6,
      expectedExtent = 0.5,
      expectedAxisRatio = 1.0,
      weights = commonWeights.copy(polygon = 0.18, contourSimilarity = 0.18, circularity = 0.1),
      colorTolerance = neutralColorTolerance,
    ),
    SupportedShape.RECTANGLE to ShapeThresholdConfig(
      acceptanceEasy = 0.46,
      acceptanceNormal = 0.56,
      acceptanceHard = 0.66,
      partialThreshold = 0.34,
      minimumNoiseAreaRatio = 0.003,
      minimumAreaRatio = 0.018,
      maximumAreaRatio = 0.84,
      maximumBorderContact = 0.34,
      expectedCorners = 4,
      expectedCircularity = 0.7,
      expectedExtent = 0.95,
      expectedAxisRatio = 2.0,
      weights = commonWeights.copy(polygon = 0.17, contourSimilarity = 0.18, aspectRatio = 0.14, extent = 0.09),
      colorTolerance = neutralColorTolerance,
    ),
    SupportedShape.SPOON to ShapeThresholdConfig(
      acceptanceEasy = 0.45,
      acceptanceNormal = 0.55,
      acceptanceHard = 0.65,
      partialThreshold = 0.32,
      minimumNoiseAreaRatio = 0.003,
      minimumAreaRatio = 0.018,
      maximumAreaRatio = 0.84,
      maximumBorderContact = 0.3,
      expectedCorners = 0,
      expectedCircularity = 0.48,
      expectedExtent = 0.46,
      expectedAxisRatio = 2.15,
      weights = commonWeights.copy(contourSimilarity = 0.17, polygon = 0.0, circularity = 0.05, aspectRatio = 0.12, huMoments = 0.14, axisRatio = 0.08, widthProfile = 0.2),
      colorTolerance = reflectiveColorTolerance,
    ),
  )

  fun forShape(shape: SupportedShape): ShapeThresholdConfig = configurations.getValue(shape)
}

internal class ShapeDetectionPipeline(
  private val maxProcessingDimension: Int = 320,
) {
  fun analyze(
    luminance: IntArray,
    sourceWidth: Int,
    sourceHeight: Int,
    targetValue: String,
    difficulty: String,
    rotationDegrees: Int = 0,
    chromaU: IntArray? = null,
    chromaV: IntArray? = null,
  ): ShapeAnalysis {
    val startedAt = System.nanoTime()
    val target = SupportedShape.from(targetValue)
    if (sourceWidth <= 0 || sourceHeight <= 0 || luminance.size < sourceWidth * sourceHeight) {
      return failure(target, DetectionState.PROCESSING_FAILED, 0.0, 0, 0.0, startedAt)
    }
    val prepared = prepareFrame(
      luminance,
      chromaU?.takeIf { it.size >= sourceWidth * sourceHeight },
      chromaV?.takeIf { it.size >= sourceWidth * sourceHeight },
      sourceWidth,
      sourceHeight,
      rotationDegrees,
    )
    if (prepared.width < 24 || prepared.height < 24) {
      return failure(target, DetectionState.PROCESSING_FAILED, 0.0, 0, 0.0, startedAt)
    }
    val normalized = normalizeContrast(prepared.values)
    val denoised = boxBlur(normalized, prepared.width, prepared.height)
    val meanBrightness = denoised.average()
    val configuration = ShapeThresholdConfiguration.forShape(target)
    val evaluated = mutableListOf<CandidateEvaluation>()
    var sawSmallCandidate = false
    var sawGuideViolation = false
    var candidateCount = 0

    fun collectCandidates(masks: List<NamedMask>) {
      masks.forEach { candidateMask ->
        val components = findComponents(
          mask = candidateMask.mask,
          width = prepared.width,
          height = prepared.height,
          source = candidateMask.name,
          minimumNoiseAreaRatio = configuration.minimumNoiseAreaRatio,
        )
          .sortedByDescending { it.area }
          .take(6)
        candidateCount += components.size
        components.forEach { component ->
          val areaRatio = component.area.toDouble() / (prepared.width * prepared.height)
          if (areaRatio < configuration.minimumAreaRatio) {
            sawSmallCandidate = true
            return@forEach
          }
          if (areaRatio > configuration.maximumAreaRatio) {
            sawGuideViolation = true
            return@forEach
          }
          val profile = extractProfile(component, prepared.width, prepared.height)
          if (profile.borderContactRatio > configuration.maximumBorderContact || profile.centerOffset > 0.43) {
            sawGuideViolation = true
            return@forEach
          }
          val scores = scoreCandidate(profile, target, candidateMask.colorUniformity)
          evaluated += CandidateEvaluation(
            component,
            profile,
            scores,
            candidateMask.colorUniformity,
          )
        }
      }
    }

    collectCandidates(
      uniformColorCandidates(
        prepared.values,
        prepared.chromaU,
        prepared.chromaV,
        prepared.width,
        prepared.height,
        configuration.colorTolerance,
      ),
    )
    if (evaluated.isEmpty()) {
      collectCandidates(foregroundCandidates(denoised, prepared.width, prepared.height))
    }

    val usingColorRegion = evaluated.any { it.component.source.startsWith("uniform-color") }
    val selected = evaluated.maxWithOrNull(
      if (usingColorRegion) {
        compareBy<CandidateEvaluation> { it.primaryRegionScore }
          .thenBy { it.featureScores.weightedConfidence }
          .thenBy { 1 - it.profile.centerOffset }
      } else {
        compareBy<CandidateEvaluation> { it.featureScores.weightedConfidence }
          .thenBy { 1 - it.profile.centerOffset }
      },
    )
    if (selected == null) {
      val state = when {
        sawGuideViolation -> DetectionState.MOVE_INSIDE_GUIDE
        sawSmallCandidate -> DetectionState.MOVE_CLOSER
        else -> DetectionState.NO_OBJECT
      }
      return failure(target, state, configuration.acceptanceThreshold(difficulty), candidateCount, meanBrightness, startedAt)
    }

    val targetScore = selected.featureScores.weightedConfidence
    val allScores = SupportedShape.values().associateWith {
      scoreCandidate(selected.profile, it, selected.colorUniformity).weightedConfidence
    }
    val bestAlternative = allScores.maxByOrNull { it.value }?.key
    val threshold = configuration.acceptanceThreshold(difficulty)
    val bestAlternativeScore = bestAlternative?.let(allScores::getValue) ?: 0.0
    val targetIsCompetitive = bestAlternative == target || targetScore >= (bestAlternativeScore - 0.06)
    val hasCompetingObject = evaluated.any { candidate ->
      candidate !== selected &&
        candidate.component.area >= selected.component.area * 0.45 &&
        candidate.profile.centerOffset <= 0.43 &&
        distinctRegion(candidate.component.box, selected.component.box)
    }
    val rawAccepted = targetScore >= threshold && targetIsCompetitive && !hasCompetingObject
    val state = when {
      rawAccepted -> DetectionState.MATCHED
      hasCompetingObject -> DetectionState.MISMATCH
      targetScore >= configuration.partialThreshold && targetIsCompetitive -> DetectionState.PARTIAL_MATCH
      else -> DetectionState.MISMATCH
    }
    return ShapeAnalysis(
      target = target,
      confidence = targetScore,
      acceptanceThreshold = threshold,
      rawAccepted = rawAccepted,
      state = state,
      failureReason = if (hasCompetingObject) "multiple-objects" else failureReasonFor(state),
      features = selected.profile.toFeatureVector(),
      featureScores = selected.featureScores,
      candidateCount = candidateCount,
      meanBrightness = meanBrightness,
      processingDurationMs = elapsedMillis(startedAt),
      classifiedShape = bestAlternative,
    )
  }

  private fun failure(
    target: SupportedShape,
    state: DetectionState,
    threshold: Double,
    candidateCount: Int,
    meanBrightness: Double,
    startedAt: Long,
  ): ShapeAnalysis = ShapeAnalysis(
    target = target,
    confidence = 0.0,
    acceptanceThreshold = threshold,
    rawAccepted = false,
    state = state,
    failureReason = failureReasonFor(state),
    features = null,
    featureScores = null,
    candidateCount = candidateCount,
    meanBrightness = meanBrightness,
    processingDurationMs = elapsedMillis(startedAt),
    classifiedShape = null,
  )

  private fun failureReasonFor(state: DetectionState): String? = when (state) {
    DetectionState.MATCHED, DetectionState.HOLD_STEADY -> null
    DetectionState.NO_OBJECT, DetectionState.PROCESSING_FAILED -> "no-object-found"
    DetectionState.MOVE_CLOSER -> "object-too-small"
    DetectionState.MOVE_INSIDE_GUIDE -> "object-not-centered"
    DetectionState.PARTIAL_MATCH, DetectionState.MISMATCH -> "shape-does-not-match"
  }

  private fun distinctRegion(first: DetectionBox, second: DetectionBox): Boolean {
    val overlapWidth = max(0, min(first.x + first.width, second.x + second.width) - max(first.x, second.x))
    val overlapHeight = max(0, min(first.y + first.height, second.y + second.height) - max(first.y, second.y))
    val overlap = overlapWidth * overlapHeight
    val smallerArea = min(first.width * first.height, second.width * second.height).coerceAtLeast(1)
    return overlap.toDouble() / smallerArea < 0.55
  }

  private fun prepareFrame(
    source: IntArray,
    chromaU: IntArray?,
    chromaV: IntArray?,
    sourceWidth: Int,
    sourceHeight: Int,
    rotationDegrees: Int,
  ): PreparedFrame {
    val normalizedRotation = ((rotationDegrees % 360) + 360) % 360
    val rotatedWidth = if (normalizedRotation == 90 || normalizedRotation == 270) sourceHeight else sourceWidth
    val rotatedHeight = if (normalizedRotation == 90 || normalizedRotation == 270) sourceWidth else sourceHeight
    val scale = min(1.0, maxProcessingDimension.toDouble() / max(rotatedWidth, rotatedHeight).coerceAtLeast(1))
    val displayWidth = (rotatedWidth * scale).roundToInt().coerceAtLeast(1)
    val displayHeight = (rotatedHeight * scale).roundToInt().coerceAtLeast(1)
    val display = IntArray(displayWidth * displayHeight)
    val displayU = chromaU?.let { IntArray(display.size) }
    val displayV = chromaV?.let { IntArray(display.size) }
    for (displayY in 0 until displayHeight) {
      val rotatedY = min(rotatedHeight - 1, (displayY / scale).toInt())
      for (displayX in 0 until displayWidth) {
        val rotatedX = min(rotatedWidth - 1, (displayX / scale).toInt())
        val sourcePoint = sourcePointForRotation(rotatedX, rotatedY, sourceWidth, sourceHeight, normalizedRotation)
        val displayIndex = displayY * displayWidth + displayX
        val sourceIndex = sourcePoint.y * sourceWidth + sourcePoint.x
        display[displayIndex] = source[sourceIndex]
        displayU?.set(displayIndex, chromaU!![sourceIndex])
        displayV?.set(displayIndex, chromaV!![sourceIndex])
      }
    }
    val guideSide = (min(displayWidth, displayHeight) * CENTER_GUIDE_SIZE_RATIO).roundToInt().coerceAtLeast(1)
    val guideLeft = ((displayWidth - guideSide) / 2).coerceAtLeast(0)
    val guideTop = ((displayHeight - guideSide) / 2).coerceAtLeast(0)
    val crop = IntArray(guideSide * guideSide)
    val cropU = displayU?.let { IntArray(crop.size) }
    val cropV = displayV?.let { IntArray(crop.size) }
    for (y in 0 until guideSide) {
      System.arraycopy(display, (guideTop + y) * displayWidth + guideLeft, crop, y * guideSide, guideSide)
      displayU?.let { System.arraycopy(it, (guideTop + y) * displayWidth + guideLeft, cropU!!, y * guideSide, guideSide) }
      displayV?.let { System.arraycopy(it, (guideTop + y) * displayWidth + guideLeft, cropV!!, y * guideSide, guideSide) }
    }
    return PreparedFrame(crop, cropU, cropV, guideSide, guideSide)
  }

  private fun sourcePointForRotation(
    x: Int,
    y: Int,
    sourceWidth: Int,
    sourceHeight: Int,
    rotation: Int,
  ): ContourPoint = when (rotation) {
    90 -> ContourPoint(y, sourceHeight - 1 - x)
    180 -> ContourPoint(sourceWidth - 1 - x, sourceHeight - 1 - y)
    270 -> ContourPoint(sourceWidth - 1 - y, x)
    else -> ContourPoint(x, y)
  }

  private fun normalizeContrast(values: IntArray): IntArray {
    val mean = values.average()
    var variance = 0.0
    values.forEach { value ->
      val delta = value - mean
      variance += delta * delta
    }
    val standardDeviation = sqrt(variance / values.size.coerceAtLeast(1))
    if (standardDeviation < 3.0) return values.copyOf()
    val lower = (mean - standardDeviation * 1.7).coerceIn(0.0, 255.0)
    val upper = (mean + standardDeviation * 1.7).coerceIn(lower + 1.0, 255.0)
    return IntArray(values.size) { index ->
      (((values[index] - lower) * 255.0 / (upper - lower)).roundToInt()).coerceIn(0, 255)
    }
  }

  private fun boxBlur(values: IntArray, width: Int, height: Int): IntArray {
    val blurred = IntArray(values.size)
    for (y in 0 until height) {
      for (x in 0 until width) {
        var total = 0
        var count = 0
        for (offsetY in -1..1) {
          val sampleY = (y + offsetY).coerceIn(0, height - 1)
          for (offsetX in -1..1) {
            val sampleX = (x + offsetX).coerceIn(0, width - 1)
            total += values[sampleY * width + sampleX]
            count++
          }
        }
        blurred[y * width + x] = total / count
      }
    }
    return blurred
  }

  private fun foregroundCandidates(values: IntArray, width: Int, height: Int): List<NamedMask> {
    val integral = integralImage(values, width, height)
    val mean = values.average()
    var variance = 0.0
    values.forEach { value ->
      val delta = value - mean
      variance += delta * delta
    }
    val offset = (sqrt(variance / values.size.coerceAtLeast(1)) * 0.28).coerceIn(8.0, 24.0)
    val radius = max(7, min(width, height) / 10)
    val dark = BooleanArray(values.size)
    val light = BooleanArray(values.size)
    for (y in 0 until height) {
      for (x in 0 until width) {
        val localMean = localMean(integral, width, height, x, y, radius)
        val value = values[y * width + x]
        dark[y * width + x] = value < localMean - offset
        light[y * width + x] = value > localMean + offset
      }
    }
    val edges = sobelEdges(values, width, height)
    return listOf(
      NamedMask("adaptive-dark", openThenClose(dark, width, height)),
      NamedMask("adaptive-light", openThenClose(light, width, height)),
      NamedMask("edges", fillHoles(close(dilate(edges, width, height, 1), width, height, 1), width, height)),
    )
  }

  private fun uniformColorCandidates(
    luminance: IntArray,
    chromaU: IntArray?,
    chromaV: IntArray?,
    width: Int,
    height: Int,
    tolerance: ColorRegionTolerance,
  ): List<NamedMask> {
    if (chromaU == null || chromaV == null || chromaU.size != luminance.size || chromaV.size != luminance.size) {
      return emptyList()
    }
    val luminanceBins = 16
    val chromaBins = 8
    val binCount = luminanceBins * chromaBins * chromaBins
    val counts = IntArray(binCount)
    val luminanceSums = IntArray(binCount)
    val uSums = IntArray(binCount)
    val vSums = IntArray(binCount)
    luminance.indices.forEach { index ->
      val bin = colorBin(luminance[index], chromaU[index], chromaV[index], luminanceBins, chromaBins)
      counts[bin]++
      luminanceSums[bin] += luminance[index]
      uSums[bin] += chromaU[index]
      vSums[bin] += chromaV[index]
    }
    val minimumPixels = max(16, (luminance.size * 0.0025).roundToInt())
    val seedBins = counts.indices
      .filter { counts[it] >= minimumPixels }
      .sortedByDescending { counts[it] }
      .take(tolerance.seedCount)
    return seedBins.mapIndexed { index, bin ->
      val count = counts[bin].coerceAtLeast(1)
      val center = ColorCenter(
        luminanceSums[bin].toDouble() / count,
        uSums[bin].toDouble() / count,
        vSums[bin].toDouble() / count,
      )
      var totalDistance = 0.0
      var matched = 0
      val mask = BooleanArray(luminance.size) { pixel ->
        val luminanceDistance = abs(luminance[pixel] - center.luminance)
        val uDistance = chromaU[pixel] - center.u
        val vDistance = chromaV[pixel] - center.v
        val chromaDistance = sqrt(uDistance * uDistance + vDistance * vDistance)
        val matches = luminanceDistance <= tolerance.luminanceDistance && chromaDistance <= tolerance.chromaDistance
        if (matches) {
          matched++
          totalDistance += luminanceDistance / tolerance.luminanceDistance + chromaDistance / tolerance.chromaDistance
        }
        matches
      }
      val uniformity = if (matched == 0) 0.0 else {
        (1 - totalDistance / matched / 2).coerceIn(0.25, 1.0)
      }
      NamedMask(
        name = "uniform-color-${index + 1}",
        mask = openThenClose(mask, width, height),
        colorUniformity = uniformity,
      )
    }
  }

  private fun colorBin(
    luminance: Int,
    chromaU: Int,
    chromaV: Int,
    luminanceBins: Int,
    chromaBins: Int,
  ): Int {
    val y = (luminance * luminanceBins / 256).coerceIn(0, luminanceBins - 1)
    val u = (chromaU * chromaBins / 256).coerceIn(0, chromaBins - 1)
    val v = (chromaV * chromaBins / 256).coerceIn(0, chromaBins - 1)
    return (y * chromaBins + u) * chromaBins + v
  }

  private fun integralImage(values: IntArray, width: Int, height: Int): LongArray {
    val integral = LongArray((width + 1) * (height + 1))
    for (y in 1..height) {
      var rowTotal = 0L
      for (x in 1..width) {
        rowTotal += values[(y - 1) * width + x - 1]
        integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowTotal
      }
    }
    return integral
  }

  private fun localMean(integral: LongArray, width: Int, height: Int, x: Int, y: Int, radius: Int): Double {
    val left = (x - radius).coerceAtLeast(0)
    val top = (y - radius).coerceAtLeast(0)
    val right = (x + radius + 1).coerceAtMost(width)
    val bottom = (y + radius + 1).coerceAtMost(height)
    val stride = width + 1
    val total = integral[bottom * stride + right] - integral[top * stride + right] -
      integral[bottom * stride + left] + integral[top * stride + left]
    return total.toDouble() / ((right - left) * (bottom - top)).coerceAtLeast(1)
  }

  private fun sobelEdges(values: IntArray, width: Int, height: Int): BooleanArray {
    val magnitudes = DoubleArray(values.size)
    var total = 0.0
    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        val topLeft = values[(y - 1) * width + x - 1]
        val top = values[(y - 1) * width + x]
        val topRight = values[(y - 1) * width + x + 1]
        val left = values[y * width + x - 1]
        val right = values[y * width + x + 1]
        val bottomLeft = values[(y + 1) * width + x - 1]
        val bottom = values[(y + 1) * width + x]
        val bottomRight = values[(y + 1) * width + x + 1]
        val gradientX = -topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight
        val gradientY = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
        val magnitude = sqrt((gradientX * gradientX + gradientY * gradientY).toDouble())
        magnitudes[y * width + x] = magnitude
        total += magnitude
      }
    }
    val mean = total / values.size.coerceAtLeast(1)
    var variance = 0.0
    magnitudes.forEach { magnitude ->
      val delta = magnitude - mean
      variance += delta * delta
    }
    val threshold = max(28.0, mean + sqrt(variance / magnitudes.size.coerceAtLeast(1)) * 0.75)
    return BooleanArray(values.size) { index -> magnitudes[index] >= threshold }
  }

  private fun openThenClose(mask: BooleanArray, width: Int, height: Int): BooleanArray =
    close(dilate(erode(mask, width, height, 1), width, height, 1), width, height, 1)

  private fun close(mask: BooleanArray, width: Int, height: Int, radius: Int): BooleanArray =
    erode(dilate(mask, width, height, radius), width, height, radius)

  private fun dilate(mask: BooleanArray, width: Int, height: Int, radius: Int): BooleanArray {
    val result = BooleanArray(mask.size)
    for (y in 0 until height) {
      for (x in 0 until width) {
        var matched = false
        for (offsetY in -radius..radius) {
          val sampleY = y + offsetY
          if (sampleY !in 0 until height) continue
          for (offsetX in -radius..radius) {
            val sampleX = x + offsetX
            if (sampleX in 0 until width && mask[sampleY * width + sampleX]) {
              matched = true
              break
            }
          }
          if (matched) break
        }
        result[y * width + x] = matched
      }
    }
    return result
  }

  private fun erode(mask: BooleanArray, width: Int, height: Int, radius: Int): BooleanArray {
    val result = BooleanArray(mask.size)
    for (y in 0 until height) {
      for (x in 0 until width) {
        var matched = true
        for (offsetY in -radius..radius) {
          val sampleY = y + offsetY
          if (sampleY !in 0 until height) {
            matched = false
            break
          }
          for (offsetX in -radius..radius) {
            val sampleX = x + offsetX
            if (sampleX !in 0 until width || !mask[sampleY * width + sampleX]) {
              matched = false
              break
            }
          }
          if (!matched) break
        }
        result[y * width + x] = matched
      }
    }
    return result
  }

  private fun fillHoles(mask: BooleanArray, width: Int, height: Int): BooleanArray {
    val visited = BooleanArray(mask.size)
    val queue = IntArray(mask.size)
    var head = 0
    var tail = 0
    fun enqueue(index: Int) {
      if (!mask[index] && !visited[index]) {
        visited[index] = true
        queue[tail++] = index
      }
    }
    for (x in 0 until width) {
      enqueue(x)
      enqueue((height - 1) * width + x)
    }
    for (y in 0 until height) {
      enqueue(y * width)
      enqueue(y * width + width - 1)
    }
    while (head < tail) {
      val point = queue[head++]
      val x = point % width
      val y = point / width
      if (x > 0) enqueue(point - 1)
      if (x < width - 1) enqueue(point + 1)
      if (y > 0) enqueue(point - width)
      if (y < height - 1) enqueue(point + width)
    }
    return BooleanArray(mask.size) { index -> mask[index] || !visited[index] }
  }

  private fun findComponents(
    mask: BooleanArray,
    width: Int,
    height: Int,
    source: String,
    minimumNoiseAreaRatio: Double,
  ): List<MaskComponent> {
    val visited = BooleanArray(mask.size)
    val queue = IntArray(mask.size)
    val minimumArea = max(10, (width * height * minimumNoiseAreaRatio).roundToInt())
    val components = mutableListOf<MaskComponent>()
    for (start in mask.indices) {
      if (!mask[start] || visited[start]) continue
      var head = 0
      var tail = 0
      queue[tail++] = start
      visited[start] = true
      var minX = width
      var maxX = 0
      var minY = height
      var maxY = 0
      while (head < tail) {
        val point = queue[head++]
        val x = point % width
        val y = point / width
        minX = min(minX, x)
        maxX = max(maxX, x)
        minY = min(minY, y)
        maxY = max(maxY, y)
        if (x > 0) enqueue(point - 1, mask, visited, queue, tail).also { tail = it }
        if (x < width - 1) enqueue(point + 1, mask, visited, queue, tail).also { tail = it }
        if (y > 0) enqueue(point - width, mask, visited, queue, tail).also { tail = it }
        if (y < height - 1) enqueue(point + width, mask, visited, queue, tail).also { tail = it }
      }
      if (tail >= minimumArea) {
        components += MaskComponent(
          pixels = queue.copyOf(tail),
          box = DetectionBox(minX, minY, maxX - minX + 1, maxY - minY + 1),
          area = tail,
          source = source,
          imageWidth = width,
          imageHeight = height,
        )
      }
    }
    return components
  }

  private fun enqueue(
    point: Int,
    mask: BooleanArray,
    visited: BooleanArray,
    queue: IntArray,
    tail: Int,
  ): Int {
    if (!mask[point] || visited[point]) return tail
    visited[point] = true
    queue[tail] = point
    return tail + 1
  }

  private fun extractProfile(component: MaskComponent, width: Int, height: Int): ContourProfile {
    val mask = BooleanArray(width * height)
    var centroidX = 0.0
    var centroidY = 0.0
    component.pixels.forEach { point ->
      mask[point] = true
      centroidX += point % width
      centroidY += point / width
    }
    centroidX /= component.area
    centroidY /= component.area
    var momentXX = 0.0
    var momentYY = 0.0
    var momentXY = 0.0
    component.pixels.forEach { point ->
      val deltaX = point % width - centroidX
      val deltaY = point / width - centroidY
      momentXX += deltaX * deltaX
      momentYY += deltaY * deltaY
      momentXY += deltaX * deltaY
    }
    val discriminant = sqrt((momentXX - momentYY) * (momentXX - momentYY) + 4 * momentXY * momentXY)
    val major = ((momentXX + momentYY + discriminant) / 2).coerceAtLeast(1.0)
    val minor = ((momentXX + momentYY - discriminant) / 2).coerceAtLeast(1.0)
    val orientation = 0.5 * atan2(2 * momentXY, momentXX - momentYY)
    val boundary = mutableListOf<ContourPoint>()
    var borderPoints = 0
    var boundaryEdges = 0
    component.pixels.forEach { point ->
      val x = point % width
      val y = point / width
      val edgeCount = boundaryEdgeCount(x, y, mask, width, height)
      if (edgeCount == 0) return@forEach
      boundary += ContourPoint(x, y)
      boundaryEdges += edgeCount
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) borderPoints++
    }
    val hull = convexHull(boundary)
    val hullPerimeter = polygonPerimeter(hull)
    val hullArea = polygonArea(hull).coerceAtLeast(1.0)
    val extent = component.area.toDouble() / (component.box.width * component.box.height).coerceAtLeast(1)
    val circularity = (4 * PI * component.area / (hullPerimeter * hullPerimeter).coerceAtLeast(1.0)).coerceIn(0.0, 1.0)
    val boundaryPerimeter = max(hullPerimeter, boundaryEdges * PI / 4)
    val convexity = (hullPerimeter / boundaryPerimeter).coerceIn(0.0, 1.0)
    val centerOffset = sqrt(
      (centroidX - width / 2.0) * (centroidX - width / 2.0) +
        (centroidY - height / 2.0) * (centroidY - height / 2.0),
    ) / min(width, height).coerceAtLeast(1)
    val widthProfile = axisWidthProfile(component, centroidX, centroidY, orientation)
    return ContourProfile(
      component = component,
      centroidX = centroidX,
      centroidY = centroidY,
      aspectRatio = component.box.width.toDouble() / component.box.height.coerceAtLeast(1),
      orientedAspectRatio = sqrt(major / minor),
      circularity = circularity,
      solidity = (component.area / hullArea).coerceIn(0.0, 1.0),
      convexity = convexity,
      extent = extent.coerceIn(0.0, 1.0),
      cornerCount = approximatePolygonCorners(hull),
      borderContactRatio = if (boundary.isEmpty()) 1.0 else borderPoints.toDouble() / boundary.size,
      centerOffset = centerOffset,
      perimeter = hullPerimeter,
      huMoments = huMoments(component, centroidX, centroidY),
      radialSignature = radialSignature(boundary, centroidX, centroidY, orientation),
      widthProfile = widthProfile,
      endWidthRatio = endWidthRatio(widthProfile),
      normalizedSilhouette = normalizedSilhouette(component, centroidX, centroidY, orientation),
      hull = hull,
    )
  }

  private fun scoreCandidate(
    profile: ContourProfile,
    target: SupportedShape,
    colorUniformity: Double,
  ): FeatureScores {
    val configuration = ShapeThresholdConfiguration.forShape(target)
    val templateSimilarity = ShapeTemplates.forShape(target).map { template ->
      TemplateSimilarity(
        radial = signatureSimilarity(profile.radialSignature, template.radialSignature),
        silhouette = silhouetteSimilarity(profile.normalizedSilhouette, template.normalizedSilhouette),
        hu = huSimilarity(profile.huMoments, template.huMoments),
        axis = relativeSimilarity(profile.orientedAspectRatio, template.orientedAspectRatio, 2.5),
        widthProfile = widthProfileSimilarity(profile.widthProfile, template.widthProfile),
      )
    }.maxByOrNull { it.combined(target) } ?: TemplateSimilarity.empty()
    val contourSimilarity = (templateSimilarity.radial * 0.58 + templateSimilarity.silhouette * 0.42).coerceIn(0.0, 1.0)
    val silhouette = templateSimilarity.silhouette
    val polygon = if (target == SupportedShape.SPOON) 1.0 else idealScore(profile.cornerCount.toDouble(), configuration.expectedCorners.toDouble(), if (target == SupportedShape.CIRCLE) 3.5 else 2.2)
    val circularity = idealScore(profile.circularity, configuration.expectedCircularity, 0.34)
    val aspect = relativeSimilarity(profile.orientedAspectRatio, configuration.expectedAxisRatio, 2.8)
    val solidity = minimumScore(profile.solidity, 0.56, 0.9)
    val convexity = minimumScore(profile.convexity, 0.62, 0.92)
    val extent = idealScore(profile.extent, configuration.expectedExtent, if (target == SupportedShape.SQUARE) 0.45 else 0.32)
    val hu = templateSimilarity.hu
    val axis = templateSimilarity.axis
    val widthProfile = templateSimilarity.widthProfile
    val uniformity = colorUniformity.coerceIn(0.0, 1.0)
    val area = broadAreaScore(profile.component.area.toDouble() / (profile.component.imageWidth * profile.component.imageHeight))
    val position = (1 - profile.centerOffset / 0.46).coerceIn(0.0, 1.0)
    val weights = configuration.weights
    val totalWeight = weights.contourSimilarity + weights.polygon + weights.circularity + weights.aspectRatio +
      weights.solidity + weights.convexity + weights.extent + weights.huMoments + weights.axisRatio + weights.widthProfile + weights.colorUniformity + weights.area + weights.position
    val weighted = (
      contourSimilarity * weights.contourSimilarity +
        polygon * weights.polygon +
        circularity * weights.circularity +
        aspect * weights.aspectRatio +
        solidity * weights.solidity +
        convexity * weights.convexity +
        extent * weights.extent +
        hu * weights.huMoments +
        axis * weights.axisRatio +
        widthProfile * weights.widthProfile +
        uniformity * weights.colorUniformity +
        area * weights.area +
        position * weights.position
      ) / totalWeight
    return FeatureScores(
      contourSimilarity = contourSimilarity,
      silhouette = silhouette,
      polygon = polygon,
      circularity = circularity,
      aspectRatio = aspect,
      solidity = solidity,
      convexity = convexity,
      extent = extent,
      huMoments = hu,
      axisRatio = axis,
      widthProfile = widthProfile,
      colorUniformity = uniformity,
      area = area,
      position = position,
      weightedConfidence = weighted.coerceIn(0.0, 1.0),
    )
  }

  private fun broadAreaScore(areaRatio: Double): Double = when {
    areaRatio < 0.018 -> (areaRatio / 0.018).coerceIn(0.0, 1.0)
    areaRatio > 0.84 -> ((1 - areaRatio) / 0.16).coerceIn(0.0, 1.0)
    else -> 1.0
  }

  private fun idealScore(value: Double, expected: Double, tolerance: Double): Double =
    (1 - abs(value - expected) / tolerance).coerceIn(0.0, 1.0)

  private fun minimumScore(value: Double, minimum: Double, fullScoreAt: Double): Double =
    ((value - minimum) / (fullScoreAt - minimum)).coerceIn(0.0, 1.0)

  private fun relativeSimilarity(value: Double, expected: Double, range: Double): Double {
    if (value <= 0 || expected <= 0) return 0.0
    return (1 - abs(ln(value / expected)) / ln(range)).coerceIn(0.0, 1.0)
  }

  private fun huSimilarity(candidate: DoubleArray, template: DoubleArray): Double {
    if (candidate.size != template.size) return 0.0
    var distance = 0.0
    candidate.indices.forEach { index ->
      val candidateValue = signedLog(candidate[index])
      val templateValue = signedLog(template[index])
      distance += abs(candidateValue - templateValue)
    }
    return exp(-distance / candidate.size.coerceAtLeast(1) / 4.5).coerceIn(0.0, 1.0)
  }

  private fun signedLog(value: Double): Double = sign(value) * ln(abs(value) + 1e-12)

  private fun radialSignature(
    boundary: List<ContourPoint>,
    centroidX: Double,
    centroidY: Double,
    orientation: Double,
    samples: Int = 48,
  ): DoubleArray {
    val signature = DoubleArray(samples)
    val cosine = cos(orientation)
    val sine = sin(orientation)
    boundary.forEach { point ->
      val deltaX = point.x - centroidX
      val deltaY = point.y - centroidY
      val normalizedX = cosine * deltaX + sine * deltaY
      val normalizedY = -sine * deltaX + cosine * deltaY
      val angle = (atan2(normalizedY, normalizedX) + 2 * PI) % (2 * PI)
      val bucket = floor(angle / (2 * PI) * samples).toInt().coerceIn(0, samples - 1)
      signature[bucket] = max(signature[bucket], sqrt(normalizedX * normalizedX + normalizedY * normalizedY))
    }
    fillEmptySignatureBuckets(signature)
    val maxRadius = signature.maxOrNull()?.coerceAtLeast(1.0) ?: 1.0
    signature.indices.forEach { index -> signature[index] /= maxRadius }
    return signature
  }

  private fun fillEmptySignatureBuckets(signature: DoubleArray) {
    repeat(signature.size) {
      signature.indices.forEach { index ->
        if (signature[index] != 0.0) return@forEach
        signature[index] = max(
          signature[(index - 1 + signature.size) % signature.size],
          signature[(index + 1) % signature.size],
        )
      }
    }
  }

  private fun signatureSimilarity(candidate: DoubleArray, template: DoubleArray): Double {
    if (candidate.size != template.size || candidate.isEmpty()) return 0.0
    var smallestError = Double.MAX_VALUE
    for (reverse in 0..1) {
      for (shift in candidate.indices) {
        var error = 0.0
        candidate.indices.forEach { index ->
          val sourceIndex = if (reverse == 0) {
            (index + shift) % candidate.size
          } else {
            (candidate.size - 1 - index + shift + candidate.size) % candidate.size
          }
          val difference = candidate[sourceIndex] - template[index]
          error += difference * difference
        }
        smallestError = min(smallestError, sqrt(error / candidate.size))
      }
    }
    return (1 - smallestError * 1.35).coerceIn(0.0, 1.0)
  }

  private fun axisWidthProfile(
    component: MaskComponent,
    centroidX: Double,
    centroidY: Double,
    orientation: Double,
    bins: Int = 12,
  ): DoubleArray {
    val cosine = cos(orientation)
    val sine = sin(orientation)
    var minimumAxis = Double.MAX_VALUE
    var maximumAxis = -Double.MAX_VALUE
    component.pixels.forEach { point ->
      val deltaX = point % component.imageWidth - centroidX
      val deltaY = point / component.imageWidth - centroidY
      val axis = cosine * deltaX + sine * deltaY
      minimumAxis = min(minimumAxis, axis)
      maximumAxis = max(maximumAxis, axis)
    }
    val minimumWidth = DoubleArray(bins) { Double.MAX_VALUE }
    val maximumWidth = DoubleArray(bins) { -Double.MAX_VALUE }
    val axisRange = (maximumAxis - minimumAxis).coerceAtLeast(1.0)
    component.pixels.forEach { point ->
      val deltaX = point % component.imageWidth - centroidX
      val deltaY = point / component.imageWidth - centroidY
      val axis = cosine * deltaX + sine * deltaY
      val width = -sine * deltaX + cosine * deltaY
      val index = (((axis - minimumAxis) / axisRange) * bins).toInt().coerceIn(0, bins - 1)
      minimumWidth[index] = min(minimumWidth[index], width)
      maximumWidth[index] = max(maximumWidth[index], width)
    }
    val profile = DoubleArray(bins) { index ->
      if (minimumWidth[index] == Double.MAX_VALUE) 0.0 else maximumWidth[index] - minimumWidth[index]
    }
    fillEmptyProfileBins(profile)
    val maximum = profile.maxOrNull()?.coerceAtLeast(1.0) ?: 1.0
    return DoubleArray(bins) { index -> profile[index] / maximum }
  }

  private fun fillEmptyProfileBins(profile: DoubleArray) {
    repeat(profile.size) {
      profile.indices.forEach { index ->
        if (profile[index] != 0.0) return@forEach
        val before = profile[(index - 1 + profile.size) % profile.size]
        val after = profile[(index + 1) % profile.size]
        profile[index] = max(before, after)
      }
    }
  }

  private fun endWidthRatio(profile: DoubleArray): Double {
    if (profile.size < 4) return 1.0
    val sampleSize = max(1, profile.size / 4)
    val first = profile.take(sampleSize).average().coerceAtLeast(1e-6)
    val last = profile.takeLast(sampleSize).average().coerceAtLeast(1e-6)
    return max(first, last) / min(first, last)
  }

  private fun widthProfileSimilarity(candidate: DoubleArray, template: DoubleArray): Double {
    if (candidate.size != template.size || candidate.isEmpty()) return 0.0
    val forward = candidate.indices.sumOf { index -> abs(candidate[index] - template[index]) } / candidate.size
    val reverse = candidate.indices.sumOf { index -> abs(candidate[candidate.lastIndex - index] - template[index]) } / candidate.size
    return (1 - min(forward, reverse) * 1.5).coerceIn(0.0, 1.0)
  }

  private fun huMoments(component: MaskComponent, centroidX: Double, centroidY: Double): DoubleArray {
    fun centralMoment(p: Int, q: Int): Double {
      var total = 0.0
      component.pixels.forEach { point ->
        total += Math.pow(point % component.imageWidth - centroidX, p.toDouble()) *
          Math.pow(point / component.imageWidth - centroidY, q.toDouble())
      }
      return total
    }
    fun normalizedMoment(p: Int, q: Int): Double = centralMoment(p, q) /
      Math.pow(component.area.toDouble().coerceAtLeast(1.0), 1 + (p + q) / 2.0)
    val n20 = normalizedMoment(2, 0)
    val n02 = normalizedMoment(0, 2)
    val n11 = normalizedMoment(1, 1)
    val n30 = normalizedMoment(3, 0)
    val n12 = normalizedMoment(1, 2)
    val n21 = normalizedMoment(2, 1)
    val n03 = normalizedMoment(0, 3)
    val a = n30 - 3 * n12
    val b = 3 * n21 - n03
    val c = n30 + n12
    val d = n21 + n03
    return doubleArrayOf(
      n20 + n02,
      (n20 - n02) * (n20 - n02) + 4 * n11 * n11,
      a * a + b * b,
      c * c + d * d,
      a * c * (c * c - 3 * d * d) + b * d * (3 * c * c - d * d),
      (n20 - n02) * (c * c - d * d) + 4 * n11 * c * d,
      b * c * (c * c - 3 * d * d) - a * d * (3 * c * c - d * d),
    )
  }

  private fun normalizedSilhouette(
    component: MaskComponent,
    centroidX: Double,
    centroidY: Double,
    orientation: Double,
    side: Int = 48,
  ): BooleanArray {
    val cosine = cos(orientation)
    val sine = sin(orientation)
    var extent = 1.0
    component.pixels.forEach { point ->
      val deltaX = point % component.imageWidth - centroidX
      val deltaY = point / component.imageWidth - centroidY
      val normalizedX = cosine * deltaX + sine * deltaY
      val normalizedY = -sine * deltaX + cosine * deltaY
      extent = max(extent, max(abs(normalizedX), abs(normalizedY)))
    }
    val scale = side * 0.4 / extent
    val silhouette = BooleanArray(side * side)
    component.pixels.forEach { point ->
      val deltaX = point % component.imageWidth - centroidX
      val deltaY = point / component.imageWidth - centroidY
      val normalizedX = cosine * deltaX + sine * deltaY
      val normalizedY = -sine * deltaX + cosine * deltaY
      val x = (side / 2.0 + normalizedX * scale).roundToInt().coerceIn(0, side - 1)
      val y = (side / 2.0 + normalizedY * scale).roundToInt().coerceIn(0, side - 1)
      silhouette[y * side + x] = true
    }
    return fillHoles(close(dilate(silhouette, side, side, 1), side, side, 1), side, side)
  }

  private fun silhouetteSimilarity(candidate: BooleanArray, template: BooleanArray): Double {
    if (candidate.size != template.size || candidate.isEmpty()) return 0.0
    val side = sqrt(candidate.size.toDouble()).roundToInt()
    if (side * side != candidate.size) return 0.0
    var best = 0.0
    for (mirrored in 0..1) {
      for (turns in 0..3) {
        var intersection = 0
        var union = 0
        for (y in 0 until side) {
          for (x in 0 until side) {
            var sourceX = x
            var sourceY = y
            if (mirrored == 1) sourceX = side - 1 - sourceX
            repeat(turns) {
              val nextX = side - 1 - sourceY
              sourceY = sourceX
              sourceX = nextX
            }
            val candidateValue = candidate[sourceY * side + sourceX]
            val templateValue = template[y * side + x]
            if (candidateValue || templateValue) union++
            if (candidateValue && templateValue) intersection++
          }
        }
        best = max(best, intersection.toDouble() / union.coerceAtLeast(1))
      }
    }
    return best
  }

  private fun boundaryEdgeCount(x: Int, y: Int, mask: BooleanArray, width: Int, height: Int): Int {
    var count = 0
    if (x == 0 || !mask[y * width + x - 1]) count++
    if (x == width - 1 || !mask[y * width + x + 1]) count++
    if (y == 0 || !mask[(y - 1) * width + x]) count++
    if (y == height - 1 || !mask[(y + 1) * width + x]) count++
    return count
  }

  private fun convexHull(points: List<ContourPoint>): List<ContourPoint> {
    if (points.size < 3) return points
    val sorted = points.distinct().sortedWith(compareBy<ContourPoint> { it.x }.thenBy { it.y })
    if (sorted.size < 3) return sorted
    val lower = mutableListOf<ContourPoint>()
    sorted.forEach { point ->
      while (lower.size >= 2 && cross(lower[lower.size - 2], lower.last(), point) <= 0) lower.removeAt(lower.lastIndex)
      lower += point
    }
    val upper = mutableListOf<ContourPoint>()
    sorted.asReversed().forEach { point ->
      while (upper.size >= 2 && cross(upper[upper.size - 2], upper.last(), point) <= 0) upper.removeAt(upper.lastIndex)
      upper += point
    }
    lower.removeAt(lower.lastIndex)
    upper.removeAt(upper.lastIndex)
    return lower + upper
  }

  private fun cross(origin: ContourPoint, first: ContourPoint, second: ContourPoint): Long =
    (first.x - origin.x).toLong() * (second.y - origin.y) - (first.y - origin.y).toLong() * (second.x - origin.x)

  private fun polygonPerimeter(points: List<ContourPoint>): Double {
    if (points.size < 2) return 0.0
    var total = 0.0
    points.indices.forEach { index ->
      val current = points[index]
      val next = points[(index + 1) % points.size]
      val deltaX = current.x - next.x
      val deltaY = current.y - next.y
      total += sqrt((deltaX * deltaX + deltaY * deltaY).toDouble())
    }
    return total
  }

  private fun polygonArea(points: List<ContourPoint>): Double {
    if (points.size < 3) return 0.0
    var total = 0.0
    points.indices.forEach { index ->
      val current = points[index]
      val next = points[(index + 1) % points.size]
      total += current.x.toDouble() * next.y - next.x.toDouble() * current.y
    }
    return abs(total) / 2
  }

  private fun approximatePolygonCorners(hull: List<ContourPoint>): Int {
    if (hull.size < 3) return 0
    val step = max(1, hull.size / 14)
    val candidates = BooleanArray(hull.size)
    hull.indices.forEach { index ->
      val previous = hull[(index - step + hull.size) % hull.size]
      val current = hull[index]
      val next = hull[(index + step) % hull.size]
      val firstX = previous.x - current.x
      val firstY = previous.y - current.y
      val secondX = next.x - current.x
      val secondY = next.y - current.y
      val firstLength = sqrt((firstX * firstX + firstY * firstY).toDouble())
      val secondLength = sqrt((secondX * secondX + secondY * secondY).toDouble())
      if (firstLength == 0.0 || secondLength == 0.0) return@forEach
      val cosine = ((firstX * secondX + firstY * secondY) / (firstLength * secondLength)).coerceIn(-1.0, 1.0)
      val turn = PI - acos(cosine)
      candidates[index] = turn >= 0.6
    }
    if (candidates.all { it }) return when {
      hull.size <= 4 -> hull.size
      hull.size <= 8 -> hull.size / 2
      else -> 0
    }
    return candidates.indices.count { index -> candidates[index] && !candidates[(index - 1 + candidates.size) % candidates.size] }
  }

  private fun elapsedMillis(startedAt: Long): Long = (System.nanoTime() - startedAt) / 1_000_000

  private data class PreparedFrame(
    val values: IntArray,
    val chromaU: IntArray?,
    val chromaV: IntArray?,
    val width: Int,
    val height: Int,
  )

  private data class NamedMask(
    val name: String,
    val mask: BooleanArray,
    val colorUniformity: Double = 0.5,
  )

  private data class ColorCenter(
    val luminance: Double,
    val u: Double,
    val v: Double,
  )

  private data class MaskComponent(
    val pixels: IntArray,
    val box: DetectionBox,
    val area: Int,
    val source: String,
    val imageWidth: Int = 0,
    val imageHeight: Int = 0,
  )

  private data class ContourProfile(
    val component: MaskComponent,
    val centroidX: Double,
    val centroidY: Double,
    val aspectRatio: Double,
    val orientedAspectRatio: Double,
    val circularity: Double,
    val solidity: Double,
    val convexity: Double,
    val extent: Double,
    val cornerCount: Int,
    val borderContactRatio: Double,
    val centerOffset: Double,
    val perimeter: Double,
    val huMoments: DoubleArray,
    val radialSignature: DoubleArray,
    val widthProfile: DoubleArray,
    val endWidthRatio: Double,
    val normalizedSilhouette: BooleanArray,
    val hull: List<ContourPoint>,
  ) {
    fun toFeatureVector(): ShapeFeatureVector = ShapeFeatureVector(
      contourArea = component.area.toDouble(),
      imageAreaRatio = component.area.toDouble() / (component.imageWidth * component.imageHeight).coerceAtLeast(1),
      perimeter = perimeter,
      boundingBox = component.box,
      aspectRatio = aspectRatio,
      orientedAspectRatio = orientedAspectRatio,
      circularity = circularity,
      solidity = solidity,
      convexity = convexity,
      extent = extent,
      cornerCount = cornerCount,
      borderContactRatio = borderContactRatio,
      centerOffset = centerOffset,
      huMoments = huMoments,
      radialSignature = radialSignature,
      widthProfile = widthProfile,
      endWidthRatio = endWidthRatio,
    )
  }

  private data class CandidateEvaluation(
    val component: MaskComponent,
    val profile: ContourProfile,
    val featureScores: FeatureScores,
    val colorUniformity: Double,
  ) {
    val primaryRegionScore: Double
      get() {
        val area = component.area.toDouble() / (component.imageWidth * component.imageHeight).coerceAtLeast(1)
        val centered = (1 - profile.centerOffset / 0.5).coerceIn(0.0, 1.0)
        val complete = (1 - profile.borderContactRatio).coerceIn(0.0, 1.0)
        return area * centered * complete * (0.6 + colorUniformity.coerceIn(0.0, 1.0) * 0.4)
      }
  }

  private object ShapeTemplates {
    private val templates by lazy {
      SupportedShape.values().associateWith { shape ->
        val side = 160
        canonicalMasks(shape, side).map { mask ->
          val component = componentFromMask(mask, side)
          val profile = ShapeDetectionPipeline(maxProcessingDimension = side).extractProfile(component, side, side)
          ShapeTemplate(
            radialSignature = profile.radialSignature,
            huMoments = profile.huMoments,
            orientedAspectRatio = profile.orientedAspectRatio,
            widthProfile = profile.widthProfile,
            normalizedSilhouette = profile.normalizedSilhouette,
          )
        }
      }
    }

    fun forShape(shape: SupportedShape): List<ShapeTemplate> = templates.getValue(shape)

    private fun canonicalMasks(shape: SupportedShape, side: Int): List<BooleanArray> = when (shape) {
      SupportedShape.SPOON -> listOf(
        spoonMask(side, bowlWidth = 0.23, bowlHeight = 0.25, handleWidth = 0.07, curve = 0.0),
        spoonMask(side, bowlWidth = 0.18, bowlHeight = 0.24, handleWidth = 0.065, curve = 0.0),
        spoonMask(side, bowlWidth = 0.26, bowlHeight = 0.22, handleWidth = 0.09, curve = 0.025),
        spoonMask(side, bowlWidth = 0.2, bowlHeight = 0.2, handleWidth = 0.08, curve = -0.025),
      )
      else -> listOf(canonicalMask(shape, side))
    }

    private fun canonicalMask(shape: SupportedShape, side: Int): BooleanArray {
      val mask = BooleanArray(side * side)
      val center = (side - 1) / 2.0
      val radius = side * 0.3
      for (y in 0 until side) {
        for (x in 0 until side) {
          val inside = when (shape) {
            SupportedShape.CIRCLE -> {
              val deltaX = x - center
              val deltaY = y - center
              deltaX * deltaX + deltaY * deltaY <= radius * radius
            }
            SupportedShape.SQUARE -> abs(x - center) <= radius && abs(y - center) <= radius
            SupportedShape.RECTANGLE -> abs(x - center) <= radius && abs(y - center) <= radius * 0.48
            SupportedShape.TRIANGLE -> pointInTriangle(
              x.toDouble(),
              y.toDouble(),
              center, side * 0.18,
              side * 0.18, side * 0.8,
              side * 0.82, side * 0.8,
            )
            SupportedShape.SPOON -> false
          }
          mask[y * side + x] = inside
        }
      }
      return mask
    }

    private fun spoonMask(
      side: Int,
      bowlWidth: Double,
      bowlHeight: Double,
      handleWidth: Double,
      curve: Double,
    ): BooleanArray = BooleanArray(side * side) { index ->
      val x = index % side
      val y = index / side
      val normalizedX = (x - (side - 1) / 2.0) / side
      val normalizedY = (y - (side - 1) / 2.0) / side
      val bowlCenterY = -0.19
      val bowl = normalizedX * normalizedX / (bowlWidth * bowlWidth) +
        (normalizedY - bowlCenterY) * (normalizedY - bowlCenterY) / (bowlHeight * bowlHeight) <= 1.0
      val handleProgress = ((normalizedY + 0.02) / 0.46).coerceIn(0.0, 1.0)
      val handleCenterX = curve * handleProgress * handleProgress
      val handle = normalizedY in -0.03..0.42 && abs(normalizedX - handleCenterX) <= handleWidth
      bowl || handle
    }

    private fun componentFromMask(mask: BooleanArray, side: Int): MaskComponent {
      val pixels = IntArray(mask.count { it })
      var index = 0
      var minX = side
      var minY = side
      var maxX = 0
      var maxY = 0
      mask.indices.forEach { point ->
        if (!mask[point]) return@forEach
        val x = point % side
        val y = point / side
        pixels[index++] = point
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
      return MaskComponent(pixels, DetectionBox(minX, minY, maxX - minX + 1, maxY - minY + 1), pixels.size, "template", side, side)
    }

    private fun pointInTriangle(
      x: Double,
      y: Double,
      ax: Double,
      ay: Double,
      bx: Double,
      by: Double,
      cx: Double,
      cy: Double,
    ): Boolean {
      val first = (x - bx) * (ay - by) - (ax - bx) * (y - by)
      val second = (x - cx) * (by - cy) - (bx - cx) * (y - cy)
      val third = (x - ax) * (cy - ay) - (cx - ax) * (y - ay)
      val hasNegative = first < 0 || second < 0 || third < 0
      val hasPositive = first > 0 || second > 0 || third > 0
      return !(hasNegative && hasPositive)
    }
  }

  private data class ShapeTemplate(
    val radialSignature: DoubleArray,
    val huMoments: DoubleArray,
    val orientedAspectRatio: Double,
    val widthProfile: DoubleArray,
    val normalizedSilhouette: BooleanArray,
  )

  private data class TemplateSimilarity(
    val radial: Double,
    val silhouette: Double,
    val hu: Double,
    val axis: Double,
    val widthProfile: Double,
  ) {
    fun combined(target: SupportedShape): Double = if (target == SupportedShape.SPOON) {
      radial * 0.24 + silhouette * 0.24 + hu * 0.2 + axis * 0.12 + widthProfile * 0.2
    } else {
      radial * 0.34 + silhouette * 0.32 + hu * 0.2 + axis * 0.09 + widthProfile * 0.05
    }

    companion object {
      fun empty() = TemplateSimilarity(0.0, 0.0, 0.0, 0.0, 0.0)
    }
  }
}

internal data class TemporalDetection(
  val smoothedConfidence: Double,
  val progress: Double,
  val stable: Boolean,
  val guideMatched: Boolean,
  val state: DetectionState,
  val feedback: String,
)

internal class DetectionStabilityTracker(
  private val rollingWindowMs: Long = 850,
  private val requiredStableMs: Long = 1_000,
  private val dropoutGraceMs: Long = 350,
) {
  private val samples = ArrayDeque<TemporalSample>()
  private var matchingSince: Long? = null
  private var lastPositiveAt: Long? = null

  fun update(analysis: ShapeAnalysis, now: Long): TemporalDetection {
    samples.addLast(TemporalSample(now, analysis.confidence))
    while (samples.isNotEmpty() && now - samples.first.timestamp > rollingWindowMs) samples.removeFirst()
    val weightedConfidence = weightedConfidence(now)
    val threshold = analysis.acceptanceThreshold
    if (analysis.rawAccepted) {
      if (matchingSince == null) matchingSince = now
      lastPositiveAt = now
    } else {
      val previousPositiveAt = lastPositiveAt
      val softDropout = previousPositiveAt != null &&
        now - previousPositiveAt <= dropoutGraceMs &&
        analysis.state == DetectionState.PARTIAL_MATCH &&
        weightedConfidence >= threshold * 0.8
      if (softDropout) {
        matchingSince = matchingSince?.let { min(now, it + 120) }
      } else {
        matchingSince = null
        lastPositiveAt = null
      }
    }
    val guideMatched = matchingSince != null &&
      weightedConfidence >= threshold * 0.8 &&
      (analysis.rawAccepted || (lastPositiveAt != null && now - lastPositiveAt!! <= dropoutGraceMs))
    val progress = matchingSince?.let { ((now - it).toDouble() / requiredStableMs).coerceIn(0.0, 1.0) } ?: 0.0
    val stable = guideMatched && progress >= 1.0
    val state = when {
      stable -> DetectionState.MATCHED
      guideMatched -> DetectionState.HOLD_STEADY
      else -> analysis.state
    }
    return TemporalDetection(
      smoothedConfidence = weightedConfidence,
      progress = progress,
      stable = stable,
      guideMatched = guideMatched,
      state = state,
      feedback = state.feedback,
    )
  }

  fun reset() {
    samples.clear()
    matchingSince = null
    lastPositiveAt = null
  }

  private fun weightedConfidence(now: Long): Double {
    if (samples.isEmpty()) return 0.0
    var numerator = 0.0
    var denominator = 0.0
    samples.forEach { sample ->
      val age = (now - sample.timestamp).coerceAtLeast(0)
      val weight = (1.0 - age.toDouble() / rollingWindowMs).coerceIn(0.2, 1.0)
      numerator += sample.confidence * weight
      denominator += weight
    }
    return numerator / denominator.coerceAtLeast(1e-6)
  }

  private data class TemporalSample(
    val timestamp: Long,
    val confidence: Double,
  )
}
