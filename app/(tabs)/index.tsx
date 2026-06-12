import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiStatusCard } from '@/components/ApiStatusCard';
import { CategoryStrip } from '@/components/CategoryStrip';
import { DocumentActionSheet } from '@/components/DocumentActionSheet';
import { DocumentRow } from '@/components/DocumentRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatsRow } from '@/components/StatsRow';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { DocumentRecord } from '@/domain/types';

export default function LibraryScreen() {
  const router = useRouter();
  const {
    analyze,
    categories,
    deleteDocument,
    documents,
    importDocument,
    isReady,
    setSelectedDocumentId,
    settings,
    stats,
  } = useAppData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const actionDocument = useMemo(
    () => documents.find((document) => document.id === actionDocumentId) ?? null,
    [actionDocumentId, documents],
  );

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesCategory = !selectedCategoryId || document.categoryId === selectedCategoryId;
      const matchesQuery =
        !normalized ||
        [document.title, document.fileType, document.tags.join(' ')].join(' ').toLowerCase().includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [documents, query, selectedCategoryId]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const document = await importDocument();
      if (document) {
        await analyze(document.id);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleAnalyze = async (documentId: string) => {
    setBusyDocumentId(documentId);
    try {
      await analyze(documentId);
    } finally {
      setBusyDocumentId(null);
    }
  };

  const openDocument = (document: DocumentRecord) => {
    router.push(`/document/${document.id}`);
  };

  const askDocument = (document: DocumentRecord) => {
    setSelectedDocumentId(document.id);
    router.push('/ask');
  };

  if (!isReady) {
    return (
      <Screen scroll={false} contentStyle={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your local library...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Import, analyze, and manage your study materials</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={() => setSearchOpen((value) => !value)} style={styles.iconButton}>
            <MaterialCommunityIcons name="magnify" size={31} color={colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleImport} style={[styles.iconButton, styles.addButton]}>
            <MaterialCommunityIcons name="plus" size={30} color={colors.surface} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
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
      ) : null}

      <ApiStatusCard settings={settings} onPress={() => router.push('/settings')} />
      <StatsRow stats={stats} />

      <SectionHeader
        title="Categories"
        actionLabel={selectedCategoryId ? 'Clear filter' : 'Manage'}
        onAction={() => (selectedCategoryId ? setSelectedCategoryId(null) : router.push('/settings'))}
      />
      <CategoryStrip
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelect={(categoryId) => setSelectedCategoryId((current) => (current === categoryId ? null : categoryId))}
      />

      <SectionHeader title="Recent Documents" actionLabel="View all" onAction={() => router.push('/documents')} />
      <View style={styles.documentList}>
        {filteredDocuments.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            onAnalyze={() => handleAnalyze(document.id)}
            onMore={() => setActionDocumentId(document.id)}
            onPress={() => router.push(`/document/${document.id}`)}
          />
        ))}
      </View>

      <Pressable accessibilityRole="button" disabled={importing} onPress={handleImport} style={styles.importDropzone}>
        {importing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <MaterialCommunityIcons name="tray-arrow-up" size={28} color={colors.primary} />
        )}
        <Text style={styles.importTitle}>Import Document</Text>
        <Text style={styles.importSubtitle}>Supports PDF, Word, Markdown, TXT</Text>
      </Pressable>

      <PrimaryButton label="Open Import Flow" icon="tray-arrow-up" variant="subtle" onPress={() => router.push('/import')} />
      {busyDocumentId ? <Text style={styles.busyText}>Analyzing selected document...</Text> : null}
      <DocumentActionSheet
        busy={busyDocumentId === actionDocument?.id}
        document={actionDocument}
        onAnalyze={(document) => handleAnalyze(document.id)}
        onAsk={askDocument}
        onClose={() => setActionDocumentId(null)}
        onDelete={(document) => deleteDocument(document.id)}
        onOpen={openDocument}
        visible={Boolean(actionDocument)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 12,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: 4,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 5,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  addButton: {
    backgroundColor: colors.primary,
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
  documentList: {
    backgroundColor: colors.background,
  },
  importDropzone: {
    alignItems: 'center',
    borderColor: '#7AA2FF',
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 22,
    minHeight: 104,
  },
  importTitle: {
    color: colors.primary,
    fontSize: typography.h3,
    fontWeight: '900',
    marginTop: 8,
  },
  importSubtitle: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 6,
  },
  busyText: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 12,
    textAlign: 'center',
  },
});
