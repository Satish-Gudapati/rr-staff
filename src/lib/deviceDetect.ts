export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'pos';

export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // POS systems typically use specific kiosk browsers or very specific UAs
  if (ua.includes('pos') || ua.includes('kiosk')) {
    return 'pos';
  }

  // Tablet detection: iPads, Android tablets, etc.
  const isTablet =
    (ua.includes('ipad')) ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    (ua.includes('tablet')) ||
    (width >= 600 && width <= 1024 && ('ontouchstart' in window));

  if (isTablet) return 'tablet';

  // Mobile detection
  const isMobile =
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    (ua.includes('android') && ua.includes('mobile')) ||
    width < 600;

  if (isMobile) return 'mobile';

  return 'desktop';
}

export const DEVICE_LABELS: Record<DeviceType, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
  pos: 'POS Terminal',
};
