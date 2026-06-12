import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import type { ModelSettings } from '@/domain/types';

interface ApiStatusCardProps {
  settings: ModelSettings | null;
  onPress: () => void;
}

export function ApiStatusCard({ settings, onPress }: ApiStatusCardProps) {
  const isConnected = Boolean(settings?.hasApiKey);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={[styles.iconCircle, isConnected ? styles.connected : styles.disconnected]}>
        <MaterialCommunityIcons
          name={isConnected ? 'check' : 'key-variant'}
          size={30}
          color={isConnected ? colors.surface : colors.orange}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Kimi API</Text>
        <Text style={styles.subtitle}>
          {isConnected ? 'Connected' : 'Not configured'} · {settings?.chatModel ?? 'kimi-k2.6'}
        </Text>
      </View>
      <View style={styles.manage}>
        <Text style={styles.manageText}>Manage API Key</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
    minHeight: 96,
    paddingHorizontal: 14,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  connected: {
    backgroundColor: colors.green,
  },
  disconnected: {
    backgroundColor: colors.orangeSoft,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 4,
  },
  manage: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  manageText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
