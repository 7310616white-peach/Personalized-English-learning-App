export const errorReasons = [
  ['vocabulary', '词汇不熟'],
  ['connected-speech', '连读 / 弱读'],
  ['speed', '语速'],
  ['missed-information', '信息遗漏'],
  ['question-understanding', '审题 / 推断'],
  ['spelling', '拼写'],
  ['attention', '注意力'],
  ['other', '其他'],
] as const;
export function errorReasonLabel(id: string) {
  return errorReasons.find(([value]) => value === id)?.[1] ?? '其他';
}
