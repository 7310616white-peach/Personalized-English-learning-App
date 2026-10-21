/** Validate RIFF/WAVE PCM/float containers without trusting the file extension. */
export function inspectWav(buffer: ArrayBuffer) {
  const d = new DataView(buffer);
  const ascii = (p: number, n: number) => String.fromCharCode(...new Uint8Array(buffer, p, n));
  if (buffer.byteLength < 44 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE')
    throw new Error('文件不是有效 RIFF/WAVE 音频');
  if (d.getUint32(4, true) + 8 > buffer.byteLength) throw new Error('WAV 文件不完整');
  let sampleRate = 0,
    channels = 0,
    bits = 0,
    byteRate = 0,
    dataSize = 0;
  for (let p = 12; p + 8 <= buffer.byteLength;) {
    const name = ascii(p, 4),
      size = d.getUint32(p + 4, true),
      start = p + 8;
    if (start + size > buffer.byteLength) throw new Error('WAV 数据块不完整');
    if (name === 'fmt ') {
      if (size < 16) throw new Error('WAV 格式头无效');
      const codec = d.getUint16(start, true);
      channels = d.getUint16(start + 2, true);
      sampleRate = d.getUint32(start + 4, true);
      byteRate = d.getUint32(start + 8, true);
      bits = d.getUint16(start + 14, true);
      if (
        ![1, 3].includes(codec) ||
        (codec === 3 && bits !== 32) ||
        ![1, 2].includes(channels) ||
        ![8, 16, 24, 32].includes(bits) ||
        sampleRate < 8000 ||
        sampleRate > 192000 ||
        byteRate !== (sampleRate * channels * bits) / 8
      )
        throw new Error('初版支持单/双声道 PCM 或浮点 WAV；此编码需要另存兼容副本');
    }
    if (name === 'data') dataSize += size;
    p = start + size + (size % 2);
  }
  if (!sampleRate || !dataSize || !byteRate) throw new Error('WAV 缺少有效音频数据');
  return { sampleRate, channels, bits, durationSec: dataSize / byteRate };
}
