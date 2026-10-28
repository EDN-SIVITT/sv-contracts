import type { LineChannel } from '../enums/line';
import { SMS_PROVIDERS, SmsProvider } from './sms';

/**
 * กลุ่มค่าตั้งค่า — FT-11 · TEC-03 §3.5 (`GET/PATCH /settings/:group`)
 * ⚠️ ค่าที่เอกสารระบุว่า "ปรับได้ในเมนูตั้งค่า" ห้าม hardcode ในโค้ดเด็ดขาด (REQ-SET-001)
 */
export const SettingGroup = {
  LINE: 'line',
  S3: 's3',
  MAIL: 'mail',
  SECURITY: 'security',
  GENERAL: 'general',
  /** ผู้บริจาค (e-Donation · `SV-CR-003` ข้อ 3) — รหัสผู้บริจาค (`T-072`) · การสมัครเอง/consent (`T-074`) */
  DONOR: 'donor',
  /** SMS (OTP ผูกบัญชีผู้บริจาค · `SV-CR-003` ข้อ 3 · SV-ADR-045 · `T-074`) — ผู้ให้บริการ · key/secret · ชื่อผู้ส่ง */
  SMS: 'sms',
  /** ของที่ระลึก (e-Donation · `SV-CR-004` ข้อ 2.4 · `T-077`) — รูปแบบรหัสสินค้าที่ออกอัตโนมัติ */
  SOUVENIR: 'souvenir',
  /** ออเดอร์ (e-Donation · `SV-CR-004` ข้อ 2.4 · SV-ADR-051 · `T-077`) — เลขที่ออเดอร์ · ขนาดใบแปะหน้า · ผู้ส่ง · ตัวเลือกบนใบแปะหน้า */
  ORDER: 'order',
  /** รายการบริจาค (e-Donation · `SV-CR-005` ข้อ 3 · SV-ADR-053 · `T-084`) — รูปแบบเลขที่รายการบริจาค */
  DONATION: 'donation',
  /** โครงสร้างการรับบริจาค (e-Donation · `SV-CR-007` · SV-ADR-090 · `T-131`) — เปิด/ปิดชั้นโปรแกรม (3 ชั้น ↔ 4 ชั้น) */
  FUNDRAISING: 'fundraising',
} as const;
export type SettingGroup = (typeof SettingGroup)[keyof typeof SettingGroup];

/** ชนิดค่าที่เก็บใน `settings.value` (คอลัมน์ TEXT — JSON เก็บแบบ `JSON.stringify` · ชนิดอื่นเก็บเป็นข้อความตรง ๆ) */
export const SettingValueType = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  JSON: 'JSON',
  /** ค่า secret — เข้ารหัส AES-GCM ก่อนเก็บ + ส่งออกแบบ masked เท่านั้น (REQ-SEC-020) */
  SECRET: 'SECRET',
} as const;
export type SettingValueType = (typeof SettingValueType)[keyof typeof SettingValueType];

/**
 * คำนำหน้าของค่า secret ที่ถูก mask ก่อนส่งออก (REQ-SEC-020)
 * ใช้ร่วมกันทั้ง server (ข้ามค่านี้ตอนเขียน) และ web (รู้ว่าค่าที่เห็นไม่ใช่ค่าจริง) — REQ-SET-014
 */
export const SECRET_MASK_PREFIX = '••••';

/** ค่าที่ถูกอ่านบ่อยจนต้องมี helper กันพิมพ์ key ผิด — DOM-04 §4.9 · REQ-SET-020 [MUST] */
export const SettingKey = {
  SECURITY_MAX_LOGIN_ATTEMPTS: 'security.maxLoginAttempts',
  SECURITY_LOCKOUT_MINUTES: 'security.lockoutMinutes',
  SECURITY_PASSWORD_POLICY: 'security.passwordPolicy',
  SECURITY_AUDIT_LOG_RETENTION_DAYS: 'security.auditLogRetentionDays',
  /** CMS ไม่มี activity เกินจำนวนนี้ให้เพิกถอน session — REQ-AUTH-011 */
  SECURITY_SESSION_IDLE_MINUTES: 'security.sessionIdleMinutes',
  /** รอบตรวจ session ของ secret page — REQ-AUTH-012 */
  SECURITY_SESSION_CHECK_INTERVAL_SECONDS: 'security.sessionCheckIntervalSeconds',
  GENERAL_PAGINATION_OPTIONS: 'general.paginationOptions',
  GENERAL_DEFAULT_PER_PAGE: 'general.defaultPerPage',
  /** ชื่อระบบตามภาษาของผู้ใช้ — login · sidebar · ชื่อแท็บ · อีเมล (`REQ-SET-028` · SV-ADR-036) */
  GENERAL_SYSTEM_NAME_TH: 'general.systemNameTh',
  GENERAL_SYSTEM_NAME_EN: 'general.systemNameEn',
  /** ตัวอักษรบนพื้นสีแบรนด์เมื่อยังไม่มีไอคอน (`REQ-SET-029`) */
  GENERAL_SYSTEM_SHORT_NAME: 'general.systemShortName',
  /** ไอคอนระบบ (JSON descriptor) — **จัดการผ่าน `/branding/icon` เท่านั้น** อยู่ใน `MANAGED_SETTING_KEYS` (`REQ-SET-030`) */
  GENERAL_SYSTEM_ICON: 'general.systemIcon',
  /** หน้าจอโหลดเมื่อเปลี่ยนหน้า/เมนูของ CMS (แถบบน + ฉากคลุมพื้นที่เนื้อหา) — `REQ-SET-048` · `REQ-UIX-010` · SV-ADR-055 · ค่าเริ่มต้น `true` */
  GENERAL_PAGE_LOADING_SCREEN: 'general.pageLoadingScreen',
  S3_ENDPOINT: 's3.endpoint',
  S3_REGION: 's3.region',
  S3_BUCKET: 's3.bucket',
  /** prefix กลางของ object key ใหม่ทั้งหมด — REQ-SET-022 */
  S3_UPLOAD_FOLDER: 's3.uploadFolder',
  S3_ACCESS_KEY_ID: 's3.accessKeyId',
  S3_SECRET_ACCESS_KEY: 's3.secretAccessKey',
  S3_FORCE_PATH_STYLE: 's3.forcePathStyle',
  /** ขนาดไฟล์อัปโหลดสูงสุดต่อไฟล์ (MB) — REQ-NFR-004 · ห้าม hardcode (REQ-SET-001) */
  S3_MAX_UPLOAD_SIZE_MB: 's3.maxUploadSizeMb',
  MAIL_HOST: 'mail.host',
  MAIL_PORT: 'mail.port',
  MAIL_SECURE: 'mail.secure',
  MAIL_USER: 'mail.user',
  MAIL_PASSWORD: 'mail.password',
  MAIL_FROM: 'mail.from',
  /** คำนำหน้ารหัสผู้บริจาค 0–10 ตัว `A–Z a–z 0–9 - _` (ว่างได้) — `REQ-SET-031` · ค่าเริ่มต้น `DNR` */
  DONOR_CODE_PREFIX: 'donor.codePrefix',
  /** จำนวนหลักขั้นต่ำของเลขลำดับ (เติม 0 ด้านหน้า) 1–12 — `REQ-SET-032` · ค่าเริ่มต้น 6 · รหัสที่ออกแล้วไม่เปลี่ยน */
  DONOR_CODE_DIGITS: 'donor.codeDigits',
  /** เปิดให้ผู้บริจาคสมัครเองผ่าน LINE OA (ค่าเริ่มต้น `true`) — `REQ-SET-035` · `REQ-DNL-007` · ปิดแล้วผู้บริจาคเดิมยังผูกได้ */
  DONOR_SELF_REGISTRATION_ENABLED: 'donor.selfRegistrationEnabled',
  /** ข้อความเมื่อปิดสมัครเองแล้วไม่พบเบอร์ (th/en · บังคับ ≤ 500) — `REQ-SET-035` · แสดงใต้ switch ในหน้าตั้งค่า */
  DONOR_SELF_REGISTRATION_DISABLED_MESSAGE_TH: 'donor.selfRegistrationDisabledMessageTh',
  DONOR_SELF_REGISTRATION_DISABLED_MESSAGE_EN: 'donor.selfRegistrationDisabledMessageEn',
  /** ข้อความขอความยินยอม (PDPA) ที่ผู้บริจาคต้องยอมรับก่อนผูก/สร้าง (th/en · บังคับ ≤ 5000 · หลายบรรทัด) — `REQ-SET-036` · `REQ-DNL-004` */
  DONOR_CONSENT_TEXT_TH: 'donor.consentTextTh',
  DONOR_CONSENT_TEXT_EN: 'donor.consentTextEn',
  /** ผู้ให้บริการ SMS (`SmsProvider` · ค่าเริ่มต้น `THAIBULKSMS`) — `REQ-SET-037` */
  SMS_PROVIDER: 'sms.provider',
  /** API key / secret ของผู้ให้บริการ (SECRET · เข้ารหัส) — `REQ-SET-037` */
  SMS_API_KEY: 'sms.apiKey',
  SMS_API_SECRET: 'sms.apiSecret',
  /** ชื่อผู้ส่งที่ลงทะเบียนกับผู้ให้บริการ (≤ 11 ตัว `A–Z a–z 0–9` ช่องว่าง `. _ -`) — `REQ-SET-037` */
  SMS_SENDER: 'sms.sender',
  /** ผู้ให้บริการ `TRUEID` (SMS Gateway ภายใน · SV-ADR-073 · `T-109`): URL ที่รับ `POST` (http/https ≤ 500) — `REQ-SET-037` */
  SMS_GATEWAY_URL: 'sms.gatewayUrl',
  /** ค่า header `Authorization` ของ gateway (SECRET · เข้ารหัส · ส่งตามที่กรอก เช่น `Bearer …`) — `REQ-SET-037` */
  SMS_GATEWAY_AUTH: 'sms.gatewayAuth',
  /** Sender ID ของ gateway (≤ 100 ตัว `A–Z a–z 0–9 . _ : -` · เช่น UUID) — `REQ-SET-037` */
  SMS_SENDER_ID: 'sms.senderId',
  /** คำนำหน้ารหัสของที่ระลึก 0–10 ตัว `A–Z a–z 0–9 - _` (ว่างได้) — `REQ-SET-038` · ค่าเริ่มต้น `SVN` */
  SOUVENIR_CODE_PREFIX: 'souvenir.codePrefix',
  /** จำนวนหลักขั้นต่ำของเลขลำดับรหัสของที่ระลึก 1–12 — `REQ-SET-039` · ค่าเริ่มต้น 4 (`SVN0001`) · รหัสที่ออกแล้วไม่เปลี่ยน */
  SOUVENIR_CODE_DIGITS: 'souvenir.codeDigits',
  /** คำนำหน้าเลขที่ออเดอร์ 0–10 ตัว (ว่างได้) — `REQ-SET-040` · ค่าเริ่มต้น `ORD` */
  ORDER_NO_PREFIX: 'order.noPrefix',
  /** จำนวนหลักขั้นต่ำของเลขลำดับออเดอร์ 1–12 — `REQ-SET-040` · ค่าเริ่มต้น 6 (`ORD000001`) */
  ORDER_NO_DIGITS: 'order.noDigits',
  /** ขนาดสติ๊กเกอร์ใบแปะหน้า (mm · 20–200) — `REQ-SET-041` · ค่าเริ่มต้น 70 × 50 (ฉลากยาร้านขายยาไทย · SV-ADR-051) · preset ใน `ORDER_LABEL_PRESETS` */
  ORDER_LABEL_WIDTH_MM: 'order.labelWidthMm',
  ORDER_LABEL_HEIGHT_MM: 'order.labelHeightMm',
  /** ขอบในของดวง (mm · 0–10) — `REQ-SET-042` · ค่าเริ่มต้น 2 */
  ORDER_LABEL_MARGIN_MM: 'order.labelMarginMm',
  /** บรรทัดผู้ส่งบนใบแปะหน้า — ชื่อ ≤ 100 (ว่าง = ชื่อระบบ) · เบอร์ ≤ 30 · ที่อยู่ ≤ 300 — `REQ-SET-043` */
  ORDER_LABEL_SENDER_NAME: 'order.labelSenderName',
  ORDER_LABEL_SENDER_PHONE: 'order.labelSenderPhone',
  ORDER_LABEL_SENDER_ADDRESS: 'order.labelSenderAddress',
  /** พิมพ์รายการของ (≤ 3 บรรทัด) บนใบแปะหน้า — `REQ-SET-044` · ค่าเริ่มต้น `true` */
  ORDER_LABEL_SHOW_ITEMS: 'order.labelShowItems',
  /** พิมพ์บาร์โค้ด Code 128 ของเลขที่ออเดอร์ — `REQ-SET-045` · ค่าเริ่มต้น `true` */
  ORDER_LABEL_SHOW_BARCODE: 'order.labelShowBarcode',
  /**
   * สีสถานะออเดอร์ `#RRGGBB` (บังคับ) — `REQ-SET-050` · SV-ADR-075 · `T-111` · ลำดับ = `OrderStatus` · แผนที่สถานะ → key = `ORDER_STATUS_COLOR_KEYS` (`./orders.ts`) ·
   * ค่าเริ่มต้น `ORDER_STATUS_COLOR_DEFAULTS` · badge/แท็บทุกหน้าอ่านผ่าน `GET /orders/status-colors` (สิทธิ์ออเดอร์ READ_ONLY · ค่าเสีย/ว่าง = ค่าเริ่มต้น)
   */
  ORDER_STATUS_COLOR_DRAFT: 'order.statusColorDraft',
  ORDER_STATUS_COLOR_CONFIRMED: 'order.statusColorConfirmed',
  ORDER_STATUS_COLOR_PREPARING: 'order.statusColorPreparing',
  ORDER_STATUS_COLOR_SHIPPED: 'order.statusColorShipped',
  ORDER_STATUS_COLOR_RECEIVED: 'order.statusColorReceived',
  ORDER_STATUS_COLOR_CANCELLED: 'order.statusColorCancelled',
  /**
   * สีเลขที่ออเดอร์ `#RRGGBB` (บังคับ) — `REQ-SET-051` · SV-ADR-078 · `T-115` · คู่กับ `DONATION_NO_COLOR` ให้ผู้ใช้แยก 2 ชนิดเลขที่ด้วยสี ·
   * แผนที่ชนิด → key = `REF_NO_COLOR_KEYS` (`./ref-no-colors.ts`) · ค่าเริ่มต้น `REF_NO_COLOR_DEFAULTS` · อ่านผ่าน `GET /orders/ref-no-colors` / `GET /donations/ref-no-colors`
   */
  ORDER_NO_COLOR: 'order.noColor',
  /** คำนำหน้าเลขที่รายการบริจาค 0–10 ตัว (ว่างได้) — `REQ-SET-046` · ค่าเริ่มต้น `DON` */
  DONATION_NO_PREFIX: 'donation.noPrefix',
  /** จำนวนหลักขั้นต่ำของเลขลำดับรายการบริจาค 1–12 — `REQ-SET-047` · ค่าเริ่มต้น 6 (`DON000001`) · เลขที่ออกแล้วไม่เปลี่ยน */
  DONATION_NO_DIGITS: 'donation.noDigits',
  /** สีเลขที่รายการบริจาค `#RRGGBB` (บังคับ) — `REQ-SET-051` · SV-ADR-078 · คู่กับ `ORDER_NO_COLOR` (ดูข้างบน) */
  DONATION_NO_COLOR: 'donation.noColor',
  /**
   * สีสถานะรายการบริจาค `#RRGGBB` (บังคับ) — `REQ-SET-052` · SV-ADR-080 · `T-118` · ลำดับ = `DonationStatus` · แผนที่สถานะ → key = `DONATION_STATUS_COLOR_KEYS` (`./donations.ts`) ·
   * ค่าเริ่มต้น `DONATION_STATUS_COLOR_DEFAULTS` · badge/แท็บ/จุดสถานะทุกหน้าอ่านผ่าน `GET /donations/status-colors` (สิทธิ์รายการบริจาค READ_ONLY · ค่าเสีย/ว่าง = ค่าเริ่มต้น)
   */
  DONATION_STATUS_COLOR_PENDING: 'donation.statusColorPending',
  DONATION_STATUS_COLOR_CONFIRMED: 'donation.statusColorConfirmed',
  DONATION_STATUS_COLOR_ORDERED: 'donation.statusColorOrdered',
  DONATION_STATUS_COLOR_REJECTED: 'donation.statusColorRejected',
  /**
   * ชั้นโปรแกรม (`SV-CR-007` · SV-ADR-090 · `T-131`): `true` = 4 ชั้น โปรแกรม → กองทุน → แคมเปญ → รายการบริจาค · `false` = 3 ชั้น (ไม่มีเมนู/ช่องโปรแกรม) ·
   * ค่าที่ `0030` ใส่ = `true` เมื่อมีโปรแกรมอยู่แล้ว (site เดิม) ไม่งั้น `false` (site ใหม่) · ปิดแล้วโปรแกรม/ความสัมพันธ์/สิทธิ์เดิมยังอยู่ครบ · ทุกคนรู้ค่าผ่าน `GET /auth/me` `features`
   */
  FUNDRAISING_PROGRAM_ENABLED: 'fundraising.programEnabled',
} as const;
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey];

/**
 * อายุขั้นต่ำของ audit log ที่ปุ่มลบจะแตะได้ — REQ-LOG-005 · ADR-024 (คำตอบของ HST `Q-022`)
 * เจ้าของงานกำหนดว่า "90 วันเป็นค่าเริ่มต้น ปรับได้ในเมนูตั้งค่า แต่ห้ามต่ำกว่า 30 วัน"
 * ค่านี้เป็นเพดานล่างที่ทั้ง UI, การบันทึกค่า และตอนอ่านค่าไปใช้ ต้องบังคับเหมือนกัน
 */
export const AUDIT_LOG_RETENTION_MIN_DAYS = 30;
export const AUDIT_LOG_RETENTION_DEFAULT_DAYS = 90;
/** 10 ปี — กันพิมพ์ผิดจนปุ่มลบไม่มีวันทำงาน ไม่ใช่ข้อกำหนดจากเอกสาร */
export const AUDIT_LOG_RETENTION_MAX_DAYS = 3650;

/** ค่าเริ่มต้นของ `general.pageLoadingScreen` — API (ยังไม่รัน `0010` / อ่านไม่ได้) และเว็บ (API รุ่นเก่าไม่ส่ง `uiPreferences`) ใช้ตัวเดียวกัน */
export const PAGE_LOADING_SCREEN_DEFAULT = true;

/** การแสดงผลของ CMS ที่ผู้ใช้ทุกคนได้จาก `GET /auth/me` (ไม่ต้องมีสิทธิ์เมนูตั้งค่า) — SV-ADR-055 */
export interface UiPreferences {
  pageLoadingScreen: boolean;
}

/**
 * ค่าของ `fundraising.programEnabled` เมื่อ**ยังไม่มีแถว** (ยังไม่รัน `0030` — `funds.program_id` ยัง NOT NULL) = เปิด = พฤติกรรมก่อนมีสวิตช์ (SV-ADR-090)
 * ค่าเริ่มต้นของ site ใหม่ (`false`) อยู่ใน `0030` / install SQL — ไม่ใช่ค่านี้
 */
export const PROGRAM_LAYER_FALLBACK_ENABLED = true;

/**
 * ฟีเจอร์ที่องค์กรเปิด/ปิดได้ในเมนูตั้งค่า (Feature Configuration — แยกจากสิทธิ์ผู้ใช้ · ต้องผ่านทั้งคู่) · ทุกคนที่ login ได้จาก `GET /auth/me` — SV-ADR-090
 * หน้าเว็บใช้ซ่อนเมนู/ช่อง แต่ **API ตรวจซ้ำเสมอ**
 */
export interface SystemFeatures {
  /** ชั้นโปรแกรม (`fundraising.programEnabled`) */
  programEnabled: boolean;
}

export const SESSION_IDLE_DEFAULT_MINUTES = 30;
export const SESSION_CHECK_INTERVAL_DEFAULT_SECONDS = 60;
/** เพดานระยะเวลาล็อกบัญชีเมื่อ deployment ไม่ได้ override — REQ-AUTH-013 */
export const SECURITY_LOCKOUT_MAX_MINUTES_DEFAULT = 15;

/**
 * ขอบเขตของค่าตั้งค่าที่เป็นตัวเลข — **แหล่งความจริงเดียว** ที่ทั้ง API และ web ใช้ร่วมกัน
 *
 * ค่าของ `auditLogRetentionDays` มาจากเจ้าของงานโดยตรง (ADR-024)
 * ส่วนอีก 3 ตัวยังเป็น assumption ที่รอคำตอบใน `Q-019` — เอกสารไม่ได้ระบุช่วงไว้
 * แต่ปล่อยว่างไม่ได้ เช่น `maxLoginAttempts = 0` จะล็อกทุกคนออกตั้งแต่ login ครั้งแรก
 */
export const SETTING_NUMBER_BOUNDS: Readonly<Record<string, { min: number; max: number }>> = {
  [SettingKey.SECURITY_MAX_LOGIN_ATTEMPTS]: { min: 1, max: 10 },
  [SettingKey.SECURITY_LOCKOUT_MINUTES]: { min: 1, max: SECURITY_LOCKOUT_MAX_MINUTES_DEFAULT },
  // Assumption Q-056 — ห้าม 0 เพราะจะทำให้ทุก session หมดทันที
  [SettingKey.SECURITY_SESSION_IDLE_MINUTES]: { min: 1, max: 1440 },
  // Assumption Q-056 — ถี่กว่า 10 วินาทีเพิ่มโหลด DB โดยไม่ช่วย UX อย่างมีนัยสำคัญ
  [SettingKey.SECURITY_SESSION_CHECK_INTERVAL_SECONDS]: { min: 10, max: 600 },
  [SettingKey.SECURITY_AUDIT_LOG_RETENTION_DAYS]: {
    min: AUDIT_LOG_RETENTION_MIN_DAYS,
    max: AUDIT_LOG_RETENTION_MAX_DAYS,
  },
  [SettingKey.MAIL_PORT]: { min: 1, max: 65535 },
  // เพดานบน 100 MB เป็นค่าที่ตั้งไว้ก่อน รอเจ้าของงานยืนยัน (`Q-028`)
  [SettingKey.S3_MAX_UPLOAD_SIZE_MB]: { min: 1, max: 100 },
  // SV-ADR-043 — 12 หลักพอสำหรับเลขลำดับใด ๆ ที่ใช้จริง · 0 ไม่ได้ (รหัสต้องมีเลขอย่างน้อย 1 หลัก)
  [SettingKey.DONOR_CODE_DIGITS]: { min: 1, max: 12 },
  // SV-CR-004 ข้อ 2.4 — เลขลำดับของที่ระลึก/ออเดอร์ใช้ช่วงเดียวกับรหัสผู้บริจาค
  [SettingKey.SOUVENIR_CODE_DIGITS]: { min: 1, max: 12 },
  [SettingKey.ORDER_NO_DIGITS]: { min: 1, max: 12 },
  // SV-CR-005 ข้อ 3.2 — เลขที่รายการบริจาคใช้ช่วงเดียวกับเลขที่ออเดอร์
  [SettingKey.DONATION_NO_DIGITS]: { min: 1, max: 12 },
  // SV-ADR-051 — สติ๊กเกอร์ฉลากยา/พัสดุที่เครื่องพิมพ์ความร้อนทั่วไปรองรับ 20–200 mm · ขอบในไม่เกิน 10 mm (ดวง 50 mm ยังมีที่พิมพ์)
  [SettingKey.ORDER_LABEL_WIDTH_MM]: { min: 20, max: 200 },
  [SettingKey.ORDER_LABEL_HEIGHT_MM]: { min: 20, max: 200 },
  [SettingKey.ORDER_LABEL_MARGIN_MM]: { min: 0, max: 10 },
};

/**
 * กฎของค่าตั้งค่าที่เป็นข้อความ — **แหล่งความจริงเดียว** ของ API (ปฏิเสธตอนบันทึก) และหน้าเว็บ (ตรวจก่อนส่ง) · SV-ADR-036
 * `maxChars` นับตัวอักษรแบบที่คนเห็น (`countChars`) — สระ/วรรณยุกต์ไทยไม่นับแยกตัว · ค่าถูก trim ก่อนตรวจและก่อนเก็บ
 * + เพดาน code point = `maxChars × MAX_CODE_POINTS_PER_CHAR` — กันเครื่องหมายกำกับซ้อนนับพันตัวใน "ตัวอักษรเดียว"
 *   (ผ่านกฎตัวอักษรแต่ยาวเป็น KB · ล้นหัวหน้า login — review ของ `T-065`)
 */
export interface SettingStringRule {
  required: boolean;
  maxChars: number;
  /** รูปแบบที่ค่าต้องตรง (ทั้งค่า · หลัง trim) — ไม่ตรง = `INVALID_FORMAT` (เช่นคำนำหน้ารหัสผู้บริจาค · `T-072`) */
  pattern?: RegExp;
  /** ค่าที่รับได้ทั้งชุด (dropdown · เช่นผู้ให้บริการ SMS) — ไม่อยู่ในชุด = `INVALID_FORMAT` (`T-074`) */
  allowedValues?: readonly string[];
  /**
   * ข้อความหลายบรรทัด (textarea — ข้อความ consent · ข้อความปิดสมัคร · `T-074`): ขึ้นบรรทัดใหม่ (`\n`) ได้ · `\r\n` / `\r` ถูกแปลงเป็น `\n`
   * (`normalizeSettingString`) · อักขระควบคุมอื่นยังห้ามเหมือนเดิม
   */
  multiline?: boolean;
}

/** สี `#RRGGBB` (สีสถานะออเดอร์ · SV-ADR-075 · สีเลขที่ · SV-ADR-078 · สีสถานะรายการบริจาค · SV-ADR-080) — บังคับ · ตัวพิมพ์เล็ก/ใหญ่ได้ · ไม่ตรง = `INVALID_FORMAT` */
const HEX_COLOR_RULE: SettingStringRule = { required: true, maxChars: 7, pattern: /^#[0-9A-Fa-f]{6}$/ };

export const SETTING_STRING_RULES: Readonly<Record<string, SettingStringRule>> = {
  [SettingKey.GENERAL_SYSTEM_NAME_TH]: { required: true, maxChars: 100 },
  [SettingKey.GENERAL_SYSTEM_NAME_EN]: { required: true, maxChars: 100 },
  // กรอบไอคอน 36–40 px รับตัวอักษรตัวหนาได้ราว 3 ตัว
  [SettingKey.GENERAL_SYSTEM_SHORT_NAME]: { required: true, maxChars: 3 },
  // REQ-SET-031 · SV-ADR-043 — ว่างได้ (รหัสเป็นเลขล้วน) · ตัวอักษรอังกฤษ/ตัวเลข/ขีด/ขีดล่างเท่านั้น
  // (รหัสถูกพิมพ์ ค้นหา และอ่านออกเสียง — ห้ามช่องว่าง/อักขระพิเศษ/ภาษาไทย)
  [SettingKey.DONOR_CODE_PREFIX]: { required: false, maxChars: 10, pattern: /^[A-Za-z0-9_-]*$/ },
  // REQ-SET-035/036 · SV-ADR-046 — ผู้บริจาคเห็นข้อความเหล่านี้ตรง ๆ บนหน้า LINE OA จึงห้ามว่าง (ไม่มีค่าสำรองในโค้ด)
  [SettingKey.DONOR_SELF_REGISTRATION_DISABLED_MESSAGE_TH]: { required: true, maxChars: 500, multiline: true },
  [SettingKey.DONOR_SELF_REGISTRATION_DISABLED_MESSAGE_EN]: { required: true, maxChars: 500, multiline: true },
  [SettingKey.DONOR_CONSENT_TEXT_TH]: { required: true, maxChars: 5000, multiline: true },
  [SettingKey.DONOR_CONSENT_TEXT_EN]: { required: true, maxChars: 5000, multiline: true },
  // REQ-SET-037 · SV-ADR-045 — ผู้ให้บริการต้องเป็นตัวที่มี provider ฝั่ง API · ชื่อผู้ส่งว่างได้ตอนยังไม่ตั้ง (ส่งจริง = `SMS_NOT_CONFIGURED`)
  [SettingKey.SMS_PROVIDER]: { required: true, maxChars: 30, allowedValues: SMS_PROVIDERS },
  // ชื่อผู้ส่ง (sender name ที่ลงทะเบียนกับผู้ให้บริการ) — alphanumeric sender ของ SMS ยาวได้ 11 ตัว
  [SettingKey.SMS_SENDER]: { required: false, maxChars: 11, pattern: /^[A-Za-z0-9 ._-]*$/ },
  // SV-ADR-073 — TrueID / SMS Gateway ภายใน: ว่างได้ตอนยังไม่ตั้ง (ส่งจริง = `SMS_NOT_CONFIGURED`) · URL ต้องขึ้นต้น http(s):// + มี host · ไม่มีช่องว่าง
  [SettingKey.SMS_GATEWAY_URL]: { required: false, maxChars: 500, pattern: /^https?:\/\/[^\s/?#@]+(?:[/?#]\S*)?$/i },
  [SettingKey.SMS_SENDER_ID]: { required: false, maxChars: 100, pattern: /^[A-Za-z0-9._:-]*$/ },
  // SV-CR-004 ข้อ 2.4 — คำนำหน้ารหัส/เลขที่ ใช้กฎเดียวกับรหัสผู้บริจาค (พิมพ์บนใบแปะหน้า/บาร์โค้ด Code 128 → ASCII เท่านั้น)
  [SettingKey.SOUVENIR_CODE_PREFIX]: { required: false, maxChars: 10, pattern: /^[A-Za-z0-9_-]*$/ },
  [SettingKey.ORDER_NO_PREFIX]: { required: false, maxChars: 10, pattern: /^[A-Za-z0-9_-]*$/ },
  [SettingKey.DONATION_NO_PREFIX]: { required: false, maxChars: 10, pattern: /^[A-Za-z0-9_-]*$/ },
  // บรรทัดผู้ส่งบนใบแปะหน้า (SV-ADR-051) — ว่างได้ทุกช่อง (ชื่อว่าง = ใช้ชื่อระบบ) · บรรทัดเดียว (ดวงเล็ก พิมพ์ที่อยู่ผู้ส่งต่อกันบรรทัดเดียว)
  [SettingKey.ORDER_LABEL_SENDER_NAME]: { required: false, maxChars: 100 },
  [SettingKey.ORDER_LABEL_SENDER_PHONE]: { required: false, maxChars: 30 },
  [SettingKey.ORDER_LABEL_SENDER_ADDRESS]: { required: false, maxChars: 300 },
  // SV-ADR-075 — สีสถานะออเดอร์ (ค่าเสียที่แก้ตรง DB → `GET /orders/status-colors` ใช้ค่าเริ่มต้นของสถานะนั้น)
  [SettingKey.ORDER_STATUS_COLOR_DRAFT]: HEX_COLOR_RULE,
  [SettingKey.ORDER_STATUS_COLOR_CONFIRMED]: HEX_COLOR_RULE,
  [SettingKey.ORDER_STATUS_COLOR_PREPARING]: HEX_COLOR_RULE,
  [SettingKey.ORDER_STATUS_COLOR_SHIPPED]: HEX_COLOR_RULE,
  [SettingKey.ORDER_STATUS_COLOR_RECEIVED]: HEX_COLOR_RULE,
  [SettingKey.ORDER_STATUS_COLOR_CANCELLED]: HEX_COLOR_RULE,
  // SV-ADR-078 — สีเลขที่ออเดอร์ / รายการบริจาค (ค่าเสียที่แก้ตรง DB → `GET /…/ref-no-colors` ใช้ค่าเริ่มต้น)
  [SettingKey.ORDER_NO_COLOR]: HEX_COLOR_RULE,
  [SettingKey.DONATION_NO_COLOR]: HEX_COLOR_RULE,
  // SV-ADR-080 — สีสถานะรายการบริจาค (ค่าเสียที่แก้ตรง DB → `GET /donations/status-colors` ใช้ค่าเริ่มต้นของสถานะนั้น)
  [SettingKey.DONATION_STATUS_COLOR_PENDING]: HEX_COLOR_RULE,
  [SettingKey.DONATION_STATUS_COLOR_CONFIRMED]: HEX_COLOR_RULE,
  [SettingKey.DONATION_STATUS_COLOR_ORDERED]: HEX_COLOR_RULE,
  [SettingKey.DONATION_STATUS_COLOR_REJECTED]: HEX_COLOR_RULE,
};

/**
 * ค่าในหมวด `sms` ที่ผู้ให้บริการแต่ละเจ้าต้องใช้ (ลำดับ = ลำดับในฟอร์ม · ทุกตัวต้องไม่ว่างจึงส่งได้) — SV-ADR-073 · **แหล่งความจริงเดียว**:
 * API = ขาดตัวไหนบอกใน `SMS_NOT_CONFIGURED.details.missing` · หน้าเว็บ = แสดง/ส่งเฉพาะช่องของผู้ให้บริการที่เลือกใน dropdown
 * (ค่าของอีกเจ้ายังเก็บใน DB — สลับกลับแล้วใช้ได้ทันที) · เพิ่มผู้ให้บริการ = เพิ่มแถวที่นี่ (สูตร TEC-11 ข้อ 8)
 */
export const SMS_PROVIDER_SETTING_KEYS: Readonly<Record<SmsProvider, readonly string[]>> = {
  [SmsProvider.THAIBULKSMS]: [SettingKey.SMS_API_KEY, SettingKey.SMS_API_SECRET, SettingKey.SMS_SENDER],
  [SmsProvider.TRUEID]: [SettingKey.SMS_GATEWAY_URL, SettingKey.SMS_GATEWAY_AUTH, SettingKey.SMS_SENDER_ID],
};

export type SettingStringProblem = 'REQUIRED' | 'TOO_LONG' | 'INVALID_CHARACTERS' | 'INVALID_FORMAT';

/** ภาษาไทยมีได้ถึง ~3 code point ต่อตัวอักษรที่เห็น (พยัญชนะ + สระบน/ล่าง + วรรณยุกต์) — 4 เผื่อแล้ว */
export const MAX_CODE_POINTS_PER_CHAR = 4;

/** อักขระควบคุม (C0/C1) + ตัวสลับทิศทางข้อความ — ห้ามอยู่ในชื่อที่ไปโผล่ในหัวอีเมลและชื่อแท็บ */
const DISALLOWED_SETTING_CHARS = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;
/** แบบหลายบรรทัด: เหมือนข้างบนแต่ยอมให้ขึ้นบรรทัดใหม่ (`\n` = U+000A) — `\r` ถูกแปลงเป็น `\n` ก่อนตรวจแล้ว */
const DISALLOWED_MULTILINE_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

/** จำนวนตัวอักษรแบบที่คนเห็น (grapheme) — ไม่มี `Intl.Segmenter` ให้นับ code point แทน */
export function countChars(value: string): number {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    let n = 0;
    for (const _ of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)) n += 1;
    return n;
  }
  return Array.from(value).length;
}

/**
 * รูปที่เก็บของค่าข้อความที่มีกฎ — trim เสมอ · แบบหลายบรรทัดแปลง `\r\n` / `\r` เป็น `\n` ก่อน (textarea ของแต่ละ OS/ไคลเอนต์ส่งไม่เหมือนกัน)
 * API เรียกก่อนตรวจและก่อนเก็บ · หน้าเว็บเรียกก่อนตรวจ/เทียบว่าแก้แล้วหรือยัง (ตัวเดียวกัน)
 */
export function normalizeSettingString(key: string, value: string): string {
  const rule = SETTING_STRING_RULES[key];
  return (rule?.multiline ? value.replace(/\r\n?/g, '\n') : value).trim();
}

/** ตรวจค่าข้อความ (ที่ผ่าน `normalizeSettingString` แล้ว) ตาม `SETTING_STRING_RULES` — key ที่ไม่มีกฎคืน null เสมอ */
export function settingStringProblem(key: string, value: string): SettingStringProblem | null {
  const rule = SETTING_STRING_RULES[key];
  if (!rule) return null;
  if (value.length === 0) return rule.required ? 'REQUIRED' : null;
  if ((rule.multiline ? DISALLOWED_MULTILINE_CHARS : DISALLOWED_SETTING_CHARS).test(value)) return 'INVALID_CHARACTERS';
  if (Array.from(value).length > rule.maxChars * MAX_CODE_POINTS_PER_CHAR || countChars(value) > rule.maxChars) {
    return 'TOO_LONG';
  }
  if (rule.pattern && !rule.pattern.test(value)) return 'INVALID_FORMAT';
  if (rule.allowedValues && !rule.allowedValues.includes(value)) return 'INVALID_FORMAT';
  return null;
}

/**
 * key ที่มี endpoint จัดการเอง (SV-ADR-036) — `PATCH /settings/:group` ข้ามเงียบ ๆ (แบบ key ที่ไม่รู้จัก — REQ-SEC-021)
 * `GET /settings/:group` คืนแค่สรุปที่ไม่มีรายละเอียดภายใน · หน้าเว็บไม่วาดในฟอร์มทั่วไป
 */
export const MANAGED_SETTING_KEYS: readonly string[] = [SettingKey.GENERAL_SYSTEM_ICON];

/** บีบค่าให้อยู่ในช่วงที่รับได้ — ใช้ตอน "อ่าน" ค่าที่อาจถูกเขียนไว้ก่อนมีกฎนี้ */
export function clampSettingNumber(key: string, value: number, fallback: number): number {
  const bounds = SETTING_NUMBER_BOUNDS[key];
  if (!Number.isFinite(value)) return fallback;
  if (!bounds) return value;
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

/** key ของ LINE ต่อ channel — เช่น lineSettingKey('MAIN', 'channelSecret') → 'line.main.channelSecret' */
export function lineSettingKey(
  channel: LineChannel,
  field: LineSettingField,
): string {
  return `line.${channel.toLowerCase()}.${field}`;
}

/**
 * ค่าต่อ channel — FT-11 §1 · seed ทุกแถวต่อ channel (ลำดับ = ลำดับช่องในการ์ด LINE ของหน้าตั้งค่า)
 * - Messaging API 4 ค่า (REQ-SET-002 · baseline) — Chat / webhook
 * - LINE Login + LIFF 2 ค่า (`REQ-SET-033/034` · `SV-CR-003` · `0007`) — หน้า LINE OA ของผู้บริจาค: `loginChannelId` = `aud` ของ ID token
 *   ที่ API ตรวจกับ LINE · `liffId` = LIFF app ของ channel (endpoint `<เว็บ>/liff/<channel>`) — ไม่แตะ 4 ค่าแรก (Chat ไม่กระทบ)
 */
export const LINE_SETTING_FIELDS = [
  'channelId',
  'channelSecret',
  'channelAccessToken',
  'basicId',
  'loginChannelId',
  'liffId',
] as const;
export type LineSettingField = (typeof LINE_SETTING_FIELDS)[number];

