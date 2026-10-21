import { normalizeAnswer } from './grading';
import type { ListeningAnswer, ListeningQuestion } from './listening';

export function gradeListening(q: ListeningQuestion, answer: ListeningAnswer | undefined) {
  const units = q.type === 'listening-choice' ? 1 : q.blankIds.length;
  if (q.grading.status === 'missing')
    return {
      questionId: q.id,
      status: 'ungraded' as const,
      correct: null,
      correctUnits: 0,
      gradedUnits: 0,
      ungradedUnits: units,
    };
  let correctUnits = 0;
  if (q.type === 'listening-choice')
    correctUnits = typeof answer === 'string' && answer === q.grading.answerId ? 1 : 0;
  else {
    const accepted = q.grading.acceptedAnswers;
    correctUnits = q.blankIds.filter((id) =>
      accepted[id].some(
        (a) =>
          normalizeAnswer(a) ===
          normalizeAnswer(typeof answer === 'object' ? (answer[id] ?? '') : ''),
      ),
    ).length;
  }
  return {
    questionId: q.id,
    status: q.grading.status === 'verified' ? ('verified' as const) : ('provisional' as const),
    correct: correctUnits === units,
    correctUnits,
    gradedUnits: units,
    ungradedUnits: 0,
  };
}
export function scoreListening(
  grades: { correctUnits: number; gradedUnits: number; ungradedUnits: number }[],
) {
  const correctUnits = grades.reduce((n, g) => n + g.correctUnits, 0),
    gradedUnits = grades.reduce((n, g) => n + g.gradedUnits, 0);
  return {
    correctUnits,
    gradedUnits,
    ungradedUnits: grades.reduce((n, g) => n + g.ungradedUnits, 0),
    accuracy: gradedUnits ? correctUnits / gradedUnits : null,
  };
}
