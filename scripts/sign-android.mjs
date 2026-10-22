import { parseArgs } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const { values } = parseArgs({
  options: {
    input: { type: 'string' },
    out: { type: 'string' },
    apksigner: { type: 'string' },
    java: { type: 'string', default: 'java' },
    'initialize-key': { type: 'boolean', default: false },
  },
});
for (const name of ['input', 'out', 'apksigner'])
  if (!values[name]) throw new Error(`Missing --${name}`);
const root = fileURLToPath(new URL('../', import.meta.url));
const privateDir = join(root, 'private-signing');
const key = join(privateDir, 'shici-release.p12');
const password = join(privateDir, 'storepass.txt');
const run = (program, args) => {
  const result = spawnSync(program, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Android signing command failed');
};
if (!existsSync(key)) {
  if (!values['initialize-key'] || existsSync(password))
    throw new Error(
      'Signing key unavailable. Restore the private key; do not silently replace it.',
    );
  mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  chmodSync(privateDir, 0o700);
  writeFileSync(password, randomBytes(32).toString('base64url'), { mode: 0o600, flag: 'wx' });
  const keytool =
    values.java === 'java' ? 'keytool' : join(dirname(resolve(values.java)), 'keytool');
  run(keytool, [
    '-genkeypair',
    '-alias',
    'shici-release',
    '-keyalg',
    'RSA',
    '-keysize',
    '3072',
    '-validity',
    '10950',
    '-storetype',
    'PKCS12',
    '-keystore',
    key,
    '-storepass:file',
    password,
    '-keypass:file',
    password,
    '-dname',
    'CN=Shici Release, O=English Pocket, C=CN',
    '-noprompt',
  ]);
  chmodSync(key, 0o600);
  writeFileSync(
    join(privateDir, 'README-private.txt'),
    'Keep this entire directory private and backed up. The same key is required for future APK updates. Never upload it to GitHub, Actions artifacts, or shared logs.\n',
    { mode: 0o600 },
  );
}
if (!existsSync(password)) throw new Error('Restore the private signing password file');
const out = resolve(values.out);
if (existsSync(out)) throw new Error('Output already exists; choose another output file');
mkdirSync(dirname(out), { recursive: true });
run(values.java, [
  '-jar',
  resolve(values.apksigner),
  'sign',
  '--ks',
  key,
  '--ks-type',
  'PKCS12',
  '--ks-key-alias',
  'shici-release',
  '--ks-pass',
  'file:' + password,
  '--v2-signing-enabled',
  'true',
  '--v3-signing-enabled',
  'true',
  '--v4-signing-enabled',
  'false',
  '--out',
  out,
  resolve(values.input),
]);
run(values.java, ['-jar', resolve(values.apksigner), 'verify', '--verbose', '--print-certs', out]);
console.log('Release APK signed and verified:', out);
