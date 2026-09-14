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
console.log('typography checks passed: bundled SUITE files, iOS names and Android font-weight resolution');
