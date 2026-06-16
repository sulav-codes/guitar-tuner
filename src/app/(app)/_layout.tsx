import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="tuning-select"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="instrument-select"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}
