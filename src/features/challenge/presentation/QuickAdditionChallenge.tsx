import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { generateAdditionQuestion } from "../domain/additionChallenge";
import type { AlarmChallengeViewProps } from "./AlarmChallengeView";
import { colors } from "@/theme/colors";

export function QuickAdditionChallenge({
  alarm,
  onAccepted,
  onSessionTransition,
}: AlarmChallengeViewProps) {
  const [question, setQuestion] = useState(() =>
    generateAdditionQuestion(alarm.challengeDifficulty),
  );
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const requiredAnswers = alarm.additionQuestionCount;

  const nextQuestion = () => {
    setQuestion(generateAdditionQuestion(alarm.challengeDifficulty));
  };

  const completeChallenge = async () => {
    setMessage("Correct. Completing alarm challenge…");
    await onAccepted({
      accepted: true,
      confidence: 1,
      processingDurationMs: Date.now() - startedAt.current,
    });
  };

  const selectAnswer = async (answer: number) => {
    if (submitting) return;

    setSubmitting(true);
    onSessionTransition("processing");
    if (answer !== question.total) {
      setMessage("That is not quite right. Here is a new question.");
      nextQuestion();
      onSessionTransition("camera-ready");
      setSubmitting(false);
      return;
    }

    const nextCorrectAnswers = correctAnswers + 1;
    if (nextCorrectAnswers < requiredAnswers) {
      setCorrectAnswers(nextCorrectAnswers);
      setMessage("Correct. Keep going.");
      nextQuestion();
      onSessionTransition("camera-ready");
      setSubmitting(false);
      return;
    }

    setCorrectAnswers(nextCorrectAnswers);
    await completeChallenge();
    setSubmitting(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.instructions}>
        Solve {requiredAnswers} simple sum{requiredAnswers === 1 ? "" : "s"} to
        dismiss the alarm.
      </Text>
      <Text accessibilityRole="header" style={styles.progress}>
        Correct answers: {correctAnswers} of {requiredAnswers}
      </Text>
      <Text
        style={styles.question}
        accessibilityLabel={`What is ${question.left} plus ${question.right}?`}
      >
        {question.left} + {question.right} = ?
      </Text>
      <View style={styles.answers} accessibilityLabel="Answer choices">
        {question.options.map((option) => (
          <Pressable
            key={option}
            onPress={() => void selectAnswer(option)}
            disabled={submitting}
            style={[styles.answer, submitting && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`Answer ${option}`}
            accessibilityHint="Select this answer for the current sum."
          >
            <Text style={styles.answerText}>{option}</Text>
          </Pressable>
        ))}
      </View>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  instructions: { color: colors.textMuted, textAlign: "center" },
  progress: { color: colors.text, fontWeight: "700", textAlign: "center" },
  question: {
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
    color: colors.text,
  },
  answers: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  answer: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexBasis: "46%",
    flexGrow: 1,
    padding: 15,
  },
  answerText: { color: colors.surface, fontSize: 24, fontWeight: "800" },
  message: { color: colors.textMuted, textAlign: "center" },
  disabled: { opacity: 0.5 },
});
