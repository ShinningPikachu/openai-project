import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";
export function ScreenContainer({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: 20, gap: 16, flexGrow: 1 },
});
