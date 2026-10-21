import type { Word } from '../../domain/models';

export function WordDetails({ word }: { word: Word }) {
  return (
    <div className="word-details">
      <div className="word-heading">
        <strong lang="en">{word.term}</strong>
        <span>{word.phonetic}</span>
      </div>
      <p>{word.meaning}</p>
      {word.otherMeanings.length > 0 && (
        <p>
          <b>熟词生义</b> {word.otherMeanings.join('；')}
        </p>
      )}
      {word.collocations.length > 0 && (
        <p>
          <b>常用搭配</b> {word.collocations.join(' · ')}
        </p>
      )}
      {word.example && (
        <blockquote lang="en">
          {word.example}
          <small>{word.exampleTranslation}</small>
        </blockquote>
      )}
      {word.confusion && (
        <p>
          <b>易混辨析</b> {word.confusion}
        </p>
      )}
    </div>
  );
}
