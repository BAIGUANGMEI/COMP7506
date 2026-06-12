import type { Citation, DocumentChunk, DocumentSummary, FileType, ModelSettings } from '@/domain/types';
import { mimeTypeForFile } from '@/utils/files';

type ChatMessage =
  | {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
      >;
    };

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class KimiClient {
  private readonly apiBase: string;

  constructor(
    private readonly settings: ModelSettings,
    private readonly apiKey: string,
  ) {
    this.apiBase = settings.apiBase.replace(/\/$/, '');
  }

  async testConnection(): Promise<void> {
    const response = await fetch(`${this.apiBase}/models`, {
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`Kimi connection failed (${response.status})`);
    }
  }

  async extractFileText(file: {
    uri: string;
    name: string;
    type: FileType;
  }): Promise<string> {
    const form = new FormData();
    form.append('purpose', 'file-extract');
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: mimeTypeForFile(file.type),
    } as unknown as Blob);

    const upload = await fetch(`${this.apiBase}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!upload.ok) {
      const message = await upload.text();
      throw new Error(`Kimi file upload failed (${upload.status}): ${message}`);
    }

    const uploaded = (await upload.json()) as { id?: string };
    if (!uploaded.id) {
      throw new Error('Kimi file upload did not return a file id.');
    }

    const content = await fetch(`${this.apiBase}/files/${uploaded.id}/content`, {
      headers: this.headers(),
    });

    if (!content.ok) {
      const message = await content.text();
      throw new Error(`Kimi file extraction failed (${content.status}): ${message}`);
    }

    return content.text();
  }

  async summarizeDocument(input: {
    title: string;
    chunks: DocumentChunk[];
    visualNotes: string[];
  }): Promise<Omit<DocumentSummary, 'documentId' | 'updatedAt'>> {
    const sourceText = input.chunks
      .slice(0, 8)
      .map((chunk, index) => `Source ${index + 1}${chunk.heading ? ` (${chunk.heading})` : ''}:\n${chunk.text}`)
      .join('\n\n');

    const content = await this.chat([
      {
        role: 'system',
        content:
          'You summarize study materials for students. Return compact JSON only with keys overview, keyPoints, outline, terms, readingGuide. keyPoints, outline, and terms must be string arrays.',
      },
      {
        role: 'user',
        content: `Document title: ${input.title}\n\nVisual notes:\n${input.visualNotes.join('\n') || 'None'}\n\nExtracted text:\n${sourceText}`,
      },
    ]);

    return parseSummaryJson(content);
  }

  async answerQuestion(input: {
    question: string;
    title: string;
    chunks: DocumentChunk[];
    citations: Citation[];
  }): Promise<string> {
    const context = input.chunks
      .map((chunk, index) => `[Source ${index + 1}${chunk.pageNumber ? `, page ${chunk.pageNumber}` : ''}]\n${chunk.text}`)
      .join('\n\n');

    return this.chat([
      {
        role: 'system',
        content:
          'Answer only from the provided document context. If the context is insufficient, say what is missing. Cite sources inline like [Source 1].',
      },
      {
        role: 'user',
        content: `Document: ${input.title}\n\nContext:\n${context}\n\nQuestion: ${input.question}`,
      },
    ]);
  }

  async analyzeVisualPages(input: {
    title: string;
    pageImages: Array<{ pageNumber: number; dataUri: string }>;
  }): Promise<string[]> {
    const notes: string[] = [];

    for (const page of input.pageImages) {
      const content = await this.chat([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this PDF page from "${input.title}". Focus on diagrams, formulas, tables, and layout cues. Return 3 concise bullet points.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: page.dataUri,
                detail: 'high',
              },
            },
          ],
        },
      ]);

      notes.push(`Page ${page.pageNumber}: ${content}`);
    }

    return notes;
  }

  private async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.settings.chatModel,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Kimi chat failed (${response.status}): ${message}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Kimi chat returned an empty response.');
    }

    return content;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}

function parseSummaryJson(content: string): Omit<DocumentSummary, 'documentId' | 'updatedAt'> {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const raw = jsonMatch?.[0] ?? content;

  try {
    const parsed = JSON.parse(raw) as Partial<Omit<DocumentSummary, 'documentId' | 'updatedAt'>>;

    return {
      overview: parsed.overview ?? 'Kimi generated a summary, but the overview was not returned.',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      outline: Array.isArray(parsed.outline) ? parsed.outline : [],
      terms: Array.isArray(parsed.terms) ? parsed.terms : [],
      readingGuide: parsed.readingGuide ?? 'Review the outline, then ask targeted questions from the Q&A tab.',
    };
  } catch {
    return {
      overview: content,
      keyPoints: [],
      outline: [],
      terms: [],
      readingGuide: 'Review the generated text, then ask targeted questions from the Q&A tab.',
    };
  }
}
