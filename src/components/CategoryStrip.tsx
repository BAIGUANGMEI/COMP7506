import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import type { Category } from '@/domain/types';

const SCROLLBAR_STYLE_ID = 'studyvault-category-scrollbar-style';

interface CategoryStripProps {
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelect?: (categoryId: string) => void;
}

export function CategoryStrip({ categories, selectedCategoryId, onSelect }: CategoryStripProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById(SCROLLBAR_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = `
      [data-testid="category-strip-scroll"],
      [data-testid="category-strip-scroll"] * {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      [data-testid="category-strip-scroll"]::-webkit-scrollbar,
      [data-testid="category-strip-scroll"] *::-webkit-scrollbar {
        display: none;
        height: 0;
        width: 0;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const scrollBy = (delta: number) => {
    const nextX = Math.max(0, scrollX + delta);
    scrollViewRef.current?.scrollTo({ x: nextX, animated: true });
    setScrollX(nextX);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel="Scroll categories left"
        accessibilityRole="button"
        onPress={() => scrollBy(-172)}
        style={styles.arrowButton}
      >
        <MaterialCommunityIcons name="chevron-left" size={23} color={colors.textSoft} />
      </Pressable>
      <ScrollView
        horizontal
        onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
        ref={scrollViewRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        testID="category-strip-scroll"
        contentContainerStyle={styles.content}
      >
        {categories.map((category) => (
          <Pressable
            accessibilityRole="button"
            key={category.id}
            onPress={() => onSelect?.(category.id)}
            style={[styles.item, selectedCategoryId === category.id && styles.itemActive]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${category.color}14` }]}>
              <MaterialCommunityIcons
                name={category.icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
                size={28}
                color={category.color}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.count}>{category.documentCount}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        accessibilityLabel="Scroll categories right"
        accessibilityRole="button"
        onPress={() => scrollBy(172)}
        style={styles.arrowButton}
      >
        <MaterialCommunityIcons name="chevron-right" size={23} color={colors.textSoft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scroller: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingRight: 20,
  },
  item: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 126,
    padding: 4,
  },
  itemActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  copy: {
    minWidth: 60,
  },
  name: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  count: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 3,
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
});
