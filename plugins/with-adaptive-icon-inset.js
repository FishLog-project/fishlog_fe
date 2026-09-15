const path = require('node:path');
const { withDangerousMod, XML } = require('expo/config-plugins');

// The book's corners exceed circular launcher masks even though its width fits.
// Keep the original artwork inside Android's central 66/108 safe zone.
const INSET = '14.25%';

module.exports = function withAdaptiveIconInset(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/mipmap-anydpi-v26');
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const file = path.join(directory, name);
      const xml = await XML.readXMLAsync({ path: file });
      const icon = xml?.['adaptive-icon'];
      if (!icon?.foreground?.[0]) throw new Error(`Adaptive icon is missing: ${file}`);
      for (const key of ['foreground', 'monochrome']) {
        const layer = icon[key]?.[0];
        if (!layer) continue;
        const drawable = layer.$?.['android:drawable'] ?? layer.inset?.[0]?.$?.['android:drawable'];
        if (!drawable) throw new Error(`Icon ${key} drawable is missing: ${file}`);
        delete layer.$;
        layer.inset = [{ $: { 'android:drawable': drawable, 'android:inset': INSET } }];
      }
      await XML.writeXMLAsync({ path: file, xml });
    }
    return mod;
  }]);
};
