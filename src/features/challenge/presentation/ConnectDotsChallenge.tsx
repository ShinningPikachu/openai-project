import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import {
  generateConnectDotsPattern,
  type ConnectDot,
} from "../domain/connectDots";
import type { AlarmChallengeViewProps } from "./AlarmChallengeView";
import { colors } from "@/theme/colors";

type BoardMetrics = { x: number; y: number; width: number; height: number };
type PositionedDot = ConnectDot & { index: number };

const dotDiameter = 42;

const Segment = ({
  from,
  to,
  color,
}: {
  from: ConnectDot;
  to: ConnectDot;
  color: string;
}) => {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.segment,
        {
          backgroundColor: color,
          width: length,
          left: (from.x + to.x - length) / 2,
          top: (from.y + to.y) / 2 - 2,
          transform: [{ rotate: `${Math.atan2(deltaY, deltaX)}rad` }],
        },
      ]}
    />
  );
};

export function ConnectDotsChallenge({
  alarm,
  onAccepted,
  onSessionTransition,
}: AlarmChallengeViewProps) {
  const [pattern] = useState(() =>
    generateConnectDotsPattern(alarm.challengeDifficulty),
  );
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [completedCount, setCompletedCount] = useState(0);
  const [message, setMessage] = useState(
    "Start at dot 1, then drag through each numbered dot in order.",
  );
  const [pointer, setPointer] = useState<ConnectDot | null>(null);
  const completedRef = useRef(0);
  const drawingRef = useRef(false);
  const completingRef = useRef(false);
  const startedAt = useRef(Date.now());
  const boardRef = useRef<View>(null);
  const boardMetricsRef = useRef(boardMetrics);

  const dots = useMemo<PositionedDot[]>(
    () =>
      pattern.points.map((point, index) => ({
        index,
        x: point.x * boardMetrics.width,
        y: point.y * boardMetrics.height,
      })),
    [boardMetrics.height, boardMetrics.width, pattern],
  );

  const findDot = useCallback(
    (x: number, y: number) => {
      const hitRadius = Math.max(
        30,
        Math.min(boardMetrics.width, boardMetrics.height) * 0.09,
      );
      return dots.find((dot) => Math.hypot(dot.x - x, dot.y - y) <= hitRadius)
        ?.index;
    },
    [boardMetrics.height, boardMetrics.width, dots],
  );

  const resetActiveSegment = useCallback(() => {
    drawingRef.current = false;
    setPointer(null);
  }, []);

  const updateBoardMetrics = useCallback(() => {
    boardRef.current?.measureInWindow((x, y, width, height) => {
      const nextMetrics = { x, y, width, height };
      boardMetricsRef.current = nextMetrics;
      setBoardMetrics(nextMetrics);
    });
  }, []);

  const toBoardPoint = useCallback(
    (pageX: number, pageY: number): ConnectDot | null => {
      const metrics = boardMetricsRef.current;
      if (metrics.width <= 0 || metrics.height <= 0) return null;
      return { x: pageX - metrics.x, y: pageY - metrics.y };
    },
    [],
  );

  const completePattern = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    drawingRef.current = false;
    setPointer(null);
    setMessage("Pattern complete. Completing alarm challenge…");
    onSessionTransition("processing");
    void onAccepted({
      accepted: true,
      confidence: 1,
      processingDurationMs: Date.now() - startedAt.current,
    }).finally(() => {
      completingRef.current = false;
    });
  }, [onAccepted, onSessionTransition]);

  const confirmNextDot = useCallback(
    (index: number, touchPoint?: ConnectDot) => {
      const expectedIndex = completedRef.current;
      if (index !== expectedIndex) return;

      const nextCompletedCount = expectedIndex + 1;
      completedRef.current = nextCompletedCount;
      setCompletedCount(nextCompletedCount);
      const confirmedDot = dots[index]!;
      if (nextCompletedCount < dots.length) {
        setMessage(`Great. Connect dot ${nextCompletedCount + 1} next.`);
        setPointer(touchPoint ?? { x: confirmedDot.x, y: confirmedDot.y });
        return;
      }

      completePattern();
    },
    [completePattern, dots],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (_, gestureState) =>
          boardMetricsRef.current.width > 0 &&
          completedRef.current < dots.length &&
          gestureState.numberActiveTouches === 1,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          boardMetricsRef.current.width > 0 &&
          completedRef.current < dots.length &&
          gestureState.numberActiveTouches === 1,
        onPanResponderGrant: (event, gestureState) => {
          if (
            gestureState.numberActiveTouches !== 1 ||
            event.nativeEvent.touches.length !== 1
          ) {
            resetActiveSegment();
            return;
          }
          const touchPoint = toBoardPoint(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
          if (!touchPoint) return;
          const hit = findDot(touchPoint.x, touchPoint.y);
          const expectedIndex = completedRef.current;
          if (expectedIndex === 0 && hit === 0) {
            drawingRef.current = true;
            confirmNextDot(0, touchPoint);
          } else if (expectedIndex > 0 && hit === expectedIndex - 1) {
            drawingRef.current = true;
            setPointer(touchPoint);
          } else {
            resetActiveSegment();
          }
        },
        onPanResponderMove: (event, gestureState) => {
          if (
            gestureState.numberActiveTouches !== 1 ||
            event.nativeEvent.touches.length !== 1
          ) {
            resetActiveSegment();
            return;
          }
          if (!drawingRef.current) return;
          const touchPoint = toBoardPoint(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
          if (!touchPoint) {
            resetActiveSegment();
            return;
          }
          setPointer(touchPoint);
          const hit = findDot(touchPoint.x, touchPoint.y);
          if (hit === completedRef.current) confirmNextDot(hit, touchPoint);
        },
        onPanResponderRelease: () => {
          resetActiveSegment();
        },
        onPanResponderTerminate: () => {
          resetActiveSegment();
        },
      }),
    [confirmNextDot, dots.length, findDot, resetActiveSegment, toBoardPoint],
  );

  const visibleSegments = dots
    .slice(0, Math.max(0, completedCount))
    .map((dot, index) =>
      index === 0 ? null : (
        <Segment
          key={`${index - 1}-${index}`}
          from={dots[index - 1]!}
          to={dot}
          color={colors.success}
        />
      ),
    );
  const activeSegment =
    pointer && completedCount > 0 && completedCount < dots.length ? (
      <Segment
        from={dots[completedCount - 1]!}
        to={pointer}
        color={colors.primary}
      />
    ) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.instructions}>
        Connect the numbered dots in order without lifting through the wrong
        dot.
      </Text>
      <Text accessibilityRole="header" style={styles.progress}>
        Dots connected: {completedCount} of {dots.length}
      </Text>
      <View
        ref={boardRef}
        {...panResponder.panHandlers}
        onLayout={updateBoardMetrics}
        style={styles.board}
        accessibilityLabel="Connect the dots board"
      >
        {visibleSegments}
        {activeSegment}
        {dots.map((dot) => {
          const connected = dot.index < completedCount;
          return (
            <View
              key={dot.index}
              style={[
                styles.dot,
                { left: dot.x - dotDiameter / 2, top: dot.y - dotDiameter / 2 },
                connected && styles.dotConnected,
              ]}
              accessible
              accessibilityLabel={`Dot ${dot.index + 1}${connected ? ", connected" : ""}`}
            >
              <Text style={styles.dotText}>{dot.index + 1}</Text>
            </View>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </Text>
      {completedCount === dots.length ? (
        <Pressable
          onPress={completePattern}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry alarm dismissal"
        >
          <Text style={styles.retryText}>Complete alarm dismissal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  instructions: { color: colors.textMuted, textAlign: "center" },
  progress: { color: colors.text, fontWeight: "700", textAlign: "center" },
  board: {
    height: 360,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: "hidden",
  },
  segment: { position: "absolute", height: 4, borderRadius: 2 },
  dot: {
    position: "absolute",
    width: dotDiameter,
    height: dotDiameter,
    borderRadius: dotDiameter / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  dotConnected: {
    backgroundColor: colors.success,
    borderColor: colors.successSoft,
  },
  dotText: { color: colors.surface, fontWeight: "800" },
  message: { color: colors.textMuted, minHeight: 20, textAlign: "center" },
  retry: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  retryText: { color: colors.surface, fontWeight: "800" },
});
