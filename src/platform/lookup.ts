import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface SelectedText {
  text: string;
}
interface ReadingLookupPlugin {
  consumeSelectedText(): Promise<SelectedText>;
  addListener(
    event: 'selectedText',
    callback: (value: SelectedText) => void,
  ): Promise<PluginListenerHandle>;
}
const readingLookup = registerPlugin<ReadingLookupPlugin>('ReadingLookup');

/** Only explicitly selected text is received; no clipboard or document monitoring. */
export async function listenForSelectedText(onText: (text: string) => void) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const listener = await readingLookup.addListener('selectedText', (value) => {
    if (value.text.trim()) onText(value.text.slice(0, 100));
  });
  try {
    const initial = await readingLookup.consumeSelectedText();
    if (initial.text.trim()) onText(initial.text.slice(0, 100));
  } catch (error) {
    await listener.remove();
    throw error;
  }
  return () => {
    void listener.remove();
  };
}
