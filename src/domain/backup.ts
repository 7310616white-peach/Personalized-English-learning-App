import {
  writtenAttemptSchema,
  writtenDraftSchema,
  writtenProgressSchema,
  writtenKey,
  gradeWritten,
} from './written';
import { z } from 'zod';
import { packSchema, progressSchema, attemptSchema, draftSchema, exercises } from './models';
import {
  libraryRecordSchema,
  mediaMetaSchema,
  questionRecordSchema,
  listeningAttemptSchema,
  listeningProgressSchema,
  listeningDraftSchema,
  listeningNoteSchema,
  listeningKey,
  setDraftKey,
} from './listening';
import { gradeListening } from './listeningGrading';

const common = {
  format: z.literal('english-pocket-backup'),
  exportedAt: z.string().datetime(),
  packs: z.array(packSchema).max(10000),
  progress: z.array(progressSchema),
  attempts: z.array(attemptSchema),
  drafts: z.array(draftSchema),
};
const listeningFields = {
  listeningLibraries: z.array(libraryRecordSchema),
  media: z.array(mediaMetaSchema),
  listeningQuestions: z.array(questionRecordSchema),
  listeningAttempts: z.array(listeningAttemptSchema),
  listeningProgress: z.array(listeningProgressSchema),
  listeningDrafts: z.array(listeningDraftSchema),
  listeningNotes: z.array(listeningNoteSchema),
};
const writtenFields = {
  writtenAttempts: z.array(writtenAttemptSchema),
  writtenDrafts: z.array(writtenDraftSchema),
  writtenProgress: z.array(writtenProgressSchema),
};
export const backupSchema = z.discriminatedUnion('version', [
  z.object({ ...common, version: z.literal(1) }).strict(),
  z
    .object({
      ...common,
      version: z.literal(2),
      mediaIncluded: z.literal(false),
      ...listeningFields,
    })
    .strict(),
  z
    .object({
      ...common,
      version: z.literal(3),
      mediaIncluded: z.literal(false),
      ...listeningFields,
      ...writtenFields,
    })
    .strict(),
]);
function unique(keys: string[]) {
  if (new Set(keys).size !== keys.length) throw new Error('备份含有重复记录');
}
export function validateBackup(input: unknown) {
  const data = backupSchema.parse(input);
  if (data.version !== 3 && data.packs.some((p) => p.schemaVersion === 3))
    throw new Error('旧版备份缺少扩展题型记录');
  if (data.version === 3) {
    unique(data.writtenAttempts.map((r) => r.id));
    unique(data.writtenDrafts.map((r) => r.key));
    unique(data.writtenProgress.map((r) => r.key));
    for (const row of [...data.writtenAttempts, ...data.writtenDrafts, ...data.writtenProgress]) {
      const pack = data.packs.find((p) => p.id === row.packId);
      const task = pack?.schemaVersion === 3 && pack.written.find((t) => t.id === row.taskId);
      if (!task || row.key !== writtenKey(row.packId, row.taskId))
        throw new Error('扩展题型记录引用无效');
      if ('answers' in row) {
        if ('correct' in row || task.type === 'word-bank' || task.type === 'matching') {
          const grade = gradeWritten(task, row.answers);
          if ('correct' in row) {
            const attempt = writtenAttemptSchema.parse(row);
            if (
              attempt.correct !== grade.correct ||
              attempt.earned !== grade.earned ||
              attempt.total !== grade.total
            )
              throw new Error('扩展题型评分无效');
          }
        } else if (Object.keys(row.answers).some((key) => key !== 'response'))
          throw new Error('扩展题型草稿无效');
      } else if (task.type === 'translation' || task.type === 'writing')
        throw new Error('待批改任务不能冒充已评分复习进度');
    }
  }
  const items = new Map(data.packs.flatMap(exercises).map((e) => [e.key, e]));
  unique(data.packs.map((r) => r.id));
  unique(data.progress.map((r) => r.key));
  unique(data.attempts.map((r) => r.id));
  unique(data.drafts.map((r) => r.key));
  for (const row of [...data.progress, ...data.attempts]) {
    const e = items.get(row.key);
    if (!e || e.packId !== row.packId || e.item.id !== row.itemId || e.kind !== row.kind)
      throw new Error('备份含有无法关联的答题记录');
  }
  if (data.drafts.some((d) => !items.has(d.key))) throw new Error('备份含有无法关联的草稿');
  if (data.version === 1) {
    if (data.packs.some((p) => p.schemaVersion !== 1)) throw new Error('v1 备份缺少听力资源数据');
    return data;
  }
  for (const table of [data.listeningLibraries, data.media, data.listeningAttempts])
    unique(table.map((r) => r.id));
  for (const table of [
    data.listeningQuestions,
    data.listeningProgress,
    data.listeningDrafts,
    data.listeningNotes,
  ])
    unique(table.map((r) => r.key));
  const libraries = new Map(data.listeningLibraries.map((l) => [l.id, l]));
  const media = new Set(data.media.map((m) => m.id));
  for (const l of libraries.values()) {
    if (
      l.id !== l.manifest.id ||
      Object.entries(l.bindings).some(
        ([t, m]) => !l.manifest.tracks.some((x) => x.id === t) || !media.has(m),
      )
    )
      throw new Error('备份音频绑定无效');
  }
  const questions = new Map(data.listeningQuestions.map((q) => [q.key, q]));
  for (const q of questions.values())
    if (
      q.key !== listeningKey(q.libraryId, q.question.id) ||
      !libraries.get(q.libraryId)?.manifest.tracks.some((t) => t.id === q.trackId)
    )
      throw new Error('备份听力题引用无效');
  const draftKeys = new Set<string>();
  for (const p of data.packs) {
    if (p.schemaVersion === 1) continue;
    for (const s of p.listening) {
      draftKeys.add(setDraftKey(p.id, s));
      for (const q of s.questions) {
        const saved = questions.get(listeningKey(s.libraryId, q.id));
        if (
          !saved ||
          saved.trackId !== s.trackId ||
          JSON.stringify(saved.question) !== JSON.stringify(q)
        )
          throw new Error('备份题包的听力引用无效');
      }
    }
  }
  for (const a of data.listeningAttempts) {
    const p = data.packs.find((p) => p.id === a.packId);
    const set = p && p.schemaVersion !== 1 ? p.listening.find((s) => s.id === a.setId) : undefined;
    if (
      !set ||
      a.libraryId !== set.libraryId ||
      a.trackId !== set.trackId ||
      JSON.stringify(a.questions) !== JSON.stringify(set.questions) ||
      JSON.stringify(a.grades) !==
        JSON.stringify(a.questions.map((q) => gradeListening(q, a.answers[q.id])))
    )
      throw new Error('备份听力作答或评分无效');
  }
  for (const p of data.listeningProgress) {
    const q = questions.get(p.key);
    if (!q || p.key !== listeningKey(p.libraryId, p.questionId) || p.trackId !== q.trackId)
      throw new Error('备份听力进度引用无效');
  }
  if (data.listeningDrafts.some((d) => !draftKeys.has(d.key)))
    throw new Error('备份听力草稿引用无效');
  for (const n of data.listeningNotes)
    if (
      n.key !== JSON.stringify([n.attemptId, n.questionId]) ||
      !data.listeningAttempts.some(
        (a) =>
          a.id === n.attemptId &&
          a.grades.some((g) => g.questionId === n.questionId && g.correct === false),
      )
    )
      throw new Error('备份错因备注引用无效');
  return data;
}
export type Backup = ReturnType<typeof validateBackup>;
