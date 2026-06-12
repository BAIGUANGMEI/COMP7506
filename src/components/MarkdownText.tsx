import { Linking, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';

type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'listItem'; ordered: boolean; index?: number; text: string };

type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

interface MarkdownTextProps {
  content: string;
}

export function MarkdownText({ content }: MarkdownTextProps) {
  return (
    <View style={styles.container}>
      {parseMarkdownBlocks(content).map((block, index) => (
        <MarkdownBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </View>
  );
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  if (block.type === 'code') {
    return (
      <View style={styles.codeBlock}>
        <Text selectable style={styles.codeBlockText}>
          {softWrapText(block.text)}
        </Text>
      </View>
    );
  }

  if (block.type === 'listItem') {
    return (
      <View style={styles.listItem}>
        <Text style={styles.listMarker}>{block.ordered ? `${block.index}.` : '•'}</Text>
        <MarkdownInlineText style={styles.listText} text={block.text} />
      </View>
    );
  }

  if (block.type === 'heading') {
    return (
      <Text style={[styles.text, styles.heading, block.level === 1 && styles.headingLarge]}>
        {renderInlineTokens(block.text)}
      </Text>
    );
  }

  if (block.type === 'quote') {
    return (
      <View style={styles.quote}>
        <MarkdownInlineText text={block.text} />
      </View>
    );
  }

  return <MarkdownInlineText text={block.text} />;
}

function MarkdownInlineText({ style, text }: { style?: StyleProp<TextStyle>; text: string }) {
  return <Text style={[styles.text, style]}>{renderInlineTokens(text)}</Text>;
}

function renderInlineTokens(text: string) {
  return parseInlineTokens(text).map((token, index) => {
    const key = `${token.type}-${index}`;

    if (token.type === 'bold') {
      return (
        <Text key={key} style={styles.bold}>
          {softWrapText(token.text)}
        </Text>
      );
    }

    if (token.type === 'italic') {
      return (
        <Text key={key} style={styles.italic}>
          {softWrapText(token.text)}
        </Text>
      );
    }

    if (token.type === 'code') {
      return (
        <Text key={key} style={styles.inlineCode}>
          {softWrapText(token.text)}
        </Text>
      );
    }

    if (token.type === 'link') {
      return (
        <Text key={key} onPress={() => void Linking.openURL(token.url)} style={styles.link}>
          {softWrapText(token.text)}
        </Text>
      );
    }

    return softWrapText(token.text);
  });
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];
  let codeFence: string | null = null;
  let codeLines: string[] = [];
  let orderedIndex = 1;

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) {
      blocks.push({ type: 'paragraph', text });
    }
    paragraph.length = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(```|~~~)/);

    if (codeFence) {
      if (fenceMatch?.[1] === codeFence) {
        blocks.push({ type: 'code', text: codeLines.join('\n') });
        codeFence = null;
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (fenceMatch) {
      flushParagraph();
      codeFence = fenceMatch[1];
      orderedIndex = 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      orderedIndex = 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      orderedIndex = 1;
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      blocks.push({ type: 'listItem', ordered: false, text: unorderedMatch[1].trim() });
      orderedIndex = 1;
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      blocks.push({
        type: 'listItem',
        ordered: true,
        index: Number(orderedMatch[1]) || orderedIndex,
        text: orderedMatch[2].trim(),
      });
      orderedIndex += 1;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      blocks.push({ type: 'quote', text: quoteMatch[1].trim() });
      orderedIndex = 1;
      continue;
    }

    paragraph.push(trimmed);
  }

  if (codeFence) {
    blocks.push({ type: 'code', text: codeLines.join('\n') });
  }
  flushParagraph();

  return blocks;
}

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (linkMatch) {
      tokens.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
    } else if (raw.startsWith('**')) {
      tokens.push({ type: 'bold', text: raw.slice(2, -2) });
    } else if (raw.startsWith('*')) {
      tokens.push({ type: 'italic', text: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'code', text: raw.slice(1, -1) });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}

const SOFT_BREAK = '\u200B';

function softWrapText(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (part.length <= 24 || /\s/.test(part)) {
        return part;
      }

      return part
        .replace(/([/_.\-?=&:#%])/g, `$1${SOFT_BREAK}`)
        .replace(new RegExp(`(.{24})`, 'g'), `$1${SOFT_BREAK}`);
    })
    .join('');
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    gap: 8,
    maxWidth: '100%',
    width: '100%',
  },
  text: {
    color: colors.text,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: typography.small,
    lineHeight: 21,
    maxWidth: '100%',
  },
  heading: {
    fontSize: typography.body,
    fontWeight: '900',
    lineHeight: 24,
  },
  headingLarge: {
    fontSize: typography.h3,
    lineHeight: 26,
  },
  bold: {
    fontWeight: '900',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    backgroundColor: colors.graySoft,
    borderRadius: radii.sm,
    color: colors.textSoft,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'monospace',
    fontSize: typography.tiny,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: colors.graySoft,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    maxWidth: '100%',
    overflow: 'hidden',
    padding: 10,
    width: '100%',
  },
  codeBlockText: {
    color: colors.textSoft,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'monospace',
    fontSize: typography.tiny,
    lineHeight: 18,
    maxWidth: '100%',
  },
  listItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
    width: '100%',
  },
  listMarker: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '900',
    lineHeight: 21,
    minWidth: 18,
  },
  listText: {
    flex: 1,
    minWidth: 0,
  },
  quote: {
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: 3,
    maxWidth: '100%',
    paddingLeft: 10,
    width: '100%',
  },
  link: {
    color: colors.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
