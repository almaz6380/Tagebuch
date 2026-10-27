// Signs Android release builds with the upload keystore described in
// android/keystore.properties (written by the release workflow). Without that
// file, release builds fall back to the debug key as in the Expo template.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            def props = new Properties()
            def file = rootProject.file('keystore.properties')
            if (file.exists()) {
                file.withInputStream { props.load(it) }
                storeFile rootProject.file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes("rootProject.file('keystore.properties')")) return cfg;

    const debugBlock = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
    // Newer templates write `signingConfig = signingConfigs.debug`.
    const releaseUsesDebug = /(release\s*\{[^}]*?)signingConfig\s*=?\s*signingConfigs\.debug/;
    if (!debugBlock.test(gradle) || !releaseUsesDebug.test(gradle)) {
      throw new Error('withReleaseSigning: build.gradle template changed, signing config not found');
    }
    gradle = gradle.replace(debugBlock, `$1${RELEASE_CONFIG}`);
    gradle = gradle.replace(
      releaseUsesDebug,
      "$1signingConfig = rootProject.file('keystore.properties').exists() ? signingConfigs.release : signingConfigs.debug",
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
