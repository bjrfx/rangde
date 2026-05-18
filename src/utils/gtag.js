const GOOGLE_ADS_ID = 'AW-18074524220';

export function isGtagReady() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

export function gtagEvent(action, params = {}) {
  if (!isGtagReady()) {
    return false;
  }

  window.gtag('event', action, params);
  return true;
}

export function trackGoogleAdsConversion({
  conversionLabel,
  value,
  currency = 'USD',
  transactionId,
  ...rest
} = {}) {
  const sendTo = conversionLabel ? `${GOOGLE_ADS_ID}/${conversionLabel}` : GOOGLE_ADS_ID;

  return gtagEvent('conversion', {
    send_to: sendTo,
    ...(typeof value === 'number' ? { value } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {}),
    ...(currency ? { currency } : {}),
    ...rest,
  });
}

export { GOOGLE_ADS_ID };
