import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
