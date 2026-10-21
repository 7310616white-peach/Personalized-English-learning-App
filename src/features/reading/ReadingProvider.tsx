import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Pack } from '../../domain/models';
import { dictionaryWords } from '../../domain/lookup';
import { wordSchema } from '../../domain/models';
import { MeaningDialog } from './MeaningDialog';
import glossary from './glossary.json';

const base = glossary.map((word) => wordSchema.parse(word));
const LookupContext = createContext<(term: string, packId?: string) => void>(() => {});
export const useMeaning = () => useContext(LookupContext);

export function ReadingProvider({
  packs,
  external,
  children,
}: {
  packs: Pack[];
  external?: { text: string; token: number };
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<{ term: string; packId?: string }>();
  useEffect(() => {
    if (external?.text) setSelected({ term: external.text });
  }, [external]);
  const words = useMemo(() => {
    const preferred = packs.find((p) => p.id === selected?.packId);
    return dictionaryWords(
      preferred ? [preferred, ...packs.filter((p) => p !== preferred)] : packs,
      base,
    );
  }, [packs, selected?.packId]);
  return (
    <LookupContext.Provider value={(term, packId) => setSelected({ term, packId })}>
      {children}
      {selected && (
        <MeaningDialog
          key={selected.term}
          term={selected.term}
          words={words}
          onClose={() => setSelected(undefined)}
        />
      )}
    </LookupContext.Provider>
  );
}
