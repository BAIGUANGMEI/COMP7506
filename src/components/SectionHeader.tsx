import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '800',
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 36,
  },
  actionText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
