package com.example.offlineshapealarm.challenge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShapeDetectionPipelineTest {
  private val pipeline = ShapeDetectionPipeline()

  @Test
  fun thresholdConfigurationGetsStricterByDifficulty() {
    SupportedShape.values().forEach { shape ->
      val configuration = ShapeThresholdConfiguration.forShape(shape)
      assertTrue(configuration.acceptanceThreshold("easy") < configuration.acceptanceThreshold("normal"))
      assertTrue(configuration.acceptanceThreshold("normal") < configuration.acceptanceThreshold("hard"))
      assertTrue(configuration.minimumNoiseAreaRatio < configuration.minimumAreaRatio)
      assertTrue(configuration.minimumAreaRatio < configuration.maximumAreaRatio)
      assertTrue(configuration.weights.contourSimilarity > 0.0)
    }
  }

  @Test
  fun extractsGeometricFeaturesFromSimpleSilhouettes() {
    val circle = analyze(SyntheticShape.CIRCLE, "circle")
    val square = analyze(SyntheticShape.SQUARE, "square")
    val rectangle = analyze(SyntheticShape.RECTANGLE, "rectangle")
    val triangle = analyze(SyntheticShape.TRIANGLE, "triangle")
    val spoon = analyze(SyntheticShape.SPOON, "spoon")

    assertNotNull(circle.features)
    assertNotNull(square.features)
    assertNotNull(rectangle.features)
    assertNotNull(triangle.features)
    assertNotNull(spoon.features)
    assertTrue(circle.features!!.circularity > 0.7)
    assertTrue(square.features!!.extent > 0.75)
    assertTrue(triangle.features!!.extent < square.features!!.extent)
    assertTrue(square.features!!.cornerCount in 3..6)
    assertTrue(triangle.features!!.cornerCount in 2..5)
    assertTrue(rectangle.features!!.orientedAspectRatio > 1.3)
    assertTrue(spoon.features!!.endWidthRatio > 1.35)
  }

  @Test
  fun weightedScoreFavorsTheSelectedShapeInsteadOfExactIdentity() {
    val circleForCircle = analyze(SyntheticShape.CIRCLE, "circle")
    val circleForTriangle = analyze(SyntheticShape.CIRCLE, "triangle")
    val squareForSquare = analyze(SyntheticShape.SQUARE, "square")
    val triangleForSquare = analyze(SyntheticShape.TRIANGLE, "square")
    val rectangleForRectangle = analyze(SyntheticShape.RECTANGLE, "rectangle")
    val spoonForSpoon = analyze(SyntheticShape.SPOON, "spoon")
    val rectangleForSpoon = analyze(SyntheticShape.RECTANGLE, "spoon")

    assertTrue(circleForCircle.confidence > circleForTriangle.confidence)
    assertTrue(squareForSquare.confidence > triangleForSquare.confidence)
    assertTrue(circleForCircle.rawAccepted)
    assertTrue(squareForSquare.rawAccepted)
    assertFalse(circleForTriangle.rawAccepted)
    assertFalse(triangleForSquare.rawAccepted)
    assertTrue(rectangleForRectangle.rawAccepted)
    assertTrue(spoonForSpoon.rawAccepted)
    assertFalse(rectangleForSpoon.rawAccepted)
  }

  @Test
  fun guideCropIgnoresDistractorsOutsideTheVisibleGuide() {
    val analysis = analyze(
      SyntheticShape.CIRCLE,
      "circle",
      SyntheticFrameOptions(includeOutsideDistractor = true),
    )

    assertTrue(analysis.rawAccepted)
    assertEquals(SupportedShape.CIRCLE, analysis.classifiedShape)
  }

  @Test
  fun prefersTheLargestRelevantUniformColorRegion() {
    val options = SyntheticFrameOptions()
    val luminance = syntheticFrame(SyntheticShape.CIRCLE, options)
    val chromaU = IntArray(luminance.size) { index -> if (luminance[index] < 120) 84 else 132 }
    val chromaV = IntArray(luminance.size) { index -> if (luminance[index] < 120) 178 else 126 }

    val analysis = pipeline.analyze(
      luminance = luminance,
      chromaU = chromaU,
      chromaV = chromaV,
      sourceWidth = options.width,
      sourceHeight = options.height,
      targetValue = "circle",
      difficulty = "normal",
      includeDebug = true,
    )

    assertTrue(analysis.rawAccepted)
    assertTrue(analysis.debugSnapshot?.candidateSource?.startsWith("uniform-color") == true)
    assertTrue(analysis.featureScores!!.colorUniformity > 0.8)
  }

  @Test
  fun acceptsAColorRegionWithLightingAndChromaVariation() {
    val options = SyntheticFrameOptions()
    val baseLuminance = syntheticFrame(SyntheticShape.CIRCLE, options)
    val luminance = IntArray(baseLuminance.size) { index ->
      val x = index % options.width
      if (baseLuminance[index] < 120) (baseLuminance[index] + x % 36 - 12).coerceIn(0, 255) else baseLuminance[index]
    }
    val chromaU = IntArray(luminance.size) { index -> if (baseLuminance[index] < 120) 76 + index % 20 else 132 }
    val chromaV = IntArray(luminance.size) { index -> if (baseLuminance[index] < 120) 170 + index % 18 else 126 }

    val analysis = pipeline.analyze(
      luminance = luminance,
      chromaU = chromaU,
      chromaV = chromaV,
      sourceWidth = options.width,
      sourceHeight = options.height,
      targetValue = "circle",
      difficulty = "normal",
      includeDebug = true,
    )

    assertTrue(analysis.rawAccepted)
    assertTrue(analysis.debugSnapshot?.candidateSource?.startsWith("uniform-color") == true)
  }

  private fun analyze(
    shape: SyntheticShape,
    target: String,
    options: SyntheticFrameOptions = SyntheticFrameOptions(),
  ): ShapeAnalysis = pipeline.analyze(
    luminance = syntheticFrame(shape, options),
    sourceWidth = options.width,
    sourceHeight = options.height,
    targetValue = target,
    difficulty = "normal",
  )
}
