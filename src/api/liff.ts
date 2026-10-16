import type { LineChannel } from '../enums/line';
import type { DonorAddressView, DonorRegistrationChannel, DonorStatus } from './donors';

/**
 * หน้า LINE OA ของผู้บริจาค (LIFF) — `SV-CR-003` ข้อ 2 · FT-14 `REQ-DNL-*` · SV-ADR-044/045/046 · `T-074`
 * ค่าคงที่ / enum / รูปร่างคำขอ-คำตอบที่ API (`/liff/:channel/*`) และหน้าเว็บ LIFF (`T-075`) ใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/**
 * header ที่หน้า LIFF แนบ LINE ID token (`liff.getIDToken()`) มาทุกคำขอ — แบบ HST (`REQ-SEC-030`)
 * ⚠️ ตัวพิมพ์เล็กเพราะ Node เก็บ header เป็นตัวเล็ก (`req.headers[LINE_ID_TOKEN_HEADER]`) · CORS อนุญาต header นี้ใน `main.ts`
 */
export const LINE_ID_TOKEN_HEADER = 'x-line-id-token';

/** ตัวตนจาก LINE ID token หลัง API ตรวจกับ LINE แล้วเท่านั้น — ห้ามรับ userId จาก body/query แทน (พอร์ตจาก HST) */
export interface VerifiedLineIdentity {
  channel: LineChannel;
  /** `sub` ของ ID token — userId ของ LINE (คนละ provider = คนละค่า) */
  lineUserId: string;
  /** claim `name` / `picture` (scope `profile`) — ไม่มี scope = `null` */
  displayName: string | null;
  pictureUrl: string | null;
}

/**
 * ค่าที่หน้า LIFF ต้องรู้ **ก่อน** `liff.init()` (`GET /liff/:channel/config` · public — ยังไม่มี ID token)
 * - `liffId` เปิดเผยอยู่แล้วใน URL `https://liff.line.me/<liffId>` · ยังไม่ได้ตั้งในเมนูตั้งค่า = `null` (หน้าเว็บแจ้งให้ตั้ง)
 * - `mock` = API รันกับ LINE OA Simulator (`LINE_API_MOCK_URL`) → หน้าเว็บรับ token จาก `#sim_id_token=` แทน LIFF SDK ·
 *   production เป็น `true` ไม่ได้ (API ไม่บูตถ้าตั้ง mock — SV-ADR-040/044)
 */
export interface LiffConfigView {
  liffId: string | null;
  mock: boolean;
}

/** สถานะของ LINE user คนนี้ต่อผู้บริจาค (`GET /liff/:channel/donor/me`) — หน้าเว็บเลือกหน้าจากค่านี้ (`SV-CR-003` ข้อ 2.1) */
export const DonorLiffState = {
  /** ยังไม่ผูกกับผู้บริจาคใด → หน้าผูกบัญชี */
  NOT_LINKED: 'NOT_LINKED',
  /** ผูกแล้ว (สร้างเองผ่าน LINE OA) แต่ยังไม่กรอกฟอร์มสมัคร (`full_name` ว่าง) → หน้าสมัคร */
  REGISTRATION_REQUIRED: 'REGISTRATION_REQUIRED',
  /** ผูกแล้ว ข้อมูลครบ ปกติ → หน้า profile */
  ACTIVE: 'ACTIVE',
  /** ผูกแล้วแต่ถูกระงับ → การ์ด "บัญชีถูกระงับ · ติดต่อเจ้าหน้าที่" (endpoint อื่นของผู้บริจาคตอบ `DONOR_SUSPENDED`) */
  SUSPENDED: 'SUSPENDED',
} as const;
export type DonorLiffState = (typeof DonorLiffState)[keyof typeof DonorLiffState];

/**
 * ผลของการตรวจเบอร์หลัง OTP ผ่าน (`POST …/otp/verify`) — SV-ADR-046
 * ได้ `verificationToken` เฉพาะ `LINK_EXISTING` / `REGISTER_NEW` (กรณีที่จะเก็บข้อมูลจริง → ขอ consent ต่อ)
 */
export const DonorLinkOutcome = {
  /** พบเบอร์ · ยังไม่ผูก · ปกติ → consent → ผูก LINE กับผู้บริจาคนั้น */
  LINK_EXISTING: 'LINK_EXISTING',
  /** ไม่พบเบอร์ · เปิดสมัครเอง → consent → สร้างผู้บริจาค `SELF` (ชื่อว่าง) → หน้าสมัคร */
  REGISTER_NEW: 'REGISTER_NEW',
  /** ไม่พบเบอร์ · ปิดสมัครเอง → ข้อความจากเมนูตั้งค่า (`message`) */
  SELF_REGISTRATION_DISABLED: 'SELF_REGISTRATION_DISABLED',
  /** พบเบอร์แต่ผูกกับ LINE บัญชีอื่นแล้ว → ติดต่อเจ้าหน้าที่ */
  PHONE_LINKED_TO_ANOTHER_LINE: 'PHONE_LINKED_TO_ANOTHER_LINE',
  /** พบเบอร์แต่ผู้บริจาคถูกระงับ → ติดต่อเจ้าหน้าที่ */
  DONOR_SUSPENDED: 'DONOR_SUSPENDED',
} as const;
export type DonorLinkOutcome = (typeof DonorLinkOutcome)[keyof typeof DonorLinkOutcome];

/** outcome ที่ไปต่อได้ (ได้ `verificationToken` · ขอ consent) */
export const DONOR_LINKABLE_OUTCOMES: readonly DonorLinkOutcome[] = [
  DonorLinkOutcome.LINK_EXISTING,
  DonorLinkOutcome.REGISTER_NEW,
];

/** ภาษาของข้อความที่ API เลือกให้ (SMS · consent · ข้อความปิดสมัคร) — ไม่ส่ง = `th` */
export const LIFF_LOCALES = ['th', 'en'] as const;
export type LiffLocale = (typeof LIFF_LOCALES)[number];

/**
 * ค่าคงที่ของ OTP ทาง SMS (SV-ADR-045 — ไม่ใช่ค่าตั้งค่า เหมือน OTP ลืมรหัสผ่าน) · หน้าเว็บใช้นับถอยหลัง/จำกัดช่องกรอก
 * API ตอบเวลาจริงมาด้วยเสมอ (`expiresAt` · `resendAvailableAt` · `retryAfterSeconds`) — หน้าเว็บอย่าคำนวณเองจากค่าข้างล่างอย่างเดียว
 */
export const DONOR_OTP_LENGTH = 6;
export const DONOR_OTP_TTL_SECONDS = 300;
export const DONOR_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const DONOR_OTP_MAX_ATTEMPTS = 5;
/** อายุของ `verificationToken` หลัง OTP ผ่าน — ต้องกด "ยอมรับ" consent ภายในเวลานี้ */
export const DONOR_VERIFICATION_TTL_SECONDS = 900;
/** รหัสอ้างอิงใน SMS + บนหน้าจอ (ผู้ใช้จับคู่ได้ว่า SMS ไหนของรอบนี้) */
export const DONOR_OTP_REF_CODE_LENGTH = 4;
/** OTP = ตัวเลข 6 หลักพอดี */
export const DONOR_OTP_PATTERN = /^\d{6}$/;

/** body ของ `POST /liff/:channel/donor/otp` — เบอร์มือถือไทย (`06`/`08`/`09` · รับ `+66`) */
export interface DonorOtpRequestInput {
  phone: string;
  /** ภาษาของข้อความ SMS (ไม่ส่ง = `th`) */
  locale?: LiffLocale;
}

/** คำตอบของ `POST …/donor/otp` — `requestId` ใช้ยืนยันในขั้นถัดไป · เวลาเป็น ISO (UTC) */
export interface DonorOtpRequestView {
  requestId: string;
  refCode: string;
  expiresAt: string;
  resendAvailableAt: string;
}

/** body ของ `POST …/donor/otp/verify` */
export interface DonorOtpVerifyInput {
  requestId: string;
  code: string;
  /** ภาษาของ `message` (กรณีปิดสมัครเอง) */
  locale?: LiffLocale;
}

/**
 * คำตอบของ `POST …/donor/otp/verify` (OTP ผ่านแล้วเท่านั้น — ผิด/หมดอายุ/ใช้แล้ว = 422 `DONOR_OTP_INVALID` ข้อความกลาง)
 * - `verificationToken` มีเฉพาะ outcome ที่ไปต่อได้ (`DONOR_LINKABLE_OUTCOMES`) · ใช้ครั้งเดียว · อายุ `DONOR_VERIFICATION_TTL_SECONDS`
 * - `message` มีเฉพาะ `SELF_REGISTRATION_DISABLED` (ข้อความจากเมนูตั้งค่าตามภาษา)
 */
export interface DonorOtpVerifyView {
  outcome: DonorLinkOutcome;
  verificationToken?: string;
  verificationExpiresAt?: string;
  message?: string;
}

/** `GET …/donor/consent?locale=` — ข้อความจากเมนูตั้งค่า (th/en) + SHA-256 ของข้อความ (ส่งกลับตอนยอมรับ เพื่อยืนยันว่าเห็นฉบับเดียวกัน) */
export interface DonorConsentView {
  locale: LiffLocale;
  text: string;
  sha256: string;
}

/**
 * body ของ `POST …/donor/link` — ยอมรับ consent แล้วผูก/สร้าง
 * `consentSha256` (ไม่บังคับ · ควรส่ง) = SHA-256 ของข้อความที่ผู้ใช้เห็น → ผู้ดูแลแก้ข้อความระหว่างนั้น = 409 `DONOR_CONSENT_OUTDATED` (โหลดใหม่)
 */
export interface DonorLinkInput {
  verificationToken: string;
  acceptConsent: true;
  locale?: LiffLocale;
  consentSha256?: string;
}

/** คำตอบของ `POST …/donor/link` — `outcome` = สิ่งที่ทำจริง (ประเมินใหม่ใต้ล็อก อาจต่างจากตอน verify ได้ระหว่าง `LINK_EXISTING` ↔ `REGISTER_NEW`) */
export interface DonorLinkView {
  outcome: Extract<DonorLinkOutcome, 'LINK_EXISTING' | 'REGISTER_NEW'>;
  state: DonorLiffState;
}

/**
 * body ของ `POST …/donor/registration` (เฉพาะ state `REGISTRATION_REQUIRED`) — ที่อยู่แบบฟอร์มเท่านั้น (`STRUCTURED` — ไม่มีแบบข้อความ)
 * กฎความยาว/รูปแบบเดียวกับฟอร์มของ CMS (`DONOR_*_MAX_LENGTH` ใน `./donors`) · error 422 ลงช่อง (`details.field` = `fullName` · `address.<ช่อง>`)
 * บังคับเฉพาะชื่อ (`SV-CR-003` ข้อ 2.4 ติด * ช่องเดียว · `T-074` ตัดสิน) · ที่อยู่ไม่ส่ง/`null`/ว่างทุกช่อง = ไม่มีที่อยู่ ·
 * กรอกบางช่อง = ต้องครบ `addressLine` + `subdistrictId` (แบบฟอร์มของ CMS) · `lineId`/`email` = `''` → ไม่มีค่า
 */
export interface DonorRegistrationInput {
  fullName: string;
  lineId?: string;
  email?: string;
  address?: {
    addressLine?: string;
    subdistrictId?: string;
    /** ว่าง/ไม่ส่ง = รหัสไปรษณีย์ของตำบล */
    postcode?: string;
  } | null;
}

/** ข้อมูลผู้บริจาคที่หน้า profile ของ LIFF แสดง — ไม่มี id ภายใน / LINE userId / ยอดบริจาค */
export interface DonorLiffProfileView {
  donorCode: string;
  /** `null` = ยังไม่กรอกฟอร์มสมัคร */
  fullName: string | null;
  /** ตัวเลขล้วนขึ้นต้น 0 */
  phone: string;
  /** รูปแสดงผลแบบมีขีด (`formatThaiPhone`) */
  phoneFormatted: string;
  email: string | null;
  lineId: string | null;
  status: DonorStatus;
  registrationChannel: DonorRegistrationChannel;
  address: DonorAddressView | null;
}

/** `GET …/donor/me` — `donor` มีเมื่อผูกแล้ว (ทุก state ยกเว้น `NOT_LINKED`) · `line` จาก ID token เสมอ */
export interface DonorLiffMeView {
  state: DonorLiffState;
  donor: DonorLiffProfileView | null;
  line: { displayName: string | null; pictureUrl: string | null };
}
