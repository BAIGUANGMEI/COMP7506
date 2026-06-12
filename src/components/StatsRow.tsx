import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import type { LibraryStats } from '@/domain/types';

interface StatConfig {
  label: string;
  value: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

interface StatsRowProps {
  stats: LibraryStats;
}

export function StatsRow({ stats }: StatsRowProps) {
  const items: StatConfig[] = [
    { label: 'Documents', value: stats.totalDocuments, icon: 'file-document-outline', color: colors.primary },
    { label: 'Analyzed', value: stats.analyzed, icon: 'check-circle-outline', color: colors.green },
    { label: 'Pending', value: stats.pending, icon: 'clock-outline', color: colors.orange },
    { label: 'Notes', value: stats.annotations, icon: 'star-outline', color: colors.purple },
  ];

  return (
    <View style={styles.row}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.item, index > 0 && styles.divider]}>
          <View style={styles.valueRow}>
            <MaterialCommunityIcons name={item.icon} size={25} color={item.color} />
            <Text style={styles.value}>{item.value}</Text>
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 26,
  },
  item: {
    flex: 1,
    paddingLeft: 8,
  },
  divider: {
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  value: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  label: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 6,
    textAlign: 'center',
  },
});
