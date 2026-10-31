// Turns off R8 (code shrinking) for Android release builds.
// Expo SDK 58 writes android.enableMinifyInReleaseBuilds=true into gradle.properties.
// R8 then removed classes that WorkManager loads by reflection, and the release app
// crashed on every start ("Failed to create an instance of androidx.work.impl.WorkDatabase");
// Google Play rejected the first release for it. Ads, purchases and notifications load
// classes the same way, so keep rules for a single class would only patch one hole.
const { withGradleProperties } = require('expo/config-plugins');

const KEYS = ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds'];

module.exports = function withNoMinify(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && KEYS.includes(item.key)));
    for (const key of KEYS) cfg.modResults.push({ type: 'property', key, value: 'false' });
    return cfg;
  });
};
