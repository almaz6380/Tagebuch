import { View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { adRequestOptions } from '@/ads/ads';
import { adUnit } from '@/ads/config';
import { useShowAds } from '@/ads/state';
import { useTheme } from '@/theme/ThemeProvider';

/** Banner above the tab bar. A real view, so the screen above shrinks instead of being covered. */
export function AdBanner() {
  const show = useShowAds();
  const { theme } = useTheme();
  if (!show) return null;
  return (
    <View style={{ alignItems: 'center', backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      <BannerAd
        unitId={adUnit('banner', TestIds.ADAPTIVE_BANNER)}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions()}
        onAdFailedToLoad={(e) => console.warn('[ads] banner failed', e)}
      />
    </View>
  );
}
