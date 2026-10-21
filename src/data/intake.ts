import { packSchema } from '../domain/models';
import { listeningLibrarySchema } from '../domain/listening';
import { importPack } from './learning';
import { importListeningLibrary } from './listening/materials';
import { db, type LearningDB } from './db';

export function previewIncoming(text: string) {
  if (new TextEncoder().encode(text).byteLength > 10 * 1024 * 1024)
    throw new Error('题包 JSON 不得超过 10 MB');
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('不是有效 JSON。请下载题包文件，或仅粘贴完整 JSON，不包含代码围栏。');
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'format' in data &&
    data.format === 'english-pocket-listening-library'
  )
    return { kind: 'library' as const, value: listeningLibrarySchema.parse(data) };
  return { kind: 'pack' as const, value: packSchema.parse(data) };
}
export type IncomingPreview = ReturnType<typeof previewIncoming>;
export async function commitIncoming(preview: IncomingPreview, store: LearningDB = db) {
  if (preview.kind === 'library') {
    const result = await importListeningLibrary(preview.value, {}, store);
    return `材料清单已导入：${result.bound} 段已绑定，${result.missing} 段待补绑。请到听力训练底部选择对应 WAV。`;
  }
  const pack = await importPack(preview.value, store);
  return `已导入「${pack.title}」：${pack.words.length} 个单词，${pack.choices.length} 道选择，${pack.schemaVersion === 2 ? pack.listening.length : 0} 组听力。`;
}
