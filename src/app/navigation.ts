export type Page = 'home' | 'words' | 'mistakes' | 'transfer' | 'listening' | 'essays';
export const pages: { id: Page; icon: string; title: string }[] = [
  { id: 'home', icon: '◷', title: '学习台' },
  { id: 'words', icon: 'Aa', title: '词汇手册' },
  { id: 'listening', icon: '♫', title: '听力训练' },
  { id: 'mistakes', icon: '↺', title: '错题本' },
  { id: 'transfer', icon: '⇄', title: '我的' },
];
// Mobile puts the study desk in the center without changing desktop navigation.
export const mobilePages = (['words', 'listening', 'home', 'mistakes', 'transfer'] as const).map(
  (id) => pages.find((page) => page.id === id)!,
);

export const pageTitle = (page: Page) =>
  page === 'essays' ? '范文栏' : pages.find((p) => p.id === page)?.title;
