import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { generateAdditionQuestion } from "../domain/additionChallenge";
import type { AlarmChallengeViewProps } from "./AlarmChallengeView";

export function QuickAdditionChallenge({
  alarm,
  onAccepted,
  onSessionTransition,
}: AlarmChallengeViewProps) {
  const [question, setQuestion] = useState(() => generateAdditionQuestion(alarm.challengeDifficulty));
  const [answer, setAnswer] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const requiredAnswers = alarm.additionQuestionCount;

  const nextQuestion = () => {
    setQuestion(generateAdditionQuestion(alarm.challengeDifficulty));
    setAnswer("");
  };

  const completeChallenge = async () => {
    setMessage("Correct. Completing alarm challenge…");
    await onAccepted({
      accepted: true,
      confidence: 1,
      processingDurationMs: Date.now() - startedAt.current,
    });
  };

  const submit = async () => {
    const normalizedAnswer = answer.trim();
    if (!/^\d+$/.test(normalizedAnswer)) {
      setMessage("Enter a whole-number answer.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    onSessionTransition("processing");
    if (correctAnswers >= requiredAnswers) {
      await completeChallenge();
      setSubmitting(false);
      return;
    }
    if (Number(normalizedAnswer) !== question.total) {
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
        Solve {requiredAnswers} simple sum{requiredAnswers === 1 ? "" : "s"} to dismiss the alarm.
      </Text>
      <Text accessibilityRole="header" style={styles.progress}>
        Correct answers: {correctAnswers} of {requiredAnswers}
      </Text>
      <Text style={styles.question} accessibilityLabel={`What is ${question.left} plus ${question.right}?`}>
        {question.left} + {question.right} = ?
      </Text>
      <TextInput
        value={answer}
        onChangeText={setAnswer}
        onSubmitEditing={() => void submit()}
        keyboardType="number-pad"
        returnKeyType="done"
        editable={!submitting}
        style={styles.input}
        accessibilityLabel="Addition answer"
        accessibilityHint="Enter the answer, then press Check answer."
      />
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      <Pressable
        onPress={() => void submit()}
        disabled={submitting}
        style={[styles.button, submitting && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Check addition answer"
      >
        <Text style={styles.buttonText}>{submitting ? "Checking…" : "Check answer"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 20, borderRadius: 16, backgroundColor: "#fff" },
  instructions: { color: "#374151", textAlign: "center" },
  progress: { fontWeight: "700", textAlign: "center" },
  question: { fontSize: 38, fontWeight: "800", textAlign: "center", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#9ca3af", borderRadius: 10, padding: 14, fontSize: 24, textAlign: "center" },
  message: { color: "#374151", textAlign: "center" },
  button: { backgroundColor: "#1d4ed8", padding: 15, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.5 },
});
