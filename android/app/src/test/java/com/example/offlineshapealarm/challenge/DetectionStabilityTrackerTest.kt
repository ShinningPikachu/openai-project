package com.example.offlineshapealarm.challenge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DetectionStabilityTrackerTest {
  @Test
  fun acceptsOnlyAfterOneSecondOfStableMatches() {
    val tracker = DetectionStabilityTracker(requiredStableMs = 1_000)
    var temporal = tracker.update(match(), 0)
    assertFalse(temporal.stable)

    listOf(250L, 500L, 750L).forEach { timestamp ->
      temporal = tracker.update(match(), timestamp)
      assertFalse(temporal.stable)
      assertTrue(temporal.guideMatched)
    }

    temporal = tracker.update(match(), 1_000)
    assertTrue(temporal.stable)
    assertEquals(DetectionState.MATCHED, temporal.state)
  }

  @Test
  fun briefPartialDropoutDecaysButDoesNotAggressivelyResetProgress() {
    val tracker = DetectionStabilityTracker(requiredStableMs = 1_000)
    tracker.update(match(), 0)
    val dropout = tracker.update(partial(), 250)

    assertTrue(dropout.guideMatched)
    assertTrue(dropout.progress > 0.0)
    assertFalse(dropout.stable)

    var temporal = tracker.update(match(), 500)
    assertFalse(temporal.stable)
    temporal = tracker.update(match(), 1_000)
    assertFalse(temporal.stable)
    temporal = tracker.update(match(), 1_150)
    assertTrue(temporal.stable)
  }

  @Test
  fun mismatchResetsStabilityAndReturnsMismatchFeedback() {
    val tracker = DetectionStabilityTracker(requiredStableMs = 1_000)
    tracker.update(match(), 0)
    val temporal = tracker.update(mismatch(), 250)

    assertFalse(temporal.guideMatched)
    assertEquals(0.0, temporal.progress, 0.0)
    assertEquals(DetectionState.MISMATCH, temporal.state)
    assertEquals("Shape does not match", temporal.feedback)
  }

  private fun match(): ShapeAnalysis = ShapeAnalysis(
    target = SupportedShape.CIRCLE,
    confidence = 0.72,
    acceptanceThreshold = 0.58,
    rawAccepted = true,
    state = DetectionState.MATCHED,
    failureReason = null,
    features = null,
    featureScores = null,
    candidateCount = 1,
    meanBrightness = 120.0,
    processingDurationMs = 3,
    classifiedShape = SupportedShape.CIRCLE,
    debugSnapshot = null,
  )

  private fun partial(): ShapeAnalysis = match().copy(
    confidence = 0.5,
    rawAccepted = false,
    state = DetectionState.PARTIAL_MATCH,
    failureReason = "shape-does-not-match",
  )

  private fun mismatch(): ShapeAnalysis = match().copy(
    confidence = 0.2,
    rawAccepted = false,
    state = DetectionState.MISMATCH,
    failureReason = "shape-does-not-match",
  )
}
