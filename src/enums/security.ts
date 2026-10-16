/**
 * ระดับความยากรหัสผ่าน — FT-01 · REQ-AUTH-005 [MUST]
 * ⚠️ ค่าปัจจุบันอ่านจากตาราง `settings` (key: security.passwordPolicy) ห้าม hardcode
 * เกณฑ์แต่ละระดับยังรอยืนยันที่ Q-009
 */
export const PasswordPolicy = {
  EASY: 'EASY',
  SECURE: 'SECURE',
  VERY_SECURE: 'VERY_SECURE',
} as const;
export type PasswordPolicy = (typeof PasswordPolicy)[keyof typeof PasswordPolicy];

/** เกณฑ์ของแต่ละระดับ — ใช้ร่วมกันทั้ง client validation และ server validation (ตรวจด้วย `checkPasswordPolicy()` ด้านล่าง) */
export interface PasswordPolicyRule {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
}

export const PASSWORD_POLICY_RULES: Readonly<Record<PasswordPolicy, PasswordPolicyRule>> = {
  EASY: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireDigit: false,
    requireSymbol: false,
  },
  SECURE: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: false,
    requireDigit: true,
    requireSymbol: false,
  },
  VERY_SECURE: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSymbol: true,
  },
} as const;

/** เกณฑ์ข้อที่รหัสผ่านไม่ผ่าน — ชื่อเดียวกับ field ของ `PasswordPolicyRule` */
export type PasswordPolicyViolation = keyof PasswordPolicyRule;

/**
 * ตรวจรหัสผ่านกับเกณฑ์หนึ่งระดับ — **ตัวเดียวทั้ง server และหน้าเว็บ** (SV-ADR-027 · `T-062e`)
 *   - server: `PasswordService` ใช้ตัดสินจริง (422 `AUTH_WEAK_PASSWORD`) — หน้าเว็บถูกข้ามได้เสมอ
 *   - เว็บ: 3 ฟอร์มที่ตั้งรหัสผ่านใช้ตรวจก่อนส่ง ด้วย `rule` ที่โหลดจาก `GET /auth/password-policy`
 * คืนทุกข้อที่ไม่ผ่านพร้อมกัน ตามลำดับ minLength → requireUppercase → requireLowercase → requireDigit → requireSymbol
 * array ว่าง = ผ่าน · ไม่ throw เพื่อให้แต่ละฝั่งเลือกวิธีแจ้งเอง (แบบเดียวกับ `validateMessageTemplateContent()`)
 */
export function checkPasswordPolicy(plain: string, rule: PasswordPolicyRule): PasswordPolicyViolation[] {
  const violations: PasswordPolicyViolation[] = [];
  if (plain.length < rule.minLength) violations.push('minLength');
  if (rule.requireUppercase && !/[A-Z]/.test(plain)) violations.push('requireUppercase');
  if (rule.requireLowercase && !/[a-z]/.test(plain)) violations.push('requireLowercase');
  if (rule.requireDigit && !/[0-9]/.test(plain)) violations.push('requireDigit');
  if (rule.requireSymbol && !/[^A-Za-z0-9]/.test(plain)) violations.push('requireSymbol');
  return violations;
}

/**
 * ขอบเขตของ DB-backed rate limit ที่ `/auth/*` — DOM-04 §4.1b · REQ-SEC-005
 *
 * `LOGIN` เพิ่มตอน `T-092`: account lockout (`REQ-AUTH-004`) จำกัดได้แค่ "ต่อบัญชี"
 * ผู้โจมตีที่ลองรหัสผ่านเดียวกันไล่ไปทีละ username จึงไม่มีบัญชีไหนถูกล็อกเลย (password spraying)
 * เพดานต่อ IP คือชั้นเดียวที่กันเคสนี้ได้ — ดู `AUTH_RATE_LIMIT_RULES` ฝั่ง API
 *
 * ⚠️ คอลัมน์ `auth_rate_limit_events.scope` เป็น `varchar(40)` ไม่ใช่ MySQL ENUM
 * → เพิ่มค่าใหม่ที่นี่ **ไม่ต้องมี migration**
 */
export const AuthRateLimitScope = {
  LOGIN: 'LOGIN',
  FORGOT_PASSWORD_REQUEST: 'FORGOT_PASSWORD_REQUEST',
  FORGOT_PASSWORD_RESET: 'FORGOT_PASSWORD_RESET',
  /**
   * หน้า LINE OA ของผู้บริจาค (`SV-CR-003` ข้อ 2.3 · SV-ADR-045 · `T-074`) — SMS มีค่าใช้จ่ายต่อข้อความ (กัน SMS pumping)
   * identifier: `DONOR_OTP_REQUEST` = LINE userId (+ IP) · `DONOR_OTP_PHONE` = เบอร์ที่ normalize แล้ว · `DONOR_OTP_VERIFY` = LINE userId (+ IP)
   */
  DONOR_OTP_REQUEST: 'DONOR_OTP_REQUEST',
  DONOR_OTP_PHONE: 'DONOR_OTP_PHONE',
  DONOR_OTP_VERIFY: 'DONOR_OTP_VERIFY',
  /** เพดาน 24 ชม. ของ SMS ที่ส่งจริง (review `T-074` LOW-2) — ต่อเบอร์ปลายทาง · ต่อ LINE userId */
  DONOR_OTP_PHONE_DAILY: 'DONOR_OTP_PHONE_DAILY',
  DONOR_OTP_LINE_USER_DAILY: 'DONOR_OTP_LINE_USER_DAILY',
  /**
   * LINE ID token ที่ LINE ปฏิเสธ (หน้า LIFF · review `T-074` LOW-3) — identifier = IP ของผู้เรียก ·
   * กันการยิง token มั่วให้ API ไปเรียก LINE `/oauth2/v2.1/verify` ไม่จำกัด (LINE throttle เรา = ผู้ใช้จริงได้ 503 ทั้งหมด)
   */
  LIFF_ID_TOKEN_FAILURE: 'LIFF_ID_TOKEN_FAILURE',
} as const;
export type AuthRateLimitScope =
  (typeof AuthRateLimitScope)[keyof typeof AuthRateLimitScope];
