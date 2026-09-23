// Run: node scripts/check-android-icon.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');
const { XML } = require('expo/config-plugins');
const { createAdaptiveIconXmlString } = require('@expo/prebuild-config/build/plugins/icons/withAndroidIcons');
const withInset = require('../plugins/with-adaptive-icon-inset');

async function checkIcon(file) {
  const icon = (await XML.readXMLAsync({ path: file }))['adaptive-icon'];
  assert.equal(icon.background[0].$['android:drawable'], '@color/iconBackground');
  for (const layer of ['foreground', 'monochrome']) {
    const drawable = icon[layer][0].inset[0].$;
    assert.equal(drawable['android:drawable'], `@mipmap/ic_launcher_${layer}`);
    const inset = Number.parseFloat(drawable['android:inset']) / 100;
    assert.ok(inset > 0 && inset < 0.5);
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, `../assets/images/android-icon-${layer}.png`)));
    // Check the actual artwork, including translucent edge pixels, inside the
    // conservative central 66dp circle of the Android 108dp layer canvas.
    let opaque = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
        opaque++;
        const dx = ((x + 0.5) / png.width - 0.5) * (1 - 2 * inset);
        const dy = ((y + 0.5) / png.height - 0.5) * (1 - 2 * inset);
        assert.ok(Math.hypot(dx, dy) <= 33 / 108, `${layer}: clipped corner at ${x},${y}`);
      }
    }
    assert.ok(opaque > 0, `${layer}: empty icon`);
  }
}

async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fishlog-icon-check-'));
  const directory = path.join(temporary, 'app/src/main/res/mipmap-anydpi-v26');
  fs.mkdirSync(directory, { recursive: true });
  const names = ['ic_launcher.xml', 'ic_launcher_round.xml'];
  try {
    for (const name of names) fs.writeFileSync(path.join(directory, name), createAdaptiveIconXmlString(null, true));
    const config = withInset({});
    const run = () => config.mods.android.dangerous({
      ...config,
      modRequest: { projectRoot: path.resolve(__dirname, '..'), platformProjectRoot: temporary },
      modResults: {},
    });
    await run();
    const first = fs.readFileSync(path.join(directory, names[0]), 'utf8');
    await run();
    assert.equal(fs.readFileSync(path.join(directory, names[0]), 'utf8'), first, 'repeated prebuild must not add nested insets');
    for (const name of names) {
      await checkIcon(path.join(directory, name));
      const generated = path.join(__dirname, '../android/app/src/main/res/mipmap-anydpi-v26', name);
      if (fs.existsSync(generated)) await checkIcon(generated);
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  console.log('Android icon checks passed: generated resources, idempotence, foreground/monochrome mask-safe artwork');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
