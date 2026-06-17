import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import { SettingsProvider } from "@/ctx/settings";
import "../global.css";
import { useAudioEngineSetup } from "@/lib/audio-engine";

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

const RootLayout: React.FC = () => {
  useAudioEngineSetup();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#121212" }}>
      <StatusBar style="light" backgroundColor="#121212" />
      <SettingsProvider>
        <RootLayoutNav />
        <PortalHost />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
