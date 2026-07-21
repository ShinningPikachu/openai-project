package com.example.offlineshapealarm.challenge

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

internal enum class SyntheticShape { CIRCLE, ELLIPSE, TRIANGLE, SQUARE, RECTANGLE, SPOON }

internal data class SyntheticFrameOptions(
  val width: Int = 240,
  val height: Int = 320,
  val radius: Double = 50.0,
  val rotationDegrees: Double = 0.0,
  val background: Int = 214,
  val foreground: Int = 58,
  val gradient: Double = 0.0,
  val noise: Int = 0,
  val partialOcclusion: Boolean = false,
  val includeOutsideDistractor: Boolean = false,
  val includeSecondObject: Boolean = false,
)

internal fun syntheticFrame(shape: SyntheticShape, options: SyntheticFrameOptions = SyntheticFrameOptions()): IntArray {
  val radians = Math.toRadians(options.rotationDegrees)
  val cosine = cos(radians)
  val sine = sin(radians)
  val centerX = (options.width - 1) / 2.0
  val centerY = (options.height - 1) / 2.0
  return IntArray(options.width * options.height) { index ->
    val x = index % options.width
    val y = index / options.width
    val deltaX = x - centerX
    val deltaY = y - centerY
    val localX = cosine * deltaX + sine * deltaY
    val localY = -sine * deltaX + cosine * deltaY
    val inside = when (shape) {
      SyntheticShape.CIRCLE -> localX * localX + localY * localY <= options.radius * options.radius
      SyntheticShape.ELLIPSE -> localX * localX / (options.radius * 1.45 * options.radius * 1.45) + localY * localY / (options.radius * 0.68 * options.radius * 0.68) <= 1.0
      SyntheticShape.TRIANGLE -> insideTriangle(localX, localY, options.radius)
      SyntheticShape.SQUARE -> abs(localX) <= options.radius && abs(localY) <= options.radius
      SyntheticShape.RECTANGLE -> abs(localX) <= options.radius * 1.25 && abs(localY) <= options.radius * 0.6
      SyntheticShape.SPOON -> insideSpoon(localX, localY, options.radius)
    }
    val occluded = options.partialOcclusion && inside &&
      abs(localX) < options.radius * 0.12 && localY > -options.radius * 0.2 && localY < options.radius * 0.28
    val secondObject = options.includeSecondObject &&
      (localX - options.radius * 2.3) * (localX - options.radius * 2.3) + localY * localY <= options.radius * options.radius
    val distractor = options.includeOutsideDistractor && x < options.width * 0.14 && y > options.height * 0.12 && y < options.height * 0.42
    val gradient = ((x.toDouble() / options.width - 0.5) + (y.toDouble() / options.height - 0.5)) * options.gradient
    val noise = if (options.noise == 0) 0 else ((x * 17 + y * 31) % (options.noise * 2 + 1)) - options.noise
    val base = if ((inside && !occluded) || secondObject || distractor) options.foreground else options.background
    (base + gradient + noise).toInt().coerceIn(0, 255)
  }
}

private fun insideTriangle(x: Double, y: Double, radius: Double): Boolean {
  if (y < -radius || y > radius) return false
  val halfWidth = radius * (y + radius) / (2 * radius)
  return abs(x) <= halfWidth
}

private fun insideSpoon(x: Double, y: Double, radius: Double): Boolean {
  val bowl = x * x / (radius * 0.42 * radius * 0.42) +
    (y + radius * 0.32) * (y + radius * 0.32) / (radius * 0.46 * radius * 0.46) <= 1.0
  val handle = y in (-radius * 0.04)..(radius * 1.02) && abs(x) <= radius * 0.13
  return bowl || handle
}
