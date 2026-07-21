import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatWheelValue, wrapWheelValue } from "./timeWheelValue";

const rowHeight = 44;
const cycleCount = 9;
const centerCycle = Math.floor(cycleCount / 2);

type TimeWheelPickerProps = {
  label: string;
  maximum: number;
  value: number;
  onValueChange(value: number): void;
};

export function TimeWheelPicker({
  label,
  maximum,
  value,
  onValueChange,
}: TimeWheelPickerProps) {
  const count = maximum + 1;
  const normalizedValue = wrapWheelValue(value, count);
  const scrollRef = useRef<ScrollView>(null);
  const valueRef = useRef(normalizedValue);
  const listIndexRef = useRef(centerCycle * count + normalizedValue);
  const data = useMemo(
    () => Array.from({ length: count * cycleCount }, (_, index) => index),
    [count],
  );

  const centerIndexFor = useCallback(
    (nextValue: number) => centerCycle * count + wrapWheelValue(nextValue, count),
    [count],
  );

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    listIndexRef.current = index;
    scrollRef.current?.scrollTo({ y: index * rowHeight, animated });
  }, []);

  useEffect(() => {
    if (valueRef.current === normalizedValue) return;
    valueRef.current = normalizedValue;
    requestAnimationFrame(() => scrollToIndex(centerIndexFor(normalizedValue), false));
  }, [centerIndexFor, normalizedValue, scrollToIndex]);

  const settleAtIndex = useCallback((rawIndex: number) => {
    const index = Math.min(Math.max(rawIndex, 0), data.length - 1);
    const nextValue = index % count;
    const nearBoundary = index < count * 2 || index > data.length - count * 3;

    listIndexRef.current = index;
    if (nextValue !== valueRef.current) {
      valueRef.current = nextValue;
      onValueChange(nextValue);
    }
    if (nearBoundary) {
      requestAnimationFrame(() => scrollToIndex(centerIndexFor(nextValue), false));
    }
  }, [centerIndexFor, count, data.length, onValueChange, scrollToIndex]);

  const adjust = useCallback((direction: 1 | -1) => {
    const nextValue = wrapWheelValue(valueRef.current + direction, count);
    valueRef.current = nextValue;
    onValueChange(nextValue);
    scrollToIndex(centerIndexFor(nextValue), true);
  }, [centerIndexFor, count, onValueChange, scrollToIndex]);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: maximum,
        now: normalizedValue,
        text: formatWheelValue(normalizedValue),
      }}
      accessibilityHint={`Swipe up or down to change the ${label.toLowerCase()}.`}
      accessibilityActions={[
        { name: "increment", label: `Increase ${label.toLowerCase()}` },
        { name: "decrement", label: `Decrease ${label.toLowerCase()}` },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") adjust(1);
        if (event.nativeEvent.actionName === "decrement") adjust(-1);
      }}
      style={styles.container}
    >
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: listIndexRef.current * rowHeight }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        snapToInterval={rowHeight}
        snapToAlignment="start"
        onMomentumScrollEnd={(event) =>
          settleAtIndex(Math.round(event.nativeEvent.contentOffset.y / rowHeight))
        }
      >
        {data.map((index) => <Text key={index} style={styles.value}>{formatWheelValue(index % count)}</Text>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: rowHeight * 3, overflow: "hidden", position: "relative" },
  content: { paddingVertical: rowHeight },
  selection: {
    position: "absolute",
    top: rowHeight,
    left: 0,
    right: 0,
    height: rowHeight,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1d4ed8",
    backgroundColor: "#dbeafe80",
    zIndex: 1,
  },
  value: { height: rowHeight, fontSize: 24, fontVariant: ["tabular-nums"], textAlign: "center", textAlignVertical: "center" },
});
