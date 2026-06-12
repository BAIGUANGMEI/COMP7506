import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MarkdownText } from '@/components/MarkdownText';
import { Screen } from '@/components/Screen';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { AnalysisStatus, ConversationMessage, FileType } from '@/domain/types';

const STATUS_FILTERS: Array<{ label: string; value: AnalysisStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Analyzed', value: 'analyzed' },
  { label: 'Pending', value: 'queued' },
  { label: 'Failed', value: 'failed' },
];

const FILE_FILTERS: Array<{ label: string; value: FileType | 'all' }> = [
  { label: 'All files', value: 'all' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'docx' },
  { label: 'MD', value: 'md' },
  { label: 'TXT', value: 'txt' },
];

export default function AskScreen() {
  const {
    askQuestion,
    categories,
    documents,
    loadMessages,
    selectedDocumentId,
    setSelectedDocumentId,
    settings,
  } = useAppData();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [documentQuery, setDocumentQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | 'all'>('all');
  const [fileFilter, setFileFilter] = useState<FileType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(false);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? documents[0],
    [documents, selectedDocumentId],
  );

  const filteredDocuments = useMemo(() => {
    const normalized = documentQuery.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesQuery =
        !normalized ||
        [document.title, document.fileType, document.tags.join(' '), document.sourceName]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      const matchesStatus = statusFilter === 'all' || document.analysisStatus === statusFilter;
      const matchesFile =
        fileFilter === 'all' ||
        document.fileType === fileFilter ||
        (fileFilter === 'docx' && document.fileType === 'doc');
      const matchesCategory = categoryFilter === 'all' || document.categoryId === categoryFilter;

      return matchesQuery && matchesStatus && matchesFile && matchesCategory;
    });
  }, [categoryFilter, documentQuery, documents, fileFilter, statusFilter]);

  useEffect(() => {
    if (!selectedDocumentId && documents[0]) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId, setSelectedDocumentId]);

  useEffect(() => {
    if (!selectedDocument) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedDocument.id).then(setMessages);
  }, [loadMessages, selectedDocument]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || !selectedDocument) {
      return;
    }

    setQuestion('');
    setLoading(true);
    try {
      const nextMessages = await askQuestion(selectedDocument.id, trimmed);
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setSelectorOpen(false);
  };

  const clearDocumentFilters = () => {
    setDocumentQuery('');
    setStatusFilter('all');
    setFileFilter('all');
    setCategoryFilter('all');
  };

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.header}>
          <Text style={styles.title}>Document Q&A</Text>
          <Text style={styles.subtitle}>Ask grounded questions and keep citations attached to the answer.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectorOpen((current) => !current)}
          style={styles.contextHeader}
        >
          <View style={styles.contextIcon}>
            <MaterialCommunityIcons name="file-search-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.contextCopy}>
            <Text numberOfLines={1} style={styles.contextTitle}>
              {selectedDocument?.title ?? 'No document selected'}
            </Text>
            <Text style={styles.contextMeta}>
              {settings?.hasApiKey ? 'Kimi enabled' : 'Local retrieval mode'} - {selectedDocument?.analysisStatus ?? 'idle'}
            </Text>
          </View>
          <MaterialCommunityIcons name={selectorOpen ? 'chevron-up' : 'chevron-down'} size={24} color={colors.muted} />
        </Pressable>

        {selectorOpen ? (
          <View style={styles.selectorPanel}>
            <View style={styles.selectorSearch}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setDocumentQuery}
                placeholder="Filter documents"
                placeholderTextColor={colors.faint}
                style={styles.selectorSearchInput}
                value={documentQuery}
              />
              {documentQuery ? (
                <Pressable accessibilityRole="button" onPress={() => setDocumentQuery('')} style={styles.clearQueryButton}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <FilterRow activeValue={statusFilter} items={STATUS_FILTERS} onSelect={setStatusFilter} />
            <FilterRow activeValue={fileFilter} items={FILE_FILTERS} onSelect={setFileFilter} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategoryFilter('all')}
                style={[styles.filterChip, categoryFilter === 'all' && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, categoryFilter === 'all' && styles.filterChipTextActive]}>
                  All categories
                </Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  accessibilityRole="button"
                  key={category.id}
                  onPress={() => setCategoryFilter(category.id)}
                  style={[styles.filterChip, categoryFilter === category.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, categoryFilter === category.id && styles.filterChipTextActive]}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.selectorMetaRow}>
              <Text style={styles.selectorCount}>
                {filteredDocuments.length} document{filteredDocuments.length === 1 ? '' : 's'}
              </Text>
              <Pressable accessibilityRole="button" onPress={clearDocumentFilters}>
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            </View>

            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.selectorList}>
              {filteredDocuments.map((document) => (
                <Pressable
                  accessibilityRole="button"
                  key={document.id}
                  onPress={() => handleSelectDocument(document.id)}
                  style={[styles.documentOption, selectedDocument?.id === document.id && styles.documentOptionActive]}
                >
                  <View style={styles.documentOptionIcon}>
                    <Text style={styles.documentOptionType}>{document.fileType.toUpperCase()}</Text>
                  </View>
                  <View style={styles.documentOptionCopy}>
                    <Text numberOfLines={1} style={styles.documentOptionTitle}>
                      {document.title}
                    </Text>
                    <Text style={styles.documentOptionMeta}>
                      {document.analysisStatus} - {document.sizeLabel}
                    </Text>
                  </View>
                  {selectedDocument?.id === document.id ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
              {filteredDocuments.length === 0 ? (
                <View style={styles.selectorEmpty}>
                  <Text style={styles.selectorEmptyTitle}>No matching documents</Text>
                  <Text style={styles.selectorEmptyText}>Try clearing filters or searching another keyword.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={[styles.messages, messages.length === 0 && styles.messagesEmpty]}
          showsVerticalScrollIndicator={false}
          style={styles.messageScroller}
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="message-text-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyCopy}>Ask about the selected document whenever you are ready.</Text>
            </View>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {loading ? (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={styles.assistantAvatar}>
                <MaterialCommunityIcons name="assistant" size={17} color={colors.primary} />
              </View>
              <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Reading sources...</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composerShell}>
          <View style={styles.composer}>
            <TextInput
              multiline
              onChangeText={setQuestion}
              placeholder="Message StudyVault..."
              placeholderTextColor={colors.faint}
              style={styles.input}
              value={question}
            />
            <Pressable
              accessibilityRole="button"
              disabled={loading || !question.trim()}
              onPress={handleAsk}
              style={[styles.sendButton, (loading || !question.trim()) && styles.sendButtonDisabled]}
            >
              <MaterialCommunityIcons name="arrow-up" size={21} color={colors.surface} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function FilterRow<T extends string>({
  activeValue,
  items,
  onSelect,
}: {
  activeValue: T;
  items: Array<{ label: string; value: T }>;
  onSelect: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.value}
          onPress={() => onSelect(item.value)}
          style={[styles.filterChip, activeValue === item.value && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, activeValue === item.value && styles.filterChipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser ? (
        <View style={styles.assistantAvatar}>
          <MaterialCommunityIcons name="assistant" size={17} color={colors.primary} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isUser ? (
          <Text style={[styles.bubbleText, styles.userBubbleText]}>{message.content}</Text>
        ) : (
          <MarkdownText content={message.content} />
        )}
        {!isUser && message.citations.length > 0 ? (
          <View style={styles.citations}>
            {message.citations.slice(0, 3).map((citation) => (
              <Text key={`${citation.label}-${citation.excerpt}`} style={styles.citation}>
                {citation.label}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 18,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: 6,
  },
  contextHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  contextIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  contextCopy: {
    flex: 1,
  },
  contextTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  contextMeta: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 3,
  },
  selectorPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
    padding: 10,
  },
  selectorSearch: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  selectorSearchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    minHeight: 42,
  },
  clearQueryButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSoft,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  selectorMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorCount: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  clearFiltersText: {
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  selectorList: {
    maxHeight: 198,
  },
  documentOption: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingVertical: 8,
  },
  documentOptionActive: {
    backgroundColor: colors.surfaceTint,
  },
  documentOptionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  documentOptionType: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  documentOptionCopy: {
    flex: 1,
  },
  documentOptionTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  documentOptionMeta: {
    color: colors.muted,
    fontSize: typography.tiny,
    marginTop: 3,
  },
  selectorEmpty: {
    alignItems: 'center',
    padding: 18,
  },
  selectorEmptyTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  selectorEmptyText: {
    color: colors.muted,
    fontSize: typography.tiny,
    marginTop: 4,
    textAlign: 'center',
  },
  messages: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 14,
    paddingTop: 14,
  },
  messagesEmpty: {
    justifyContent: 'center',
  },
  messageScroller: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  bubble: {
    borderRadius: radii.md,
    flexShrink: 1,
    minWidth: 0,
    padding: 13,
  },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 9,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.sm,
    flexShrink: 1,
    maxWidth: '82%',
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.sm,
    borderColor: colors.border,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: '80%',
  },
  bubbleText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 21,
  },
  userBubbleText: {
    color: colors.surface,
  },
  citations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  citation: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.small,
  },
  composerShell: {
    backgroundColor: colors.background,
    paddingBottom: 10,
    paddingTop: 8,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderStrong,
  },
});
