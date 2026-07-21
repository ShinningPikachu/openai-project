import { Text, View } from "react-native";

export function ChallengeInstructions({ targetName }: { targetName: string }) {
  return (
    <View>
      <Text>
        Open the camera, then align any object with a similar {targetName.toLowerCase()} inside the light center guide.
      </Text>
      <Text>
        The camera checks the outline continuously. Keep a correct shape in the guide for one second to complete automatically.
      </Text>
      <Text>Processed locally on this device. Not uploaded.</Text>
    </View>
  );
}
