import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from '@/data/AppProvider';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="documents" options={{ presentation: 'card' }} />
        <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </AppProvider>
  );
}
