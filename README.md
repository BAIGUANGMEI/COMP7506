# StudyVault

StudyVault is a local-first React Native + Expo app for importing study documents, generating AI summaries with a user-provided Kimi API key, and asking document-grounded questions.

## Features

- English cross-platform mobile UI built with Expo Router and TypeScript.
- Local document library with categories, tags, metadata editing, and document deletion.
- Import flow for PDF, Word, Markdown, and TXT files.
- Local TXT/Markdown text extraction.
- Kimi-compatible provider for PDF/Word text extraction, summarization, and document Q&A.
- Local SQLite storage for documents, chunks, summaries, categories, and conversations.
- SecureStore-backed Kimi API key storage with a clear-key action.
- Editable AI summaries with Markdown copy and native share/export support.
- Browser-verifiable Expo Web workflow for fast development checks.

## Run

```bash
npm install
npm run web
```

For a clean verification server on a specific port:

```bash
npm run web -- --port 8082 --clear
```

## Kimi Setup

Open Settings in the app and configure:

- API base URL: `https://api.moonshot.ai/v1`
- Chat model: `kimi-k2.6`
- Vision model: `kimi-k2.6`
- API key: your own Kimi API key

The API key is stored only on the device using SecureStore. The app does not include a backend server.

## Verification

```bash
npm run typecheck
```

The latest QA evidence is in `design-qa.md`. The current browser verification covered Library, Settings, Import, Ask, and Document Detail at a 390 x 844 mobile viewport.

## Native Notes

PDF and Word text extraction can run through Kimi Files API after a key is configured. Page-level PDF visual analysis is intentionally isolated behind `src/services/pdfPageRenderer.ts`; production builds should connect that boundary to an Expo prebuild native module using iOS PDFKit and Android PdfRenderer.
