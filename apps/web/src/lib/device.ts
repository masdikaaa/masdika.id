export interface DeviceInfo {
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  os: string;
  label: string;
}

/**
 * Lightweight, zero-dependency User-Agent parser for security & login tracking
 */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent || typeof userAgent !== 'string') {
    return {
      device: 'Unknown',
      browser: 'Web Browser',
      os: 'Other Device',
      label: 'Web Device'
    };
  }

  const ua = userAgent.trim();

  // 1. Detect Device Type
  let device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Desktop';
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = /(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo)/i.test(ua) || 
                   (/android/i.test(ua) && !isTablet);

  if (isTablet) {
    device = 'Tablet';
  } else if (isMobile) {
    device = 'Mobile';
  } else {
    device = 'Desktop';
  }

  // 2. Detect Operating System
  let os = 'Unknown OS';
  if (/windows nt 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/windows nt 6\.2/i.test(ua)) {
    os = 'Windows 8';
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/iphone/i.test(ua)) {
    os = 'iOS (iPhone)';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
  } else if (/mac os x|macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    const androidVer = ua.match(/android\s([0-9\.]+)/i);
    os = androidVer ? `Android ${androidVer[1]}` : 'Android';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
  } else if (/ubuntu/i.test(ua)) {
    os = 'Ubuntu Linux';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Detect Browser
  let browser = 'Other Browser';
  if (/edg\/|edge\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/vivaldi/i.test(ua)) {
    browser = 'Vivaldi';
  } else if (/brave/i.test(ua)) {
    browser = 'Brave';
  } else if (/arc\//i.test(ua)) {
    browser = 'Arc';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Safari';
  }

  // 4. Clean user-friendly label
  let label = `${browser} on ${os}`;
  if (os === 'Unknown OS') {
    label = `${browser} (${device})`;
  }

  return {
    device,
    browser,
    os,
    label
  };
}
