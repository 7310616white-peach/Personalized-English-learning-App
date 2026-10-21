export type Page = 'home' | 'words' | 'mistakes' | 'lookup' | 'transfer' | 'listening';
export const pages: { id: Page; icon: string; title: string }[] = [
  { id: 'home', icon: '◷', title: '学习台' },
  { id: 'words', icon: 'Aa', title: '词汇手册' },
  { id: 'lookup', icon: '⌕', title: '阅读查词' },
  { id: 'listening', icon: '♫', title: '听力训练' },
  { id: 'mistakes', icon: '↺', title: '错题本' },
  { id: 'transfer', icon: '⇄', title: '题包与数据' },
];
