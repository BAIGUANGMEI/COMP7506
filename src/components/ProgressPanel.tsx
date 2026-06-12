import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import type { ImportProgress } from '@/domain/types';

interface ProgressPanelProps {
  progress: ImportProgress;
}

export function ProgressPanel({ progress }: ProgressPanelProps) {
  const color =
    progress.status === 'failed'
      ? colors.red
      : progress.status === 'done'
        ? colors.green
        : progress.status === 'working'
          ? colors.primary
          : colors.muted;

  return (
    <View style={styles.panel}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons
          name={progress.status === 'working' ? 'progress-clock' : progress.status === 'failed' ? 'alert-circle-outline' : 'check-circle-outline'}
          size={24}
          color={color}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{progress.label}</Text>
        <Text style={styles.detail}>{progress.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  detail: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: 3,
  },
});
