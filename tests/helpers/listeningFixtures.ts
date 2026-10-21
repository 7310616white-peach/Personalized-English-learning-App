import { listeningLibrarySchema, listeningSetSchema } from '../../src/domain/listening';

/** Original synthetic tone: tests file persistence and playback, not real lesson content. */
export function wavBytes(frequency = 440) {
  const count = 8000,
    bytes = new Uint8Array(44 + count * 2),
    v = new DataView(bytes.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i);
  };
  text(0, 'RIFF');
  v.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++)
    v.setInt16(44 + i * 2, Math.round(Math.sin((i * frequency * Math.PI * 2) / 8000) * 1000), true);
  return bytes;
}
export const library = listeningLibrarySchema.parse({
  format: 'english-pocket-listening-library',
  schemaVersion: 1,
  id: 'test-course',
  title: '虚构测试材料（音频仅为测试音）',
  target: 'campus',
  tracks: [
    {
      id: 'u1-news',
      unit: 'unit-1',
      section: 'news-report',
      title: 'Unit 1 News 测试',
      audioFile: 'test.wav',
      transcript: {
        status: 'draft',
        text: 'Synthetic transcript for testing. Never from a real lesson.',
      },
      segments: [],
    },
  ],
});
export const set = listeningSetSchema.parse({
  id: 'u1-set',
  libraryId: 'test-course',
  trackId: 'u1-news',
  questions: [
    {
      id: 'original-1',
      type: 'listening-choice',
      origin: 'course-original',
      prompt: 'Original question without an answer key',
      options: [
        { id: 'A', text: 'First' },
        { id: 'B', text: 'Second' },
      ],
      grading: { status: 'missing' },
    },
    {
      id: 'extra-1',
      type: 'listening-choice',
      origin: 'chatgpt-extra',
      prompt: 'Synthetic choice question',
      options: [
        { id: 'A', text: 'First' },
        { id: 'B', text: 'Second' },
      ],
      grading: { status: 'draft', answerId: 'B', explanation: 'Synthetic answer explanation.' },
    },
    {
      id: 'cloze-1',
      type: 'listening-cloze',
      origin: 'chatgpt-extra',
      prompt: 'Write {{b1}} here.',
      blankIds: ['b1'],
      grading: {
        status: 'verified',
        acceptedAnswers: { b1: ['online'] },
        explanation: 'Synthetic cloze explanation.',
      },
    },
  ],
});
export const daily = {
  schemaVersion: 2,
  id: 'hearing-day-1',
  title: '虚构听力测试',
  date: '2026-10-21',
  words: [],
  choices: [],
  listening: [set],
};
