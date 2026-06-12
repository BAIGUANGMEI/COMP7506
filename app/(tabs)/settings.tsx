import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, radii, typography } from '@/constants/theme';
import { useAppData } from '@/data/AppProvider';
import type { Category, ModelSettings } from '@/domain/types';
import { KimiClient } from '@/services/kimiClient';
import { getKimiApiKey } from '@/services/modelSettings';
import { confirmDestructiveAction } from '@/utils/confirm';

export default function SettingsScreen() {
  const { categories, clearApiKey, createCategory, deleteCategory, saveSettings, settings, updateCategory } = useAppData();
  const [draft, setDraft] = useState<ModelSettings | null>(settings);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('Your API key is stored on this device only.');
  const [newCategory, setNewCategory] = useState('');
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, Category>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setCategoryDrafts(Object.fromEntries(categories.map((category) => [category.id, category])));
  }, [categories]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setSaving(true);
    try {
      await saveSettings(draft, apiKey);
      setApiKey('');
      setStatus('Kimi settings saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!draft) {
      return;
    }

    setTesting(true);
    try {
      const key = apiKey || (await getKimiApiKey());
      if (!key) {
        setStatus('Add an API key before testing the connection.');
        return;
      }

      await new KimiClient({ ...draft, hasApiKey: true }, key).testConnection();
      setStatus('Connection test passed.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async () => {
    const confirmed = await confirmDestructiveAction({
      title: 'Clear API key?',
      message: 'Kimi requests will stop until you add a new key.',
      confirmLabel: 'Clear',
    });

    if (confirmed) {
      await clearApiKey();
      setApiKey('');
      setStatus('API key cleared from this device.');
    }
  };

  const handleCreateCategory = async () => {
    await createCategory(newCategory);
    setNewCategory('');
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = await confirmDestructiveAction({
      title: 'Delete category?',
      message: `Documents in "${category.name}" will move to Unsorted.`,
      confirmLabel: 'Delete',
    });

    if (confirmed) {
      await deleteCategory(category.id);
    }
  };

  if (!draft) {
    return (
      <Screen scroll={false} contentStyle={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure Kimi API access, model names, and local-first analysis behavior.</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusIcon, draft.hasApiKey ? styles.statusIconReady : styles.statusIconWarning]}>
          <MaterialCommunityIcons
            name={draft.hasApiKey ? 'shield-check-outline' : 'key-alert-outline'}
            size={25}
            color={draft.hasApiKey ? colors.green : colors.orange}
          />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{draft.hasApiKey ? 'API key available' : 'API key required'}</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <SettingField
        label="API base URL"
        onChangeText={(apiBase) => setDraft((current) => (current ? { ...current, apiBase } : current))}
        value={draft.apiBase}
      />
      <SettingField
        label="Chat model"
        onChangeText={(chatModel) => setDraft((current) => (current ? { ...current, chatModel } : current))}
        value={draft.chatModel}
      />
      <SettingField
        label="Vision model"
        onChangeText={(visionModel) => setDraft((current) => (current ? { ...current, visionModel } : current))}
        value={draft.visionModel}
      />
      <SettingField label="API key" onChangeText={setApiKey} secureTextEntry value={apiKey} placeholder="Paste a new key to update" />

      <View style={styles.actions}>
        <PrimaryButton icon="content-save-outline" label="Save settings" loading={saving} onPress={handleSave} />
        <PrimaryButton icon="connection" label="Test connection" loading={testing} variant="outline" onPress={handleTest} />
        <PrimaryButton icon="key-remove" label="Clear API key" variant="outline" onPress={handleClearKey} />
      </View>

      <SectionHeader title="Categories" />
      <View style={styles.categoryPanel}>
        <View style={styles.newCategoryRow}>
          <TextInput
            onChangeText={setNewCategory}
            placeholder="New category name"
            placeholderTextColor={colors.faint}
            style={[styles.input, styles.categoryInput]}
            value={newCategory}
          />
          <Pressable accessibilityRole="button" onPress={handleCreateCategory} style={styles.addCategoryButton}>
            <MaterialCommunityIcons name="plus" size={22} color={colors.surface} />
          </Pressable>
        </View>

        {categories.map((category) => {
          const draftCategory = categoryDrafts[category.id] ?? category;

          return (
            <View key={category.id} style={styles.categoryItem}>
              <View style={[styles.categoryIcon, { backgroundColor: `${draftCategory.color}18` }]}>
                <MaterialCommunityIcons name={draftCategory.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} color={draftCategory.color} />
              </View>
              <View style={styles.categoryEdit}>
                <TextInput
                  onChangeText={(name) =>
                    setCategoryDrafts((current) => ({
                      ...current,
                      [category.id]: {
                        ...draftCategory,
                        name,
                      },
                    }))
                  }
                  style={styles.categoryNameInput}
                  value={draftCategory.name}
                />
                <Text style={styles.categoryMeta}>{category.documentCount} document{category.documentCount === 1 ? '' : 's'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => updateCategory(category.id, draftCategory)}
                style={styles.categoryAction}
              >
                <MaterialCommunityIcons name="content-save-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => handleDeleteCategory(category)} style={styles.categoryAction}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={colors.red} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.policy}>
        <Text style={styles.policyTitle}>Local-first defaults</Text>
        <Text style={styles.policyText}>
          Documents, chunks, summaries, notes, and conversations are stored in local SQLite. StudyVault does not use an app
          backend in this MVP.
        </Text>
      </View>
    </Screen>
  );
}

interface SettingFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onChangeText: (value: string) => void;
}

function SettingField({ label, value, placeholder, secureTextEntry, onChangeText }: SettingFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 18,
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
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    padding: 14,
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statusIconReady: {
    backgroundColor: colors.greenSoft,
  },
  statusIconWarning: {
    backgroundColor: colors.orangeSoft,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  statusText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: 3,
  },
  field: {
    marginTop: 18,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontSize: typography.small,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  actions: {
    gap: 12,
    marginTop: 22,
  },
  categoryPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  newCategoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  categoryInput: {
    flex: 1,
  },
  addCategoryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  categoryItem: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  categoryEdit: {
    flex: 1,
  },
  categoryNameInput: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    minHeight: 34,
  },
  categoryMeta: {
    color: colors.muted,
    fontSize: typography.tiny,
  },
  categoryAction: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  policy: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 28,
    paddingTop: 18,
  },
  policyTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  policyText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 21,
    marginTop: 8,
  },
});
