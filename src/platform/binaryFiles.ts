import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
export async function saveBinaryFile(name: string, bytes: Uint8Array, type: string) {
  if (Capacitor.isNativePlatform()) {
    for (let i = 0; i < bytes.length; i += 1024 * 1024) {
      const part = bytes.subarray(i, i + 1024 * 1024);
      let raw = '';
      for (let j = 0; j < part.length; j += 32768)
        raw += String.fromCharCode(...part.subarray(j, j + 32768));
      const data = btoa(raw);
      if (i === 0) await Filesystem.writeFile({ path: name, directory: Directory.Cache, data });
      else await Filesystem.appendFile({ path: name, directory: Directory.Cache, data });
    }
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    await Share.share({ url: uri, title: '保存完整学习备份' });
  } else {
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
