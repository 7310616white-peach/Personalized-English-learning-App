import { Fragment } from 'react';
import { useMeaning } from './ReadingProvider';

/** No lookup controls exist before commit. Whitespace and punctuation stay intact. */
export function ReadableText({
  text,
  enabled = true,
  packId,
}: {
  text: string;
  enabled?: boolean;
  packId?: string;
}) {
  const open = useMeaning();
  if (!enabled) return <>{text}</>;
  return (
    <>
      {text.split(/([A-Za-z]+(?:['’\-][A-Za-z]+)*)/g).map((part, i) =>
        i % 2 ? (
          <button
            key={i}
            type="button"
            className="lookup-word"
            aria-label={`查询 ${part}`}
            onClick={(event) => {
              event.stopPropagation();
              open(part, packId);
            }}
          >
            {part}
          </button>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
