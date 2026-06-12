import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import type { DocumentRecord } from '@/domain/types';
import { confirmDestructiveAction } from '@/utils/confirm';

interface DocumentActionSheetProps {
  document: DocumentRecord | null;
  visible: boolean;
  busy?: boolean;
  onAnalyze: (document: DocumentRecord) => Promise<void> | void;
  onAsk: (document: DocumentRecord) => void;
  onClose: () => void;
  onDelete: (document: DocumentRecord) => Promise<void> | void;
  onOpen: (document: DocumentRecord) => void;
}

export function DocumentActionSheet({
  document,
  visible,
  busy = false,
  onAnalyze,
  onAsk,
  onClose,
  onDelete,
  onOpen,
}: DocumentActionSheetProps) {
  const canAnalyze = document?.analysisStatus !== 'analyzing';

  const handleOpen = () => {
    if (!document) {
      return;
    }

    onClose();
    onOpen(document);
  };

  const handleAsk = () => {
    if (!document) {
      return;
    }

    onClose();
    onAsk(document);
  };

  const handleAnalyze = async () => {
    if (!document || !canAnalyze) {
      return;
    }

    onClose();
    await onAnalyze(document);
  };

  const handleDelete = async () => {
    if (!document) {
      return;
    }

    const confirmed = await confirmDestructiveAction({
      title: 'Delete document?',
      message: `This removes "${document.title}" and its local analysis data.`,
      confirmLabel: 'Delete',
    });

    if (confirmed) {
      onClose();
      await onDelete(document);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible && Boolean(document)}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close document actions" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.fileIcon}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text numberOfLines={2} style={styles.title}>
                {document?.title}
              </Text>
              <Text style={styles.meta}>
                {document?.fileType.toUpperCase()} - {document?.analysisStatus} - {document?.sizeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <ActionRow icon="file-eye-outline" label="View details" onPress={handleOpen} />
            <ActionRow icon="message-question-outline" label="Ask about this document" onPress={handleAsk} />
            <ActionRow
              disabled={!canAnalyze || busy}
              icon="auto-fix"
              label={document?.analysisStatus === 'analyzed' ? 'Analyze again' : 'Analyze document'}
              onPress={handleAnalyze}
            />
            <ActionRow destructive icon="delete-outline" label="Delete document" onPress={handleDelete} />
          </View>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  destructive = false,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  const color = destructive ? colors.red : disabled ? colors.faint : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={disabled ? colors.faint : colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16, 20, 35, 0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: 16,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: 14,
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
    lineHeight: 22,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.tiny,
    marginTop: 4,
  },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
  },
  actionText: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.55,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.graySoft,
    borderRadius: radii.md,
    marginTop: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSoft,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
