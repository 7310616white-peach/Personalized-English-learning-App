import { useEffect, useRef, useState } from 'react';
import { findWords, normalizeQuery } from '../../domain/lookup';
import { wordSchema, type Word } from '../../domain/models';
import { saveVocabulary } from '../../data/vocabulary';
import { useBackAction } from '../../shared/useBackAction';

export function MeaningDialog({
  term,
  words,
  onClose,
}: {
  term: string;
  words: Word[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(term);
  const [custom, setCustom] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const { exact, suggestions } = findWords(words, query);
  const normalized = normalizeQuery(query);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useBackAction(
    true,
    () => {
      if (!busy) onClose();
    },
    30,
  );
  async function collect(word: Word) {
    setBusy(true);
    setStatus('');
    try {
      setStatus(
        (await saveVocabulary({ ...word, id: crypto.randomUUID() }))
          ? '已加入生词本，可在词汇手册中复习。'
          : '这个词已收藏，原有记录已保留。',
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="meaning-dialog"
      aria-label="单词释义"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="card-top">
        <h3 lang="en">{query}</h3>
        <button type="button" className="text-button" onClick={onClose} disabled={busy}>
          关闭释义
        </button>
      </div>
      {exact ? (
        <>
          <span className="tag">本地释义</span>
          <p className="meaning-definition">{exact.meaning}</p>
          {exact.phonetic && <p>{exact.phonetic}</p>}
          {exact.otherMeanings.length > 0 && <p>熟词生义：{exact.otherMeanings.join('；')}</p>}
          {exact.collocations.length > 0 && <p>搭配：{exact.collocations.join('；')}</p>}
          {exact.example && (
            <blockquote>
              {exact.example}
              <small>{exact.exampleTranslation}</small>
            </blockquote>
          )}
          {exact.confusion && <p>{exact.confusion}</p>}
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => collect(exact)}
          >
            加入生词本
          </button>
        </>
      ) : (
        <>
          <p>本地暂未收录「{normalized}」。可选择词形候选，或点击下方词典核对。</p>
          <div className="meaning-suggestions">
            {suggestions.map((word) => (
              <button
                key={word.term}
                type="button"
                className="secondary"
                onClick={() => {
                  setQuery(word.term);
                  setStatus('');
                  setCustom('');
                }}
              >
                {word.term}
              </button>
            ))}
          </div>
          <label className="input-label" htmlFor="custom-meaning">
            自填中文释义
          </label>
          <textarea
            id="custom-meaning"
            value={custom}
            maxLength={10000}
            onChange={(event) => setCustom(event.target.value)}
          />
          <button
            type="button"
            className="secondary"
            disabled={busy || !custom.trim()}
            onClick={() =>
              collect(
                wordSchema.parse({
                  id: crypto.randomUUID(),
                  term: normalized,
                  level: '科研英语',
                  meaning: custom,
                }),
              )
            }
          >
            保存自填生词
          </button>
        </>
      )}
      <p>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(normalized)}`}
        >
          在剑桥词典查询 ↗
        </a>
      </p>
      <small>仅点击在线词典时联网，不上传文章。题包可附带语境词释义供离线查询。</small>
      {status && <p role="status">{status}</p>}
    </dialog>
  );
}
