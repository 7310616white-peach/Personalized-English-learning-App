import type { Exercise } from './models';
export function normalizeAnswer(answer: string) {
  return answer
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ');
}
export function grade(exercise: Exercise, answer: string) {
  return exercise.kind === 'choice'
    ? answer === exercise.item.answerId
    : [exercise.item.term, ...exercise.item.acceptedAnswers].some(
        (value) => normalizeAnswer(value) === normalizeAnswer(answer),
      );
}
