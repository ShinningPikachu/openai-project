package com.example.offlineshapealarm.challenge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShapeDetectionPipelineIntegrationTest {
  private val pipeline = ShapeDetectionPipeline()

  @Test
  fun acceptsRoundSilhouetteAcrossLightingBackgroundAndDistanceChanges() {
    val brightBackground = analyze(
      SyntheticShape.CIRCLE,
      "circle",
      SyntheticFrameOptions(background = 236, foreground = 88, gradient = 22.0, noise = 7, radius = 43.0),
    )
    val dimBackground = analyze(
      SyntheticShape.CIRCLE,
      "circle",
      SyntheticFrameOptions(background = 126, foreground = 38, gradient = 15.0, noise = 6, radius = 58.0),
    )
    val lightObject = analyze(
      SyntheticShape.CIRCLE,
      "circle",
      SyntheticFrameOptions(background = 48, foreground = 198, gradient = 12.0, noise = 5, radius = 47.0),
    )

    assertTrue(brightBackground.rawAccepted)
    assertTrue(dimBackground.rawAccepted)
    assertTrue(lightObject.rawAccepted)
  }

  @Test
  fun acceptsRotatedSquareWithAControlledPartialOcclusion() {
    val analysis = analyze(
      SyntheticShape.SQUARE,
      "square",
      SyntheticFrameOptions(rotationDegrees = 27.0, gradient = 18.0, noise = 8, partialOcclusion = true, radius = 45.0),
    )

    assertTrue(analysis.rawAccepted)
    assertEquals(SupportedShape.SQUARE, analysis.classifiedShape)
  }

  @Test
  fun acceptsRotatedTriangleWhenRawFrameNeedsDisplayRotation() {
    val options = SyntheticFrameOptions(width = 320, height = 240, rotationDegrees = -21.0, gradient = 16.0, noise = 7, radius = 52.0)
    val analysis = pipeline.analyze(
      luminance = syntheticFrame(SyntheticShape.TRIANGLE, options),
      sourceWidth = options.width,
      sourceHeight = options.height,
      targetValue = "triangle",
      difficulty = "normal",
      rotationDegrees = 90,
    )

    assertTrue(analysis.rawAccepted)
    assertEquals(SupportedShape.TRIANGLE, analysis.classifiedShape)
  }

  @Test
  fun acceptsRotatedRectanglesAndSpoonLikeSilhouettes() {
    val rectangle = analyze(
      SyntheticShape.RECTANGLE,
      "rectangle",
      SyntheticFrameOptions(rotationDegrees = 31.0, gradient = 16.0, noise = 7, radius = 42.0),
    )
    val spoon = analyze(
      SyntheticShape.SPOON,
      "spoon",
      SyntheticFrameOptions(rotationDegrees = -24.0, gradient = 14.0, noise = 6, radius = 46.0),
    )

    assertTrue(rectangle.rawAccepted)
    assertTrue(spoon.rawAccepted)
    assertEquals(SupportedShape.RECTANGLE, rectangle.classifiedShape)
    assertEquals(SupportedShape.SPOON, spoon.classifiedShape)
  }

  @Test
  fun rejectsUnrelatedShapesTinyObjectsAndNoisyBackgrounds() {
    val triangleForCircle = analyze(SyntheticShape.TRIANGLE, "circle", SyntheticFrameOptions(noise = 9, gradient = 15.0))
    val ellipseForCircle = analyze(SyntheticShape.ELLIPSE, "circle", SyntheticFrameOptions(noise = 6, gradient = 10.0))
    val tinyCircle = analyze(SyntheticShape.CIRCLE, "circle", SyntheticFrameOptions(radius = 8.0, noise = 6))
    val noiseOnly = pipeline.analyze(
      luminance = noisyBackground(240, 320),
      sourceWidth = 240,
      sourceHeight = 320,
      targetValue = "square",
      difficulty = "normal",
    )
    val multipleObjects = analyze(
      SyntheticShape.CIRCLE,
      "circle",
      SyntheticFrameOptions(radius = 24.0, includeSecondObject = true),
    )

    assertFalse(triangleForCircle.rawAccepted)
    assertFalse(ellipseForCircle.rawAccepted)
    assertFalse(tinyCircle.rawAccepted)
    assertFalse(noiseOnly.rawAccepted)
    assertFalse(multipleObjects.rawAccepted)
    assertEquals("multiple-objects", multipleObjects.failureReason)
  }

  private fun analyze(shape: SyntheticShape, target: String, options: SyntheticFrameOptions): ShapeAnalysis = pipeline.analyze(
    luminance = syntheticFrame(shape, options),
    sourceWidth = options.width,
    sourceHeight = options.height,
    targetValue = target,
    difficulty = "normal",
  )

  private fun noisyBackground(width: Int, height: Int): IntArray = IntArray(width * height) { index ->
    val x = index % width
    val y = index / width
    (80 + (x * 13 + y * 29) % 130).coerceIn(0, 255)
  }
}
