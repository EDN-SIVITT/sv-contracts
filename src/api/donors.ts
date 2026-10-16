import { formatSequenceCode } from './sequence-code';

/**
 * ผู้บริจาค (e-Donation) — `SV-CR-003` ข้อ 1 · `REQ-DNR-*` · SV-ADR-043 · `T-072`
 * enum / view / ตัวช่วยที่ API (`/donors`) และหน้าเว็บ (ฟอร์ม · list · view) ใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/** สถานะบัญชี — `SUSPENDED` = ใช้หน้า LINE OA ไม่ได้ (`SV-CR-003` ข้อ 2.5) */
export const DonorStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type DonorStatus = (typeof DonorStatus)[keyof typeof DonorStatus];

/** สถานะ LINE — **ไม่เก็บเป็นคอลัมน์** คำนวณจาก `line_user_id` (มี = `LINKED`) · ผูกได้จากหน้า LINE OA เท่านั้น */
export const DonorLineStatus = {
  LINKED: 'LINKED',
  UNLINKED: 'UNLINKED',
} as const;
export type DonorLineStatus = (typeof DonorLineStatus)[keyof typeof DonorLineStatus];

/** ช่องทางการสมัคร — `STAFF` สร้างใน CMS / นำเข้า · `SELF` สมัครเองผ่าน LINE OA (`T-074`) */
export const DonorRegistrationChannel = {
  STAFF: 'STAFF',
  SELF: 'SELF',
} as const;
export type DonorRegistrationChannel = (typeof DonorRegistrationChannel)[keyof typeof DonorRegistrationChannel];

/** รูปแบบที่อยู่จัดส่งของที่ระลึก — `TEXT` ข้อความล้วน (ข้อมูลเดิม/นำเข้า) · `STRUCTURED` ที่อยู่ + ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ */
export const DonorAddressFormat = {
  TEXT: 'TEXT',
  STRUCTURED: 'STRUCTURED',
} as const;
export type DonorAddressFormat = (typeof DonorAddressFormat)[keyof typeof DonorAddressFormat];

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0006_donors.sql` (DOM-04) */
export const DONOR_FULL_NAME_MAX_LENGTH = 200;
export const DONOR_EMAIL_MAX_LENGTH = 255;
export const DONOR_LINE_ID_MAX_LENGTH = 100;
export const DONOR_ADDRESS_LINE_MAX_LENGTH = 500;
export const DONOR_ADDRESS_TEXT_MAX_LENGTH = 1000;
/** ช่องเบอร์โทรรับตัวอักษรจัดรูปแบบได้ (`+66 81-234-5678`) — ยาวสุดก่อน normalize */
export const DONOR_PHONE_INPUT_MAX_LENGTH = 30;

/** LINE ID ที่ผู้บริจาคตั้งเองใน LINE — ห้ามมีช่องว่าง (คนละอย่างกับ LINE userId ที่ได้จากการผูก) */
export const DONOR_LINE_ID_PATTERN = /^\S+$/;

/**
 * รหัสผู้บริจาค = `prefix + เลขลำดับเติม 0 ซ้ายให้ครบ N หลัก` (ขั้นต่ำ N หลัก — เกินแล้วยาวขึ้นได้)
 * prefix / N มาจากเมนูตั้งค่า (`donor.codePrefix` · `donor.codeDigits` — REQ-SET-031/032) ค่าด้านล่างเป็นค่าสำรองเมื่อ DB ยังไม่มีแถว
 * เลขลำดับมาจาก `running_numbers` แถว `DONOR_RUNNING_NUMBER_KEY` · ออกครั้งเดียวตอนสร้าง ไม่คำนวณใหม่เมื่อแก้ตั้งค่า
 */
export const DONOR_CODE_PREFIX_DEFAULT = 'DNR';
export const DONOR_CODE_DIGITS_DEFAULT = 6;
export const DONOR_RUNNING_NUMBER_KEY = 'donor';
// กฎของค่าตั้งค่า (คำนำหน้า 0–10 ตัว `A–Z a–z 0–9 - _` · จำนวนหลัก 1–12) อยู่ที่ `SETTING_STRING_RULES` / `SETTING_NUMBER_BOUNDS`
// ใน `./settings.ts` — แหล่งเดียวที่ API ใช้ปฏิเสธและหน้าเว็บใช้ตรวจ/แสดงคำอธิบาย

/** `formatDonorCode('DNR', 6, 12)` → `DNR000012` · เลขยาวกว่า N หลักไม่ถูกตัด (`DNR1234567`) — alias ของ `formatSequenceCode` กลาง (`T-077`) */
export function formatDonorCode(prefix: string, digits: number, n: number): string {
  return formatSequenceCode(prefix, digits, n);
}

/** อักขระจัดรูปแบบที่ผู้ใช้พิมพ์ปนเบอร์ได้ — ตัดทิ้งก่อนเทียบ */
const PHONE_FORMAT_CHARS = /[\s\-().]/g;
/** เบอร์ไทยหลัง normalize: ขึ้นต้น 0 ตามด้วยตัวเลข 8–9 หลัก (บ้าน 9 · มือถือ 10) */
const THAI_PHONE_NORMALIZED = /^0\d{8,9}$/;
/** มือถือไทย 06/08/09 + 8 หลัก — ผูก LINE ด้วย OTP ทาง SMS ได้เฉพาะเบอร์นี้ (`T-074` · กัน SMS ต่างประเทศ) */
const THAI_MOBILE = /^0[689]\d{8}$/;

/**
 * เบอร์โทรไทย → ตัวเลขล้วนขึ้นต้น 0 (รูปที่เก็บใน DB และใช้จับคู่ตอนผูก LINE) · ไม่ใช่เบอร์ไทยที่รับได้ → `null`
 * `+66 81-234-5678` · `66812345678` · `(081) 234.5678` · `+66 (0) 81 234 5678` → `0812345678`
 * ใช้ตัวเดียวกันทั้ง API และฟอร์มเว็บ (SV-ADR-043 ข้อ 2)
 */
export function normalizeThaiPhone(input: string): string | null {
  let value = input.trim().replace(PHONE_FORMAT_CHARS, '');
  let international = false;
  if (value.startsWith('+')) {
    if (!value.startsWith('+66')) return null;
    value = value.slice(3);
    international = true;
  } else if (value.startsWith('66')) {
    value = value.slice(2);
    international = true;
  }
  if (!/^\d+$/.test(value)) return null;
  if (international && !value.startsWith('0')) value = `0${value}`;
  return THAI_PHONE_NORMALIZED.test(value) ? value : null;
}

/** มือถือไทยหรือไม่ (รับทั้งรูปที่ normalize แล้วและรูปที่ผู้ใช้พิมพ์) */
export function isThaiMobilePhone(input: string): boolean {
  const phone = normalizeThaiPhone(input);
  return phone !== null && THAI_MOBILE.test(phone);
}

/**
 * รูปแสดงผลแบบมีขีด — มือถือ `081-234-5678` · กรุงเทพฯ `02-123-4567` · ต่างจังหวัด `053-123-456`
 * ค่าที่ normalize ไม่ได้คืนตามเดิม (ข้อมูลเก่าที่ผิดรูปยังอ่านได้)
 */
export function formatThaiPhone(input: string): string {
  const phone = normalizeThaiPhone(input);
  if (!phone) return input;
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  if (phone.startsWith('02')) return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}

/**
 * ที่อยู่จัดส่งที่ส่งเข้า API (`POST`/`PATCH /donors` · ช่อง `address`) — บันทึกเฉพาะรูปแบบที่เลือก (ช่องของอีกแบบถูกล้าง)
 * - `TEXT`: `text` (ว่าง = ไม่มีที่อยู่)
 * - `STRUCTURED`: `addressLine` + `subdistrictId` (API หาอำเภอ/จังหวัดเอง) · `postcode` ว่าง = ใช้ของตำบล ·
 *   `districtId`/`provinceId` ส่งมาได้เพื่อตรวจว่าตรงกับตำบล · ไม่กรอกอะไรเลย = ไม่มีที่อยู่
 * - `address: null` = ล้างที่อยู่ · ไม่ส่ง key = ไม่แตะที่อยู่เดิม (PATCH)
 */
export interface DonorAddressInput {
  format: DonorAddressFormat;
  text?: string;
  addressLine?: string;
  subdistrictId?: string;
  districtId?: string;
  provinceId?: string;
  postcode?: string;
}

/** body ของ `POST /donors` — `PATCH /donors/:id` = ทุกช่องไม่บังคับ (ส่งเฉพาะช่องที่แก้ · `''` = ล้างค่าของช่องที่ไม่บังคับ) */
export interface DonorCreateInput {
  fullName: string;
  phone: string;
  email?: string;
  lineId?: string;
  status?: DonorStatus;
  address?: DonorAddressInput | null;
}

/** ที่อยู่ที่ส่งออก — ชื่อพื้นที่ th/en มาด้วยเพื่อให้ list/view ไม่ต้องยิงซ้ำ · `format = TEXT` มีแค่ `text` */
export interface DonorAddressView {
  format: DonorAddressFormat;
  text: string | null;
  addressLine: string | null;
  subdistrictId: string | null;
  subdistrictNameTh: string | null;
  subdistrictNameEn: string | null;
  districtId: string | null;
  districtNameTh: string | null;
  districtNameEn: string | null;
  provinceId: string | null;
  provinceNameTh: string | null;
  provinceNameEn: string | null;
  postcode: string | null;
}

/** แถวในหน้า list (`GET /donors`) */
export interface DonorListItemView {
  id: string;
  donorCode: string;
  /** `null` = ผู้บริจาคที่สมัครเองแต่ยังไม่กรอกฟอร์มสมัคร (แสดง "รอผู้บริจาคกรอกข้อมูล") */
  fullName: string | null;
  /** ตัวเลขล้วนขึ้นต้น 0 — แสดงด้วย `formatThaiPhone()` */
  phone: string;
  email: string | null;
  lineId: string | null;
  status: DonorStatus;
  lineStatus: DonorLineStatus;
  registrationChannel: DonorRegistrationChannel;
  /** ชื่อ/รูปโปรไฟล์ LINE ล่าสุดของบัญชีที่ผูก · ยังไม่ผูก = `null` */
  lineDisplayName: string | null;
  linePictureUrl: string | null;
  address: DonorAddressView | null;
  donationCount: number;
  /** DECIMAL(15,2) เป็นข้อความ (`"0.00"`) — กันทศนิยมเพี้ยน · เว็บแสดง `1,234.00` */
  donationTotal: string;
  createdAt: string;
  updatedAt: string;
}

/** หน้า view (`GET /donors/:id`) */
export interface DonorView extends DonorListItemView {
  lineUserId: string | null;
  lineLinkedAt: string | null;
  /** เวลายอมรับ consent ครั้งล่าสุด (`donor_consents` · ยอมรับตอนผูก/สมัครผ่านหน้า LINE OA — `T-074`) · ยังไม่เคย = `null` */
  latestConsentAt: string | null;
}

/** body ของ `PATCH /donors/:id/line-unlink` — รหัส 6 หลักที่หน้าเว็บสุ่มแสดง + ที่ผู้ใช้พิมพ์ (แบบ `ConfirmCodeDialog` · HST) */
export interface DonorLineUnlinkInput {
  displayedCode: string;
  confirmationCode: string;
}
