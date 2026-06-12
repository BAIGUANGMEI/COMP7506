import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="folder" size={size} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="message-text" size={size} />,
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: 'Import',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="tray-arrow-up" size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="cog" size={size} />,
        }}
      />
    </Tabs>
  );
}
