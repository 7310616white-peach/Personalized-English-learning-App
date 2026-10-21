import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface IncomingFile {
  token: string;
  name: string;
  text?: string;
  error?: string;
}
interface FilesPlugin {
  consume(): Promise<{ files: IncomingFile[] }>;
  addListener(
    event: 'incomingFile',
    callback: (file: IncomingFile) => void,
  ): Promise<PluginListenerHandle>;
}
const files = registerPlugin<FilesPlugin>('IncomingFiles');
export async function listenForIncomingFiles(onFile: (file: IncomingFile) => void) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const delivered = new Set<string>();
  const receive = (file: IncomingFile) => {
    if (!file.token || delivered.has(file.token)) return;
    delivered.add(file.token);
    onFile(file);
  };
  const listener = await files.addListener('incomingFile', receive);
  try {
    (await files.consume()).files.forEach(receive);
  } catch (e) {
    await listener.remove();
    throw e;
  }
  return () => {
    void listener.remove();
  };
}
