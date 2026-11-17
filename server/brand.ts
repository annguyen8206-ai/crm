/** Product name shown in OTP texts, emails and pages (APP_NAME overrides). */
export const APP_NAME = process.env.APP_NAME || 'Pure CRM';
/** Brand name used in customer-facing messages (BRAND_NAME overrides). */
export const BRAND_NAME = process.env.BRAND_NAME || 'Pure Essential Oils';
/** ASCII form for SMS (no diacritics — avoids Unicode SMS splitting / cost). */
export const APP_NAME_ASCII = APP_NAME.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
