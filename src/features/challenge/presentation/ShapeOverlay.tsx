import { StyleSheet, View } from "react-native";
export function ShapeOverlay() { return <View pointerEvents="none" style={styles.guide} />; }
const styles = StyleSheet.create({ guide: { alignSelf: "center", width: "72%", height: 96, borderRadius: 48, borderWidth: 3, borderColor: "#facc15", borderStyle: "dashed", marginVertical: 16 } });
