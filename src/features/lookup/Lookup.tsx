import { useEffect, useMemo, useState } from 'react';
import type { Exercise, Pack, Progress, Word } from '../../domain/models';
import { exercises, wordSchema } from '../../domain/models';
import { dictionaryWords, findWords, normalizeQuery } from '../../domain/lookup';
import { saveVocabulary, vocabularyPackId } from '../../data/vocabulary';
import { WordDetails } from '../../shared/components/WordDetails';
import glossary from './glossary.json';

const base = glossary.map((w) => wordSchema.parse(w));
export function Lookup({
  packs,
  progress,
  incoming,
  onPractice,
}: {
  packs: Pack[];
  progress: Progress[];
  incoming: string;
  onPractice: (title: string, queue: Exercise[]) => void;
}) {
  const [input, setInput] = useState(incoming);
  const [query, setQuery] = useState(incoming);
  const [meaning, setMeaning] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const words = useMemo(() => dictionaryWords(packs, base), [packs]);
  const { exact, suggestions } = findWords(words, query);
  const normalized = normalizeQuery(query);
  const saved = packs.find((p) => p.id === vocabularyPackId);
  const known = new Map(progress.map((p) => [p.key, p]));
  const personalQueue = saved
    ? exercises(saved).filter(
        (e) => !known.has(e.key) || known.get(e.key)!.due <= new Date().toISOString(),
      )
    : [];
  useEffect(() => {
    if (incoming) {
      setInput(incoming);
      setQuery(incoming);
      setMeaning('');
      setMessage('');
    }
  }, [incoming]);
  function search(value: string) {
    setQuery(value);
    setMeaning('');
    setMessage('');
  }
  async function collect(word: Word) {
    setBusy(true);
    setMessage('');
    try {
      setMessage(
        (await saveVocabulary({ ...word, id: crypto.randomUUID() }))
          ? '已加入我的阅读生词。首次练习后会安排间隔复习。'
          : '这个词已经在生词本里了，原有记录已保留。',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="lookup-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">读到哪里，学到哪里</p>
          <h2>阅读查词</h2>
        </div>
        <span className="tag">本地优先</span>
      </div>
      <div className="card lookup-search">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(input);
          }}
        >
          <label className="input-label" htmlFor="lookup-query">
            输入或粘贴不认识的英文单词 / 短语
          </label>
          <div className="search-row">
            <input
              id="lookup-query"
              lang="en"
              value={input}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              placeholder="例如 cohort、analysis"
              onChange={(e) => setInput(e.target.value)}
              enterKeyHint="search"
            />
            <button className="primary">查词</button>
          </div>
        </form>
        <p className="input-hint">
          内置 {base.length} 条基础科研词释义，并搜索全部已导入词汇。支持的 Android
          阅读软件可通过选中文字菜单中的“拾词查词”打开。
        </p>
      </div>
      {normalized && (
        <div className="card lookup-result">
          {exact ? (
            <>
              <span className="tag">本地释义</span>
              <WordDetails word={exact} />
              <button className="primary" disabled={busy} onClick={() => collect(exact)}>
                加入阅读生词
              </button>
            </>
          ) : (
            <>
              <h3>本地暂未收录「{normalized}」</h3>
              <p>可尝试下方词形候选，或主动打开在线词典。你也可以填写释义，将它收进生词本。</p>
              {suggestions.length > 0 && (
                <div className="suggestions">
                  <span>你可能想查：</span>
                  {suggestions.map((w) => (
                    <button
                      key={w.id}
                      className="secondary"
                      onClick={() => {
                        setInput(w.term);
                        search(w.term);
                      }}
                    >
                      {w.term}
                    </button>
                  ))}
                </div>
              )}
              <label className="input-label" htmlFor="custom-meaning">
                自填中文释义
              </label>
              <textarea
                id="custom-meaning"
                value={meaning}
                maxLength={10000}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="从可信词典核对后，填写这个词在原文中的含义"
              />
              <button
                className="secondary"
                disabled={busy || !meaning.trim()}
                onClick={() =>
                  collect(
                    wordSchema.parse({
                      id: crypto.randomUUID(),
                      term: normalized,
                      level: '科研英语',
                      meaning,
                    }),
                  )
                }
              >
                保存自填生词
              </button>
            </>
          )}
          <div className="online-links">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(normalized)}`}
            >
              在剑桥词典查询 ↗
            </a>
            <span>需要联网；仅在点击时将这个查询词交给词典网站。</span>
          </div>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </div>
      )}
      <div className="card vocabulary-summary">
        <div>
          <h3>我的阅读生词</h3>
          <p>
            已收藏 {saved?.words.length ?? 0} 个词 · {personalQueue.length} 个未练或已到期
          </p>
        </div>
        <button
          className="secondary"
          disabled={!personalQueue.length}
          onClick={() => onPractice('阅读生词拼写', personalQueue)}
        >
          练习阅读生词 →
        </button>
      </div>
      <p className="footnote">
        基础释义不能覆盖全部专业词，也不能替代原文语境。查到的生词与学习进度一起备份；App
        不自动读取剪贴板或上传文章。
      </p>
    </section>
  );
}
