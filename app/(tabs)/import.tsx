import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { DocumentActionSheet } from '@/components/DocumentActionSheet';
import { DocumentRow } from '@/components/DocumentRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressPanel } from '@/components/ProgressPanel';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { DocumentRecord } from '@/domain/types';

export default function ImportScreen() {
  const router = useRouter();
  const { analyze, deleteDocument, documents, importDocument, importProgress, setSelectedDocumentId, settings } = useAppData();
  const [working, setWorking] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);

  const actionDocument = documents.find((document) => document.id === actionDocumentId) ?? null;

  const handleImportAndAnalyze = async () => {
    setWorking(true);
    try {
      const document = await importDocument();
      if (document) {
        await analyze(document.id);
        router.push(`/document/${document.id}`);
      }
    } finally {
      setWorking(false);
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Local-first pipeline</Text>
        <Text style={styles.title}>Import study material</Text>
        <Text style={styles.subtitle}>
          Files stay on this device. TXT and Markdown are parsed locally; PDF and Word extraction can use your Kimi API.
        </Text>
      </View>

      <View style={styles.importPanel}>
        <View style={styles.importIcon}>
          {working ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="file-upload-outline" size={34} color={colors.primary} />
          )}
        </View>
        <Text style={styles.importTitle}>PDF, Word, Markdown, TXT</Text>
        <Text style={styles.importCopy}>
          After import, StudyVault creates local chunks, a summary, and a document-grounded Q&A context.
        </Text>
        <PrimaryButton
          icon="tray-arrow-up"
          label="Choose file"
          loading={working}
          onPress={handleImportAndAnalyze}
          style={styles.importButton}
        />
      </View>

      <ProgressPanel progress={importProgress} />

      {!settings?.hasApiKey ? (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="key-alert-outline" size={23} color={colors.orange} />
          <Text style={styles.noticeText}>Add a Kimi API key in Settings for PDF and Word extraction.</Text>
        </View>
      ) : null}

      <SectionHeader title="Pipeline" />
      <View style={styles.steps}>
        {['Copy into private storage', 'Extract text and split chunks', 'Analyze key PDF pages', 'Generate summary and citations'].map(
          (step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ),
        )}
      </View>

      <SectionHeader title="Latest imports" />
      {documents.slice(0, 4).map((document) => (
        <DocumentRow
          document={document}
          key={document.id}
          onAnalyze={() => handleAnalyze(document.id)}
          onMore={() => setActionDocumentId(document.id)}
          onPress={() => router.push(`/document/${document.id}`)}
        />
      ))}
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
  header: {
    paddingTop: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: 8,
  },
  importPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginVertical: 22,
    padding: 20,
  },
  importIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  importTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
    marginTop: 14,
  },
  importCopy: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  importButton: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  notice: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  noticeText: {
    color: colors.muted,
    flex: 1,
    fontSize: typography.small,
    lineHeight: 20,
  },
  steps: {
    gap: 12,
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepNumberText: {
    color: colors.primary,
    fontWeight: '900',
  },
  stepText: {
    color: colors.textSoft,
    fontSize: typography.body,
    fontWeight: '700',
  },
  busyText: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 12,
    textAlign: 'center',
  },
});
