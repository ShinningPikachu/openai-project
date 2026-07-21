import { StyleSheet, View } from "react-native";
import type { SimpleShapeTargetId } from "../domain/ShapeTarget";

export function ShapeOverlay({ targetShapeId }: { targetShapeId: SimpleShapeTargetId }) {
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`${targetShapeId} target contour`}
      style={styles.preview}
    >
      <View style={styles.guide}>
        {targetShapeId === "square" ? <View style={styles.square} /> : null}
        {targetShapeId === "rectangle" ? <View style={styles.rectangle} /> : null}
        {targetShapeId === "circle" ? <View style={styles.circle} /> : null}
        {targetShapeId === "triangle" ? (
          <View style={styles.triangleBorder}>
            <View style={styles.triangleFill} />
          </View>
        ) : null}
        {targetShapeId === "spoon" ? (
          <View style={styles.spoon}>
            <View style={styles.spoonBowl} />
            <View style={styles.spoonHandle} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const contour = {
  borderWidth: 3,
  borderColor: "#fef3c7",
  backgroundColor: "rgba(255,255,255,0.16)",
};

const styles = StyleSheet.create({
  preview: {
    alignSelf: "center",
    width: "76%",
    height: 250,
    borderRadius: 24,
    backgroundColor: "#334155",
    padding: 14,
    marginVertical: 4,
  },
  guide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "#fde68a",
  },
  square: {
    width: 108,
    height: 108,
    borderRadius: 10,
    ...contour,
  },
  rectangle: {
    width: 142,
    height: 84,
    borderRadius: 10,
    ...contour,
  },
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    ...contour,
  },
  triangleBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: 60,
    borderRightWidth: 60,
    borderBottomWidth: 108,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fef3c7",
  },
  triangleFill: {
    position: "absolute",
    top: 7,
    left: -51,
    width: 0,
    height: 0,
    borderLeftWidth: 51,
    borderRightWidth: 51,
    borderBottomWidth: 92,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  spoon: { width: 112, height: 142, alignItems: "center" },
  spoonBowl: {
    width: 76,
    height: 76,
    borderRadius: 38,
    ...contour,
  },
  spoonHandle: {
    width: 24,
    height: 68,
    marginTop: -4,
    borderRadius: 12,
    ...contour,
  },
});
