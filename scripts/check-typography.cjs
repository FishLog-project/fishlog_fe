// Run with: node scripts/check-typography.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./check-dex-data.cjs');

const root = path.resolve(__dirname, '..');
const { Fonts, Typography } = load('src/constants/typography.ts', { '@/global.css': {} });
const plugin = require('../app.json').expo.plugins.find((entry) => entry[0] === 'expo-font');
assert.ok(plugin, 'native builds must embed the same SUITE files as useFonts');
for (const family of Object.values(Fonts)) {
  const file = `./assets/fonts/${family}.ttf`;
  assert.ok(plugin[1].fonts.includes(file), `${family} is missing from the native font bundle`);
  // iOS uses the font's PostScript name, while Android uses the asset filename.
  const bytes = fs.readFileSync(path.join(root, file));
  const count = bytes.readUInt16BE(4);
  let nameOffset;
  for (let i = 0; i < count; i++) {
    const offset = 12 + i * 16;
    if (bytes.toString('ascii', offset, offset + 4) === 'name') nameOffset = bytes.readUInt32BE(offset + 8);
  }
  assert.notEqual(nameOffset, undefined, `${family} must be a valid font`);
  const strings = nameOffset + bytes.readUInt16BE(nameOffset + 4);
  const names = [];
  for (let i = 0; i < bytes.readUInt16BE(nameOffset + 2); i++) {
    const record = nameOffset + 6 + i * 12;
    if (bytes.readUInt16BE(record) !== 3 || bytes.readUInt16BE(record + 6) !== 6) continue;
    const start = strings + bytes.readUInt16BE(record + 10);
    names.push(Buffer.from(bytes.subarray(start, start + bytes.readUInt16BE(record + 8))).swap16().toString('utf16le'));
  }
  assert.ok(names.includes(family), `${family} must match its iOS PostScript name`);
}
for (const [name, style] of Object.entries(Typography)) {
  assert.ok(Object.values(Fonts).includes(style.fontFamily), `${name} must use a bundled font`);
  assert.equal(style.fontWeight, undefined, `${name}: weight-specific aliases must use Android's NORMAL slot`);
}

/**
 * 화면 코드가 폰트를 빠뜨리지 않았는지 본다.
 *
 * fontFamily 없는 Text 는 안드로이드에서 시스템 폰트로 그려진다.
 * 기기에 사용자 지정 글꼴이 걸려 있으면 그 글꼴로 보여서 앱 폰트가 무시된다.
 */
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const missing = [];
for (const file of sourceFiles(path.join(root, 'src'))) {
  const code = fs.readFileSync(file, 'utf8');
  const styles = new Map();
  for (const match of code.matchAll(/(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    if (!styles.has(match[1])) styles.set(match[1], match[2]);
  }
  const hasFont = (body) => body !== undefined && (body.includes('fontFamily') || body.includes('Typography.'));
  for (const tag of code.matchAll(/<Text\b[^>]*?style=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs)) {
    const used = tag[1];
    // 태그에서 토큰을 직접 펼쳐 쓰거나, 폰트를 가진 스타일을 하나라도 쓰면 통과
    if (used.includes('Typography.') || used.includes('fontFamily')) continue;
    const keys = [...used.matchAll(/styles\.(\w+)/g)].map((m) => m[1]);
    // 스타일을 props 로 받아 밖에서 지정하는 경우는 여기서 알 수 없어 건너뛴다
    if (keys.length === 0 || keys.some((key) => hasFont(styles.get(key)))) continue;
    missing.push(path.relative(root, file) + ' (' + keys.map((k) => 'styles.' + k).join(', ') + ')');
  }
  // style 자체가 없는 Text 도 시스템 폰트로 떨어진다
  if (/<Text>/.test(code)) missing.push(path.relative(root, file) + ' (<Text> without style)');
}
assert.deepEqual(missing, [], 'these Text styles fall back to the device font: ' + missing.join(', '));

console.log('typography checks passed: bundled SUITE files, iOS names, Android font-weight resolution and no device-font fallback');
