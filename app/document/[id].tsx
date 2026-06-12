import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { DocumentSummary } from '@/domain/types';
import { loadDocumentSummary } from '@/services/analysisService';
import { confirmDestructiveAction } from '@/utils/confirm';
import { goBackOrHome } from '@/utils/navigation';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const documentId = params.id;
  const {
    analyze,
    categories,
    deleteDocument,
    documents,
    saveDocumentMetadata,
    saveDocumentSummary,
    setSelectedDocumentId,
  } = useAppData();
  const document = useMemo(() => documents.find((item) => item.id === documentId), [documentId, documents]);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [overview, setOverview] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [outline, setOutline] = useState('');
  const [terms, setTerms] = useState('');
  const [readingGuide, setReadingGuide] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    if (!document) {
      return;
    }

    setTitle(document.title);
    setTags(document.tags.join(', '));
    setNotes(document.notes);
    setCategoryId(document.categoryId);
    void loadDocumentSummary(document.id).then((nextSummary) => {
      setSummary(nextSummary);
      setOverview(nextSummary?.overview ?? '');
      setKeyPoints(nextSummary?.keyPoints.join('\n') ?? '');
      setOutline(nextSummary?.outline.join('\n') ?? '');
      setTerms(nextSummary?.terms.join(', ') ?? '');
      setReadingGuide(nextSummary?.readingGuide ?? '');
    });
  }, [document]);

  const handleSave = async () => {
    if (!document) {
      return;
    }

    setSaving(true);
    try {
      await saveDocumentMetadata(document.id, {
        title,
        categoryId,
        notes,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!document) {
      return;
    }

    setAnalyzing(true);
    try {
      await analyze(document.id);
      const nextSummary = await loadDocumentSummary(document.id);
      setSummary(nextSummary);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!document) {
      return;
    }

    setSavingSummary(true);
    try {
      const nextSummary: DocumentSummary = {
        documentId: document.id,
        overview,
        keyPoints: parseLines(keyPoints),
        outline: parseLines(outline),
        terms: terms
          .split(',')
          .map((term) => term.trim())
          .filter(Boolean),
        readingGuide,
        updatedAt: new Date().toISOString(),
      };

      await saveDocumentSummary(nextSummary);
      setSummary(nextSummary);
      setExportStatus('Summary saved.');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!document) {
      return;
    }

    const { copySummaryMarkdown } = await import('@/services/exportService');
    await copySummaryMarkdown(document, summary);
    setExportStatus('Markdown copied to clipboard.');
  };

  const handleExportMarkdown = async () => {
    if (!document) {
      return;
    }

    try {
      const { shareSummaryMarkdown } = await import('@/services/exportService');
      const uri = await shareSummaryMarkdown(document, summary);
      setExportStatus(`Markdown exported: ${uri}`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'Export failed.');
    }
  };

  const handleDeleteDocument = async () => {
    if (!document) {
      return;
    }

    const confirmed = await confirmDestructiveAction({
      title: 'Delete document?',
      message: `This removes "${document.title}" and its local analysis data.`,
      confirmLabel: 'Delete',
    });

    if (confirmed) {
      await deleteDocument(document.id);
      router.replace('/');
    }
  };

  if (!document) {
    return (
      <Screen scroll={false} contentStyle={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => goBackOrHome(router)} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{document.fileType.toUpperCase()} · {document.analysisStatus}</Text>
          <Text numberOfLines={2} style={styles.title}>
            {document.title}
          </Text>
        </View>
      </View>

      <View style={styles.editor}>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput onChangeText={setTitle} style={styles.input} value={title} />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCategoryId(null)}
            style={[styles.categoryChip, categoryId === null && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryText, categoryId === null && styles.categoryTextActive]}>Unsorted</Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              accessibilityRole="button"
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[styles.categoryChip, categoryId === category.id && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, categoryId === category.id && styles.categoryTextActive]}>{category.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Tags</Text>
        <TextInput onChangeText={setTags} placeholder="exam, transformer, review" placeholderTextColor={colors.faint} style={styles.input} value={tags} />

        <Text style={styles.fieldLabel}>Personal notes</Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Add private notes or reading reminders"
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.notesInput]}
          value={notes}
        />

        <View style={styles.actions}>
          <PrimaryButton icon="content-save-outline" label="Save metadata" loading={saving} onPress={handleSave} />
          <PrimaryButton icon="auto-fix" label="Analyze again" loading={analyzing} variant="outline" onPress={handleAnalyze} />
        </View>
      </View>

      <SectionHeader title="AI Summary" />
      <View style={styles.summaryEditor}>
        <Text style={styles.fieldLabel}>Overview</Text>
        <TextInput
          multiline
          onChangeText={setOverview}
          placeholder="No summary yet. Run analysis to create one."
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.summaryInput]}
          value={overview}
        />

        <Text style={styles.fieldLabel}>Key points</Text>
        <TextInput
          multiline
          onChangeText={setKeyPoints}
          placeholder="One key point per line"
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.summaryInput]}
          value={keyPoints}
        />

        <Text style={styles.fieldLabel}>Outline</Text>
        <TextInput
          multiline
          onChangeText={setOutline}
          placeholder="One outline item per line"
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.summaryInput]}
          value={outline}
        />

        <Text style={styles.fieldLabel}>Terms</Text>
        <TextInput
          onChangeText={setTerms}
          placeholder="term, another term"
          placeholderTextColor={colors.faint}
          style={styles.input}
          value={terms}
        />

        <Text style={styles.fieldLabel}>Reading guide</Text>
        <TextInput
          multiline
          onChangeText={setReadingGuide}
          placeholder="How should the user study this document?"
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.summaryInput]}
          value={readingGuide}
        />

        <View style={styles.actions}>
          <PrimaryButton icon="content-save-edit-outline" label="Save summary" loading={savingSummary} onPress={handleSaveSummary} />
          <PrimaryButton icon="content-copy" label="Copy Markdown" variant="outline" onPress={handleCopyMarkdown} />
          <PrimaryButton icon="share-variant-outline" label="Export Markdown" variant="outline" onPress={handleExportMarkdown} />
        </View>
        {exportStatus ? <Text style={styles.statusText}>{exportStatus}</Text> : null}
      </View>

      <SummaryList title="Current key points" items={summary?.keyPoints ?? []} icon="check-circle-outline" />
      <SummaryList title="Current outline" items={summary?.outline ?? []} icon="format-list-bulleted" />
      <SummaryList title="Current terms" items={summary?.terms ?? []} icon="tag-outline" compact />

      <PrimaryButton
        icon="message-text-outline"
        label="Ask about this document"
        onPress={() => {
          setSelectedDocumentId(document.id);
          router.push('/ask');
        }}
        style={styles.askButton}
      />
      <PrimaryButton icon="delete-outline" label="Delete document" variant="outline" onPress={handleDeleteDocument} style={styles.deleteButton} />
    </Screen>
  );
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function SummaryList({
  title,
  items,
  icon,
  compact = false,
}: {
  title: string;
  items: string[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionHeader title={title} />
      <View style={compact ? styles.termRow : styles.summaryList}>
        {items.map((item) =>
          compact ? (
            <View key={item} style={styles.term}>
              <Text style={styles.termText}>{item}</Text>
            </View>
          ) : (
            <View key={item} style={styles.summaryItem}>
              <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
              <Text style={styles.summaryItemText}>{item}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 3,
  },
  editor: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 22,
    padding: 14,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontSize: typography.small,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  notesInput: {
    minHeight: 92,
    paddingTop: 11,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSoft,
    fontSize: typography.small,
    fontWeight: '800',
  },
  categoryTextActive: {
    color: colors.surface,
  },
  actions: {
    gap: 10,
    marginTop: 16,
  },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
  },
  summaryEditor: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
  },
  summaryInput: {
    minHeight: 88,
    paddingTop: 11,
    textAlignVertical: 'top',
  },
  overview: {
    color: colors.textSoft,
    fontSize: typography.body,
    lineHeight: 24,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  summaryItemText: {
    color: colors.textSoft,
    flex: 1,
    fontSize: typography.body,
    lineHeight: 23,
  },
  termRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  term: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  termText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '800',
  },
  readingGuide: {
    color: colors.textSoft,
    fontSize: typography.body,
    lineHeight: 24,
  },
  askButton: {
    marginTop: 24,
  },
  deleteButton: {
    borderColor: colors.red,
    marginTop: 12,
  },
  statusText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: 10,
  },
});
