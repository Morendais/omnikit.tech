const assert = require('assert');
const fs = require('fs');
const path = require('path');
const tools = require('./index.js');

console.log('Testing OmniKit Tools module exports & functional logic...\n');

// 1. Verify all 27 modules are exported
const expectedModules = [
  'AudioTools', 'BaseConverter', 'BatchImageStudio', 'BgRemover', 'BoxShadowTool',
  'DevTools', 'FaviconStudio', 'HardwareTools', 'ImageTools', 'MediaCreative',
  'MediaExtended', 'MonitorTest', 'OcrTool', 'OfficeTools', 'P2PDrop',
  'PdfSuite', 'QrTool', 'SignatureTool', 'TextTools', 'TimestampTool',
  'TokenTool', 'TranscribeTool', 'TxtEditor', 'UnitConverter', 'UtilityExtended',
  'VideoCropTool', 'VideoTools'
];

for (const m of expectedModules) {
  assert(tools[m], `Module ${m} is not exported!`);
  console.log(`  [OK] Export: ${m}`);
}

// 2. Test TextTools counting
const textStats = tools.TextTools.updateStats('OmniKit clean tool library');
assert.strictEqual(textStats.words, 4, 'Word count mismatch');
assert.strictEqual(textStats.totalChars, 26, 'Total chars mismatch');
console.log('  [OK] TextTools word and char counting');

// 3. Test DevTools MD5 Vector (RFC 1321)
const md5Sample = tools.DevTools.fastMd5('hello');
assert.strictEqual(md5Sample, '5d41402abc4b2a76b9719d911017c592', 'MD5 vector mismatch');
console.log('  [OK] DevTools MD5 RFC 1321 vector');

// 4. Test DevTools Password Generator
const pwd = tools.DevTools.generatePassword(16, true, true, true, true);
assert.strictEqual(pwd.length, 16, 'Password length mismatch');
console.log('  [OK] DevTools Password Generator (16 chars)');

// 5. Test OfficeTools Num to Words
const numInWordsEn = tools.OfficeTools.spellEnglishNumber(125);
assert(numInWordsEn.includes('one hundred'), 'Num to words EN mismatch');
console.log('  [OK] OfficeTools Number to Words (EN)');

const numInWordsRu = tools.OfficeTools.spellRussianNumber(250);
assert(numInWordsRu.includes('двести пятьдесят'), 'Num to words RU mismatch');
console.log('  [OK] OfficeTools Number to Words (RU)');

// 6. Test BaseConverter (BigInt & Fractional Radix Conversion + 5-locale support)
const parsedHex = tools.BaseConverter.parseValue('FF', 16);
assert.strictEqual(parsedHex.int, 255n, 'BaseConverter hex parse mismatch');
assert.strictEqual(tools.BaseConverter.bigToBase(255n, 2), '11111111', 'BaseConverter binary output mismatch');
for (const lang of ['en', 'ru', 'fr', 'es', 'de']) {
  assert(tools.BaseConverter.MSG[lang], `BaseConverter missing locale: ${lang}`);
}
console.log('  [OK] BaseConverter radix conversion & 5-language messages');

// 7. Test UnitConverter (Physical Units & Temperature + 5-locale support)
const catTemp = tools.UnitConverter.CATS.find(c => c.id === 'temp');
const celsiusInBase = tools.UnitConverter.toBase(catTemp, 'c', 100);
const fahrenheit = tools.UnitConverter.fromBase(catTemp, 'f', celsiusInBase);
assert(Math.abs(fahrenheit - 212) < 1e-6, 'UnitConverter 100°C -> 212°F mismatch');
for (const lang of ['en', 'ru', 'fr', 'es', 'de']) {
  assert(tools.UnitConverter.LOCALE_TAG[lang], `UnitConverter missing locale tag: ${lang}`);
}
console.log('  [OK] UnitConverter physical conversion & 5-language locale tags');

// 8. Test TimestampTool (Epoch <-> ISO 8601 & 5-locale support)
const tsRes = tools.TimestampTool.convertToDate(1700000000);
assert(tsRes && tsRes.iso === '2023-11-14T22:13:20.000Z', 'TimestampTool ISO conversion mismatch');
for (const lang of ['en', 'ru', 'fr', 'es', 'de']) {
  assert(tools.TimestampTool.MSG[lang], `TimestampTool missing locale: ${lang}`);
}
console.log('  [OK] TimestampTool Epoch/ISO conversion & 5-language messages');

// 9. Test BoxShadowTool (CSS & Tailwind Arbitrary Shadow Generation + 5-locale support)
tools.BoxShadowTool.addLayer({ x: 0, y: 4, blur: 6, spread: -1, color: '#000000', opacity: 0.1 });
const cssRule = tools.BoxShadowTool.generateCssRule();
const twClass = tools.BoxShadowTool.generateTailwind();
assert(cssRule.startsWith('box-shadow:'), 'BoxShadowTool CSS rule mismatch');
assert(twClass.startsWith('shadow-['), 'BoxShadowTool Tailwind class mismatch');
for (const lang of ['en', 'ru', 'fr', 'es', 'de']) {
  assert(tools.BoxShadowTool.MSG[lang], `BoxShadowTool missing locale: ${lang}`);
}
console.log('  [OK] BoxShadowTool CSS/Tailwind generation & 5-language messages');

// 10. Test TranscribeTool (SRT & VTT Subtitle Timestamp Formatting)
assert.strictEqual(tools.TranscribeTool.fmtTime(65.5, true), '00:01:05,500', 'SRT timestamp mismatch');
assert.strictEqual(tools.TranscribeTool.fmtTime(65.5, false), '00:01:05.500', 'VTT timestamp mismatch');
console.log('  [OK] TranscribeTool SRT & VTT timestamp formatting');

// 11. Test TokenTool (BPE Token Estimation)
const tokCount = tools.TokenTool.countTokens('Hello world from OmniKit client-side utilities!');
assert(tokCount >= 6, 'TokenTool BPE count mismatch');
console.log('  [OK] TokenTool BPE token estimation');

// 12. Test UtilityExtended (Transliteration, Slugify, CSV -> JSON)
assert.strictEqual(tools.UtilityExtended.slugify('Привет Мир 2026!'), 'privet-mir-2026', 'Slugify mismatch');
const csvJson = JSON.parse(tools.UtilityExtended.csvToJson('name,role\nAlice,Admin'));
assert.strictEqual(csvJson[0].name, 'Alice', 'CSV to JSON mismatch');
assert.strictEqual(csvJson[0].role, 'Admin', 'CSV to JSON role mismatch');
console.log('  [OK] UtilityExtended slugify & RFC 4180 CSV to JSON');

// 13. Zero Secrets & Syntax Check Across All Tool Files
const toolFiles = fs.readdirSync(path.join(__dirname, 'tools')).filter(f => f.endsWith('.js'));
const secretRegex = /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AIza[0-9A-Za-z\-_]{35}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/;
for (const file of toolFiles) {
  const content = fs.readFileSync(path.join(__dirname, 'tools', file), 'utf8');
  assert(!secretRegex.test(content), `Potential secret found in tools/${file}`);
}
console.log(`  [OK] Audited ${toolFiles.length} tool files: 0 hardcoded secrets or API keys`);

console.log('\nAll OmniKit tool verification checks passed successfully with 100% success!');
