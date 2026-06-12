import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategoryStrip } from '@/components/CategoryStrip';
import { DocumentRow } from '@/components/DocumentRow';
import { Screen } from '@/components/Screen';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { AnalysisStatus } from '@/domain/types';

const STATUS_FILTERS: Array<{ label: string; value: AnalysisStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Analyzed', value: 'analyzed' },
  { label: 'Pending', value: 'queued' },
  { label: 'Failed', value: 'failed' },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { analyze, categories, documents } = useAppData();
  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | 'all'>('all');
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesCategory = !selectedCategoryId || document.categoryId === selectedCategoryId;
      const matchesStatus = statusFilter === 'all' || document.analysisStatus === statusFilter;
      const matchesQuery =
        !normalized ||
        [document.title, document.fileType, document.tags.join(' '), document.sourceName]
          .join(' ')
          .toLowerCase()
          .includes(normalized);

      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [documents, query, selectedCategoryId, statusFilter]);

  const handleAnalyze = async (documentId: string) => {
    setBusyDocumentId(documentId);
    try {
      await analyze(documentId);
    } finally {
      setBusyDocumentId(null);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>All Documents</Text>
          <Text style={styles.subtitle}>Browse, filter, and reopen every local study file.</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Search documents, tags, or file types"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.statusRow}>
        {STATUS_FILTERS.map((filter) => (
          <Pressable
            accessibilityRole="button"
            key={filter.value}
            onPress={() => setStatusFilter(filter.value)}
            style={[styles.statusChip, statusFilter === filter.value && styles.statusChipActive]}
          >
            <Text style={[styles.statusText, statusFilter === filter.value && styles.statusTextActive]}>{filter.label}</Text>
          </Pressable>
        ))}
      </View>

      <CategoryStrip
        categories={categories}
        onManageCategories={() => router.push('/settings')}
        onSelect={(categoryId) => setSelectedCategoryId((current) => (current === categoryId ? null : categoryId))}
        selectedCategoryId={selectedCategoryId}
      />

      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{filteredDocuments.length} result{filteredDocuments.length === 1 ? '' : 's'}</Text>
        {selectedCategoryId || statusFilter !== 'all' || query ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setQuery('');
              setSelectedCategoryId(null);
              setStatusFilter('all');
            }}
          >
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      {filteredDocuments.map((document) => (
        <DocumentRow
          document={document}
          key={document.id}
          onAnalyze={() => handleAnalyze(document.id)}
          onMore={() => router.push(`/document/${document.id}`)}
          onPress={() => router.push(`/document/${document.id}`)}
        />
      ))}

      {filteredDocuments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="file-search-outline" size={34} color={colors.faint} />
          <Text style={styles.emptyTitle}>No documents found</Text>
          <Text style={styles.emptyText}>Try a different search or clear the active filters.</Text>
        </View>
      ) : null}

      {busyDocumentId ? <Text style={styles.busyText}>Analyzing selected document...</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 21,
    marginTop: 4,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 46,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
    marginTop: 16,
  },
  statusChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusText: {
    color: colors.textSoft,
    fontSize: typography.small,
    fontWeight: '800',
  },
  statusTextActive: {
    color: colors.surface,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  resultTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  clearText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 5,
    textAlign: 'center',
  },
  busyText: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 12,
    textAlign: 'center',
  },
});
