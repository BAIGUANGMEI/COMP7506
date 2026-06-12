import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import type { AnalysisStatus, DocumentRecord, FileType } from '@/domain/types';

interface DocumentRowProps {
  document: DocumentRecord;
  onPress: () => void;
  onAnalyze?: () => void;
  onMore?: () => void;
}

export function DocumentRow({ document, onPress, onAnalyze, onMore }: DocumentRowProps) {
  const file = fileVisual(document.fileType);
  const status = statusVisual(document.analysisStatus);
  const canAnalyze = document.analysisStatus !== 'analyzed' && document.analysisStatus !== 'analyzing' && Boolean(onAnalyze);

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.mainPressable, pressed && styles.pressed]}>
        <View style={[styles.fileIcon, { backgroundColor: file.background }]}>
          <MaterialCommunityIcons name={file.icon} size={28} color={file.color} />
          <Text style={styles.fileLabel}>{file.label}</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {document.title}
          </Text>
          <Text style={styles.meta}>
            {relativeTime(document.updatedAt)} · {document.sizeLabel}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!canAnalyze}
        onPress={onAnalyze}
        style={({ pressed }) => [styles.badge, { backgroundColor: status.background }, canAnalyze && styles.badgeAction, pressed && styles.pressed]}
      >
        <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Open document actions"
        accessibilityRole="button"
        onPress={onMore ?? onPress}
        style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="dots-vertical" size={23} color={colors.faint} />
      </Pressable>
    </View>
  );
}

function fileVisual(fileType: FileType): {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  background: string;
  label: string;
} {
  switch (fileType) {
    case 'pdf':
      return { icon: 'file-pdf-box', color: colors.red, background: colors.redSoft, label: 'PDF' };
    case 'doc':
    case 'docx':
      return { icon: 'file-word-box', color: colors.primary, background: colors.primarySoft, label: 'W' };
    case 'md':
      return { icon: 'language-markdown', color: colors.textSoft, background: colors.graySoft, label: 'MD' };
    case 'txt':
      return { icon: 'file-document-outline', color: colors.muted, background: colors.graySoft, label: 'TXT' };
    default:
      return { icon: 'file-question-outline', color: colors.muted, background: colors.graySoft, label: '?' };
  }
}

function statusVisual(status: AnalysisStatus): { label: string; color: string; background: string } {
  switch (status) {
    case 'analyzed':
      return { label: 'Analyzed', color: colors.green, background: colors.greenSoft };
    case 'analyzing':
      return { label: 'Analyzing', color: colors.primary, background: colors.primarySoft };
    case 'failed':
      return { label: 'Failed', color: colors.red, background: colors.redSoft };
    case 'queued':
      return { label: 'Pending', color: colors.orange, background: colors.orangeSoft };
    default:
      return { label: 'Not analyzed', color: colors.muted, background: colors.graySoft };
  }
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 13,
    minHeight: 78,
  },
  mainPressable: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 78,
  },
  pressed: {
    opacity: 0.72,
  },
  fileIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  fileLabel: {
    color: colors.surface,
    fontSize: 8,
    fontWeight: '900',
    marginTop: -7,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 6,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeAction: {
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: typography.small,
    fontWeight: '800',
  },
  moreButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 28,
  },
});
