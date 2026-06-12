import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  loading?: boolean;
  variant?: 'solid' | 'outline' | 'subtle';
  style?: ViewStyle;
  onPress: () => void;
}

export function PrimaryButton({ label, icon, loading = false, variant = 'solid', style, onPress }: PrimaryButtonProps) {
  const isSolid = variant === 'solid';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isSolid ? styles.solid : variant === 'outline' ? styles.outline : styles.subtle,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? colors.surface : colors.primary} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={21} color={isSolid ? colors.surface : colors.primary} />
      ) : null}
      <Text style={[styles.label, isSolid ? styles.solidLabel : styles.outlineLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  solid: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  subtle: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '800',
  },
  solidLabel: {
    color: colors.surface,
  },
  outlineLabel: {
    color: colors.primary,
  },
});
