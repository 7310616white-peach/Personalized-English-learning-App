/** Minimal ZIP STORE codec for this app's backup format only, not arbitrary ZIP imports.
 * Uses standard ZIP local/central headers, CRC-32 and an uncommented end record.
 * Rejects compression, ZIP64, encryption, duplicate paths and unexpected archive layouts.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX = 256 * 1024 * 1024;
const table = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let b = 0; b < 8; b++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = table[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
function validName(name: string) {
  if (!/^(data\.json|media\/[a-f0-9]{64}\.wav)$/.test(name))
    throw new Error('备份 ZIP 含有不允许的路径');
}
function join(parts: Uint8Array[]) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  if (size > MAX) throw new Error('完整备份超过 256 MB 上限');
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
export function zipBackup(entries: Record<string, Uint8Array>) {
  const local: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  const files = Object.entries(entries);
  if (!files.length || files.length > 1001) throw new Error('备份文件数量无效');
  for (const [name, bytes] of files) {
    validName(name);
    const path = encoder.encode(name),
      crc = crc32(bytes);
    const header = new Uint8Array(30 + path.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, path.length, true);
    header.set(path, 30);
    const directory = new Uint8Array(46 + path.length),
      d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(14, 33, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, bytes.length, true);
    d.setUint32(24, bytes.length, true);
    d.setUint16(28, path.length, true);
    d.setUint32(42, offset, true);
    directory.set(path, 46);
    local.push(header, bytes);
    central.push(directory);
    offset += header.length + bytes.length;
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return join([...local, ...central, end]);
}
export function unzipBackup(bytes: Uint8Array) {
  if (bytes.length < 22 || bytes.length > MAX) throw new Error('备份 ZIP 大小无效');
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    end = bytes.length - 22;
  const u16 = (p: number) => d.getUint16(p, true),
    u32 = (p: number) => d.getUint32(p, true);
  if (u32(end) !== 0x06054b50 || u16(end + 4) || u16(end + 6) || u16(end + 20))
    throw new Error('请使用本 App 导出的未压缩 ZIP 备份');
  const count = u16(end + 10),
    size = u32(end + 12),
    start = u32(end + 16);
  if (!count || count > 1001 || u16(end + 8) !== count || start + size !== end)
    throw new Error('ZIP 目录无效');
  const entries: Record<string, Uint8Array> = {};
  let p = start,
    previousEnd = 0,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || u32(p) !== 0x02014b50) throw new Error('ZIP 文件头无效');
    const nameLength = u16(p + 28),
      extra = u16(p + 30),
      comment = u16(p + 32),
      length = u32(p + 24),
      offset = u32(p + 42),
      crc = u32(p + 16);
    if (
      p + 46 + nameLength + extra + comment > end ||
      u16(p + 8) !== 0 ||
      u16(p + 10) !== 0 ||
      u16(p + 34) ||
      u32(p + 20) !== length
    )
      throw new Error('仅支持本 App 的未压缩、未加密 ZIP');
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    validName(name);
    if (Object.hasOwn(entries, name)) throw new Error('ZIP 含有重复文件');
    if (
      offset !== previousEnd ||
      offset + 30 > start ||
      u32(offset) !== 0x04034b50 ||
      u16(offset + 6) ||
      u16(offset + 8) ||
      u32(offset + 14) !== crc ||
      u32(offset + 18) !== length ||
      u32(offset + 22) !== length
    )
      throw new Error('ZIP 本地文件头不一致');
    const localName = u16(offset + 26),
      localExtra = u16(offset + 28),
      begin = offset + 30 + localName + localExtra,
      finish = begin + length;
    if (
      finish > start ||
      localName !== nameLength ||
      decoder.decode(bytes.subarray(offset + 30, offset + 30 + localName)) !== name
    )
      throw new Error('ZIP 文件引用无效');
    total += length;
    if (total > MAX || (name === 'data.json' && length > 50 * 1024 * 1024))
      throw new Error('ZIP 展开体积超限');
    const content = bytes.subarray(begin, finish);
    if (crc32(content) !== crc) throw new Error('ZIP 校验失败，文件可能损坏');
    entries[name] = content;
    previousEnd = finish;
    p += 46 + nameLength + extra + comment;
  }
  if (p !== end || previousEnd !== start) throw new Error('ZIP 目录长度无效');
  return entries;
}
