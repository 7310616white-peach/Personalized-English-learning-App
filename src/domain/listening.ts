import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().trim().min(1).max(30000);
const missing = z.object({ status: z.literal('missing') }).strict();
const status = z.enum(['verified', 'draft']);
const explanation = z.string().max(30000);
export const transcriptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('missing'), text: z.null() }).strict(),
  z.object({ status: z.literal('draft'), text }).strict(),
  z.object({ status: z.literal('verified'), text }).strict(),
]);
const common = { id, origin: z.enum(['course-original', 'chatgpt-extra']), prompt: text };
const choice = z
  .object({
    ...common,
    type: z.literal('listening-choice'),
    options: z.array(z.object({ id, text }).strict()).min(2).max(8),
    grading: z.union([missing, z.object({ status, answerId: id, explanation }).strict()]),
  })
  .strict();
const cloze = z
  .object({
    ...common,
    type: z.literal('listening-cloze'),
    blankIds: z.array(id).min(1).max(50),
    grading: z.union([
      missing,
      z
        .object({
          status,
          acceptedAnswers: z.record(id, z.array(text).min(1).max(20)),
          explanation,
        })
        .strict(),
    ]),
  })
  .strict();
export const listeningQuestionSchema = z
  .discriminatedUnion('type', [choice, cloze])
  .superRefine((q, ctx) => {
    const grading = q.grading;
    if (q.type === 'listening-choice') {
      if (
        new Set(q.options.map((o) => o.id)).size !== q.options.length ||
        (grading.status !== 'missing' &&
          'answerId' in grading &&
          !q.options.some((o) => o.id === grading.answerId))
      )
        ctx.addIssue({ code: 'custom', message: '听力选项重复或答案不存在' });
    } else {
      const placeholders = [...q.prompt.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g)].map((m) => m[1]);
      if (
        new Set(q.blankIds).size !== q.blankIds.length ||
        placeholders.length !== q.blankIds.length ||
        !q.blankIds.every((b) => placeholders.filter((p) => p === b).length === 1) ||
        (grading.status !== 'missing' &&
          'acceptedAnswers' in grading &&
          (Object.keys(grading.acceptedAnswers).length !== q.blankIds.length ||
            !q.blankIds.every((b) => grading.acceptedAnswers[b])))
      )
        ctx.addIssue({ code: 'custom', message: '听写空位、占位符和参考答案必须一一对应' });
    }
  });
export const listeningSetSchema = z
  .object({
    id,
    libraryId: id,
    trackId: id,
    questions: z.array(listeningQuestionSchema).min(1).max(100),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new Set(s.questions.map((q) => q.id)).size !== s.questions.length)
      ctx.addIssue({ code: 'custom', message: '一组听力题 ID 不可重复' });
  });
export const trackSchema = z
  .object({
    id,
    unit: id,
    section: z.enum(['news-report', 'conversation', 'passage-1', 'passage-2']),
    title: text,
    audioFile: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[^/\\]+\.wav$/i, '请只填写 WAV 文件名'),
    transcript: transcriptSchema,
    segments: z
      .array(
        z
          .object({ id, startSec: z.number().nonnegative(), endSec: z.number().positive(), text })
          .strict()
          .refine((s) => s.endSec > s.startSec, '片段结束时间必须晚于开始'),
      )
      .max(500),
  })
  .strict();
export const listeningLibrarySchema = z
  .object({
    format: z.literal('english-pocket-listening-library'),
    schemaVersion: z.literal(1),
    id,
    title: text,
    target: z.enum(['campus', 'CET-4', 'CET-6']).default('campus'),
    tracks: z.array(trackSchema).min(1).max(200),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (new Set(l.tracks.map((t) => t.id)).size !== l.tracks.length)
      ctx.addIssue({ code: 'custom', message: '音轨 ID 重复' });
  });
export type ListeningQuestion = z.infer<typeof listeningQuestionSchema>;
export type ListeningSet = z.infer<typeof listeningSetSchema>;
export type ListeningLibrary = z.infer<typeof listeningLibrarySchema>;
export type ListeningTrack = ListeningLibrary['tracks'][number];
export const listeningKey = (libraryId: string, questionId: string) =>
  JSON.stringify(['listening', libraryId, questionId]);
export const setDraftKey = (packId: string, set: ListeningSet) =>
  JSON.stringify([packId, set.id, set.questions.map((q) => q.id)]);
export type ListeningAnswer = string | Record<string, string>;
export type ListeningAnswers = Record<string, ListeningAnswer>;
export const answerMapSchema = z.record(
  z.string(),
  z.union([z.string().max(10000), z.record(z.string(), z.string().max(10000))]),
);
export const playbackSchema = z
  .object({
    playCount: z.number().int().nonnegative(),
    lastPlaybackRate: z.number().min(0.5).max(2),
  })
  .strict();
export const gradeSchema = z
  .object({
    questionId: id,
    status: z.enum(['verified', 'provisional', 'ungraded']),
    correct: z.boolean().nullable(),
    correctUnits: z.number().int().nonnegative(),
    gradedUnits: z.number().int().nonnegative(),
    ungradedUnits: z.number().int().nonnegative(),
  })
  .strict();
export const listeningAttemptSchema = z
  .object({
    id: z.string(),
    packId: id,
    setId: id,
    libraryId: id,
    trackId: id,
    createdAt: z.string().datetime(),
    questions: z.array(listeningQuestionSchema).min(1),
    answers: answerMapSchema,
    grades: z.array(gradeSchema),
    transcriptSnapshot: transcriptSchema,
    playback: playbackSchema,
  })
  .strict();
export const listeningProgressSchema = z
  .object({
    key: z.string(),
    libraryId: id,
    trackId: id,
    questionId: id,
    stage: z.number().int().min(0).max(12),
    due: z.string().datetime(),
    reviews: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    lastReviewedAt: z.string().datetime(),
    gradeStatus: z.enum(['verified', 'provisional']),
  })
  .strict();
export const listeningNoteSchema = z
  .object({
    key: z.string(),
    attemptId: z.string(),
    questionId: id,
    reasons: z
      .array(
        z.enum([
          'vocabulary',
          'connected-speech',
          'speed',
          'missed-information',
          'question-understanding',
          'spelling',
          'attention',
          'other',
        ]),
      )
      .max(8),
    note: z.string().max(3000),
  })
  .strict();
export const listeningDraftSchema = z
  .object({ key: z.string(), answers: answerMapSchema, playback: playbackSchema })
  .strict();
export const questionRecordSchema = z
  .object({ key: z.string(), libraryId: id, trackId: id, question: listeningQuestionSchema })
  .strict();
export const libraryRecordSchema = z
  .object({
    id,
    manifest: listeningLibrarySchema,
    bindings: z.record(id, z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict();
export const mediaMetaSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{64}$/),
    fileName: z.string().max(255),
    byteLength: z.number().int().positive(),
    durationSec: z.number().positive(),
    sampleRate: z.number().positive(),
    channels: z.number().int().min(1).max(2),
    bits: z.number().int().positive(),
  })
  .strict();
export type ListeningAttempt = z.infer<typeof listeningAttemptSchema>;
export type ListeningProgress = z.infer<typeof listeningProgressSchema>;
export type ListeningNote = z.infer<typeof listeningNoteSchema>;
export type ListeningDraft = z.infer<typeof listeningDraftSchema>;
export type QuestionRecord = z.infer<typeof questionRecordSchema>;
export type LibraryRecord = z.infer<typeof libraryRecordSchema>;
export type MediaMeta = z.infer<typeof mediaMetaSchema>;
export type MediaRecord = MediaMeta & { storage: 'indexeddb' | 'native' | 'missing'; blob?: Blob };
