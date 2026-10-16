/**
 * SMS ของระบบ (OTP ผูกบัญชีผู้บริจาค) — `SV-CR-003` ข้อ 2.3 · 3 · SV-ADR-045 · FT-11 หมวด `sms` · `T-074`
 * ผู้ให้บริการเลือกในเมนูตั้งค่า (`sms.provider`) · เพิ่มผู้ให้บริการใหม่ตามสูตร TEC-11 (ค่าใหม่ใน enum นี้ + class provider ฝั่ง API)
 */
export const SmsProvider = {
  /** ThaiBulkSMS API v2 (`POST https://api-v2.thaibulksms.com/sms` · Basic auth key:secret) */
  THAIBULKSMS: 'THAIBULKSMS',
} as const;
export type SmsProvider = (typeof SmsProvider)[keyof typeof SmsProvider];

export const SMS_PROVIDERS: readonly SmsProvider[] = Object.values(SmsProvider);

/** body ของ `POST /settings/sms/test` — ส่งไปเบอร์มือถือไทยเท่านั้น (ค่าผู้ให้บริการอ่านจากที่บันทึกไว้ใน DB) */
export interface SmsTestInput {
  phone: string;
}

/** คำตอบของ `POST /settings/sms/test` — เบอร์แบบปิดบางส่วน (ไม่ log เบอร์เต็มลง audit) */
export interface SmsTestResultView {
  provider: SmsProvider;
  to: string;
  sender: string;
}

/** เบอร์แบบปิดกลาง `081-xxx-5678` → `081****678` — ใช้ใน audit / log (ไม่เก็บเบอร์เต็มที่ไม่จำเป็น) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '*'.repeat(digits.length);
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 6)}${digits.slice(-3)}`;
}
