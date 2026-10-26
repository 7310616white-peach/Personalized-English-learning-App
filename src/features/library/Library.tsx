import { exercises, type Attempt, type Pack, type Progress } from '../../domain/models';
import { vocabularyGroups } from '../../domain/vocabularyGroups';
import { LibraryItem } from './LibraryItem';

export function Library({
  packs,
  progress,
  attempts = [],
  mistakes = false,
}: {
  packs: Pack[];
  progress: Progress[];
  attempts?: Attempt[];
  mistakes?: boolean;
}) {
  const index = new Map(progress.map((p) => [p.key, p]));
  const items = packs
    .flatMap(exercises)
    .filter((e) => (mistakes ? (index.get(e.key)?.errors ?? 0) > 0 : e.kind === 'spelling'));
  const groups = mistakes ? [] : vocabularyGroups(items, attempts, progress);
  const list = (rows: typeof items) => (
    <div className="library-list">
      {rows.map((e) => (
        <LibraryItem key={e.key} exercise={e} progress={index.get(e.key)} />
      ))}
    </div>
  );
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {mistakes ? '在错误里，找到下一步' : '按第一次学习的日期，慢慢积累'}
          </p>
          <h2>{mistakes ? '错题本' : '词汇手册'}</h2>
        </div>
        <span>{items.length} 项</span>
      </div>
      {!mistakes && items.length > 0 && (
        <p className="footnote">
          按首次提交拼写的本地日期分类。复习不会改变归属；点日期查看这一组。
        </p>
      )}
      {items.length === 0 && (
        <div className="card empty">
          <h3>{mistakes ? '这里还没有错题' : '还没有词汇'}</h3>
          <p>{mistakes ? '练习中答错的题目会自动出现在这里。' : '先在“我的”导入一个题包。'}</p>
        </div>
      )}
      {mistakes ? (
        list(items)
      ) : (
        <div className="vocabulary-groups">
          {groups.map((group) => (
            <details className="word-date-group" key={group.key}>
              <summary className="word-date-heading">
                <strong>{group.label}</strong>
                <span>{group.items.length} 个词</span>
              </summary>
              {list(group.items)}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
