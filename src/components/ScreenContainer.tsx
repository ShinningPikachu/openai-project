import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
export function ScreenContainer({ children }: PropsWithChildren) { return <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>; }
const styles = StyleSheet.create({ content: { padding: 20, gap: 16, flexGrow: 1 } });
