import type { DonationActorView } from './donations';
import { formatThaiPhone, normalizeThaiPhone } from './donors';

/**
 * ช่องทางติดต่อ (e-Donation · กลุ่มเมนู "จัดการเนื้อหา") — `SV-CR-009` ข้อ 3 · FT-20 `REQ-CNT-*` · SV-ADR-094
 * `T-136` (สัญญานี้ + API `/contact-channels` + `/liff/:channel/contact-channels`) · `T-137` (เว็บ list/ฟอร์ม/หน้า LIFF `contacts`)
 * กฎตรวจค่าตามประเภท · href · ค่าแสดง ใช้ตัวเดียวกันทั้ง API และฟอร์มเว็บ — ห้ามเขียน regex ซ้ำฝั่งใดฝั่งหนึ่ง
 */

/** ประเภท — ลำดับ = ลำดับใน dropdown ของฟอร์ม · เก็บใน `contact_channels.type` VARCHAR(20) */
export const ContactChannelType = {
  PHONE: 'PHONE',
  EMAIL: 'EMAIL',
  WEBSITE: 'WEBSITE',
  LINE: 'LINE',
  FACEBOOK: 'FACEBOOK',
  ADDRESS: 'ADDRESS',
  OTHER: 'OTHER',
} as const;
export type ContactChannelType = (typeof ContactChannelType)[keyof typeof ContactChannelType];
export const CONTACT_CHANNEL_TYPES = Object.values(ContactChannelType) as readonly ContactChannelType[];

/** ชุดไอคอนพื้นฐาน 12 แบบ (หน้าเว็บวาดเอง — ไม่ใช่ไฟล์) · `icon_key` = `null` → ตามประเภท (`CONTACT_TYPE_DEFAULT_ICON`) */
export const ContactIconKey = {
  PHONE: 'phone',
  MOBILE: 'mobile',
  HOTLINE: 'hotline',
  EMAIL: 'email',
  WEBSITE: 'website',
  LINE: 'line',
  FACEBOOK: 'facebook',
  LOCATION: 'location',
  CLOCK: 'clock',
  CHAT: 'chat',
  BUILDING: 'building',
  INFO: 'info',
} as const;
export type ContactIconKey = (typeof ContactIconKey)[keyof typeof ContactIconKey];
export const CONTACT_ICON_KEYS = Object.values(ContactIconKey) as readonly ContactIconKey[];

/** ไอคอนเมื่อเลือก "ตามประเภท" (`iconKey = null`) */
export const CONTACT_TYPE_DEFAULT_ICON: Readonly<Record<ContactChannelType, ContactIconKey>> = {
  PHONE: ContactIconKey.PHONE,
  EMAIL: ContactIconKey.EMAIL,
  WEBSITE: ContactIconKey.WEBSITE,
  LINE: ContactIconKey.LINE,
  FACEBOOK: ContactIconKey.FACEBOOK,
  ADDRESS: ContactIconKey.LOCATION,
  OTHER: ContactIconKey.INFO,
};

export function isContactChannelType(value: unknown): value is ContactChannelType {
  return typeof value === 'string' && (CONTACT_CHANNEL_TYPES as readonly string[]).includes(value);
}

export function isContactIconKey(value: unknown): value is ContactIconKey {
  return typeof value === 'string' && (CONTACT_ICON_KEYS as readonly string[]).includes(value);
}

/** ไอคอนพื้นฐานที่ใช้จริง — ค่าที่เก็บไม่รู้จัก/`null` = ตามประเภท (รูปที่อัปโหลด `iconUrl` มาก่อนเสมอ — หน้าเว็บตัดสิน) */
export function resolveContactIconKey(type: ContactChannelType, iconKey: string | null | undefined): ContactIconKey {
  return isContactIconKey(iconKey) ? iconKey : CONTACT_TYPE_DEFAULT_ICON[type] ?? ContactIconKey.INFO;
}

// ── ความยาว / เพดาน (ตรงกับคอลัมน์ใน `0032_contact_channels.sql`) ───────────────────────────────────────

export const CONTACT_LABEL_MAX_LENGTH = 100;
export const CONTACT_VALUE_MAX_LENGTH = 500;
/** ต่อ (เบอร์ภายใน) — ตัวเลขล้วน 1–10 หลัก · เฉพาะ `PHONE` */
export const CONTACT_PHONE_EXT_MAX_LENGTH = 10;
export const CONTACT_PHONE_EXT_PATTERN = new RegExp(`^\\d{1,${CONTACT_PHONE_EXT_MAX_LENGTH}}$`);
export const CONTACT_URL_MAX_LENGTH = 500;
export const CONTACT_NOTE_MAX_LENGTH = 500;
/** จำนวนช่องทาง (ที่ยังไม่ลบ) สูงสุด — เกิน → 422 `CONTACT_CHANNELS_LIMIT { max }` (list ไม่แบ่งหน้า) */
export const CONTACT_CHANNELS_MAX = 50;
/** ประเภทที่มีช่อง "ต่อ" / ช่องลิงก์ประกอบ (`url` · ลิงก์แผนที่ของที่อยู่) — ประเภทอื่นส่งค่ามา = 422 `NOT_ALLOWED` */
export const CONTACT_TYPES_WITH_PHONE_EXT: readonly ContactChannelType[] = [ContactChannelType.PHONE];
export const CONTACT_TYPES_WITH_URL: readonly ContactChannelType[] = [ContactChannelType.ADDRESS, ContactChannelType.OTHER];

// ── ไอคอนที่อัปโหลด ──────────────────────────────────────────────────────────────────────────────────────

/** ย่อเป็นจัตุรัส 128×128 แบบ contain พื้นโปร่ง (PNG) ผ่าน sharp — **ไม่รับ SVG** (ตรวจชนิดจากเนื้อไฟล์) */
export const CONTACT_ICON_PX = 128;
export const CONTACT_ICON_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** ขนาดภาพต้นฉบับต่อด้านที่รับ — นอกช่วง = 422 `IMAGE_DIMENSIONS_INVALID` · ขนาดไฟล์สูงสุด = `s3.maxUploadSizeMb` (413 `FILE_TOO_LARGE`) */
export const CONTACT_ICON_SOURCE_MIN_PX = 16;
export const CONTACT_ICON_SOURCE_MAX_PX = 8000;
/** `icon_version` = hex 8 ตัว สุ่มใหม่ทุกครั้งที่อัปโหลด → URL `?v=` เปลี่ยน (แบบรูปของที่ระลึก) */
export const CONTACT_ICON_VERSION_LENGTH = 8;
/** path ของ route proxy บน origin ของเว็บ (`sv-web/src/app/contact-icon/[file]/route.ts`) — `[file]` = id ช่องทาง */
export const CONTACT_ICON_PATH = '/contact-icon/';

/** URL ไอคอนที่อัปโหลดบน origin ของเว็บ (`<img src>` ทั้ง CMS และหน้า LIFF) */
export function contactIconUrl(id: string, version: string): string {
  return `${CONTACT_ICON_PATH}${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`;
}

// ── ตรวจค่าตามประเภท ──────────────────────────────────────────────────────────────────────────────────────

/** อักขระจัดรูปแบบที่พิมพ์ปนเบอร์ได้ — ตัดทิ้งก่อนตรวจ */
const PHONE_FORMAT_CHARS = /[\s\-().]/g;
/** สายด่วน 4 หลัก (`1669` · `1111`) */
const HOTLINE_SHORT = /^1\d{3}$/;
/** โทรฟรี/เสียค่าบริการ `1800` / `1900` + 6 หลัก */
const HOTLINE_LONG = /^1[89]00\d{6}$/;
/** ต่างประเทศ `+<รหัสประเทศ><เลข>` 6–15 หลัก (E.164 · รหัสประเทศไม่ขึ้นต้น 0) — `+66` ต้องเป็นเบอร์ไทยที่ถูกต้องเท่านั้น */
const INTERNATIONAL = /^\+[1-9]\d{5,14}$/;
/** อีเมล — รูปแบบเดียวกับ `<input type="email">` (WHATWG HTML) */
const EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
/** http(s) เท่านั้น — ส่วน host ห้ามมี `@` (กัน `https://good@evil`) · ห้ามมีช่องว่าง · `javascript:` / `data:` / scheme อื่น = ไม่ผ่าน */
const HTTP_URL = /^https?:\/\/[^\s/?#@\\]+(?:[/?#]\S*)?$/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
/** ลิงก์ของ LINE — `https://line.me/…` (รวม subdomain `page.line.me` `liff.line.me`) · `https://lin.ee/…` */
const LINE_URL = /^https:\/\/(?:(?:[a-z0-9-]+\.)*line\.me|lin\.ee)(?:[/?#]\S*)?$/i;
/** LINE ID ทั่วไป / basic ID ของ OA (`@abc1234`) — ตัวอักษรอังกฤษ ตัวเลข `.` `_` `-` · ไม่มีช่องว่าง */
const LINE_ID = /^[A-Za-z0-9._-]{1,50}$/;

/**
 * เบอร์ของช่องทาง `PHONE` → รูปที่เก็บ · ไม่รับ → `null`
 * ตัดช่องว่าง/ขีด/จุด/วงเล็บ · `+66` → `0` (`normalizeThaiPhone` ของผู้บริจาค) · รับ `0` + 8–9 หลัก · สายด่วน `1xxx` · `1800/1900xxxxxx` · ต่างประเทศ `+…`
 */
export function normalizeContactPhone(input: string): string | null {
  const value = input.trim().replace(PHONE_FORMAT_CHARS, '');
  if (value === '') return null;
  const thai = normalizeThaiPhone(value);
  if (thai) return thai;
  if (value.startsWith('+66')) return null;
  if (HOTLINE_SHORT.test(value) || HOTLINE_LONG.test(value) || INTERNATIONAL.test(value)) return value;
  return null;
}

/** รูปแสดงของเบอร์ — ไทย = `formatThaiPhone` (`02-123-4567`) · `1800-123-456` · สายด่วน 4 หลัก/ต่างประเทศ = ตามเดิม · normalize ไม่ได้ = ค่าเดิม */
export function formatContactPhone(input: string): string {
  const phone = normalizeContactPhone(input);
  if (!phone) return input;
  if (phone.startsWith('0')) return formatThaiPhone(phone);
  if (HOTLINE_LONG.test(phone)) return `${phone.slice(0, 4)}-${phone.slice(4, 7)}-${phone.slice(7)}`;
  return phone;
}

export function isContactEmail(value: string): boolean {
  return value.length <= CONTACT_VALUE_MAX_LENGTH && EMAIL.test(value);
}

/** ลิงก์ http(s) ที่เปิดได้ปลอดภัย (ใช้กับ `WEBSITE` · `FACEBOOK` · ช่อง `url`) */
export function isContactHttpUrl(value: string): boolean {
  return value.length <= CONTACT_URL_MAX_LENGTH && HTTP_URL.test(value) && !CONTROL_CHARS.test(value);
}

/** ค่าของช่องทาง `LINE`: ลิงก์ (`line.me` / `lin.ee`) · `@id` · LINE ID — ไม่ใช่ทั้ง 3 = `null` */
export function lineContactKind(value: string): 'URL' | 'OA_ID' | 'LINE_ID' | null {
  if (LINE_URL.test(value) && !CONTROL_CHARS.test(value)) return 'URL';
  if (value.startsWith('@') && LINE_ID.test(value.slice(1))) return 'OA_ID';
  if (LINE_ID.test(value)) return 'LINE_ID';
  return null;
}

/** ช่องของฟอร์มที่ผิดได้ — `details.field` ของ 422 `VALIDATION_FAILED` */
export type ContactChannelField = 'type' | 'label' | 'value' | 'phoneExt' | 'url' | 'note' | 'iconKey';
/** สาเหตุ — `details.reason` ของ 422 `VALIDATION_FAILED` (หน้าเว็บแปลเป็นข้อความต่อช่อง) */
export const ContactChannelProblem = {
  REQUIRED: 'REQUIRED',
  TOO_LONG: 'TOO_LONG',
  INVALID_FORMAT: 'INVALID_FORMAT',
  /** ส่งค่าในช่องที่ประเภทนี้ไม่มี (`phoneExt` ของประเภทอื่นนอกจาก `PHONE` · `url` ของประเภทอื่นนอกจาก `ADDRESS`/`OTHER`) */
  NOT_ALLOWED: 'NOT_ALLOWED',
} as const;
export type ContactChannelProblem = (typeof ContactChannelProblem)[keyof typeof ContactChannelProblem];

export interface ContactChannelFieldError {
  field: ContactChannelField;
  reason: ContactChannelProblem;
}

/** ค่าที่ตรวจ/จัดรูปแล้ว — รูปที่ API เก็บลง DB */
export interface ContactChannelValues {
  type: ContactChannelType;
  label: string;
  value: string;
  phoneExt: string | null;
  url: string | null;
  note: string | null;
}

/** ช่องข้อความของฟอร์ม (`''` / ช่องว่างล้วน / `null` = ไม่มีค่า) */
export interface ContactChannelValuesInput {
  type: string;
  label?: string | null;
  value?: string | null;
  phoneExt?: string | null;
  url?: string | null;
  note?: string | null;
}

export type ContactChannelCheck = { ok: true; values: ContactChannelValues } | { ok: false; errors: ContactChannelFieldError[] };

function text(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

/**
 * ตรวจ + จัดรูปค่าทั้งชุดตามประเภท (`SV-CR-009` ข้อ 3) — คืน error ทุกช่อง (ฟอร์มเว็บแสดงต่อช่อง · API ตอบ 422 ช่องแรก)
 * `PHONE` เก็บเบอร์ normalize · `EMAIL` อีเมล · `WEBSITE`/`FACEBOOK` http(s) · `LINE` ลิงก์ line.me/lin.ee · `@id` · LINE ID ·
 * `ADDRESS`/`OTHER` ข้อความ (หลายบรรทัดได้) + `url` ไม่บังคับ (http(s)) · `phoneExt` เฉพาะ `PHONE`
 */
export function checkContactChannelValues(input: ContactChannelValuesInput): ContactChannelCheck {
  const errors: ContactChannelFieldError[] = [];
  if (!isContactChannelType(input.type)) return { ok: false, errors: [{ field: 'type', reason: ContactChannelProblem.INVALID_FORMAT }] };
  const type = input.type;
  const label = text(input.label);
  let value = text(input.value);
  const phoneExtRaw = text(input.phoneExt);
  const url = text(input.url);
  const note = text(input.note);

  if (!label) errors.push({ field: 'label', reason: ContactChannelProblem.REQUIRED });
  else if (label.length > CONTACT_LABEL_MAX_LENGTH) errors.push({ field: 'label', reason: ContactChannelProblem.TOO_LONG });

  if (!value) errors.push({ field: 'value', reason: ContactChannelProblem.REQUIRED });
  else if (value.length > CONTACT_VALUE_MAX_LENGTH) errors.push({ field: 'value', reason: ContactChannelProblem.TOO_LONG });
  else {
    let valid = true;
    if (type === ContactChannelType.PHONE) {
      const phone = normalizeContactPhone(value);
      valid = phone !== null;
      if (phone) value = phone;
    } else if (type === ContactChannelType.EMAIL) valid = isContactEmail(value);
    else if (type === ContactChannelType.WEBSITE || type === ContactChannelType.FACEBOOK) valid = isContactHttpUrl(value);
    else if (type === ContactChannelType.LINE) valid = lineContactKind(value) !== null;
    if (!valid) errors.push({ field: 'value', reason: ContactChannelProblem.INVALID_FORMAT });
  }

  const phoneExt = phoneExtRaw.replace(/\s/g, '');
  if (phoneExt) {
    if (!CONTACT_TYPES_WITH_PHONE_EXT.includes(type)) errors.push({ field: 'phoneExt', reason: ContactChannelProblem.NOT_ALLOWED });
    else if (!CONTACT_PHONE_EXT_PATTERN.test(phoneExt)) errors.push({ field: 'phoneExt', reason: ContactChannelProblem.INVALID_FORMAT });
  }

  if (url) {
    if (!CONTACT_TYPES_WITH_URL.includes(type)) errors.push({ field: 'url', reason: ContactChannelProblem.NOT_ALLOWED });
    else if (url.length > CONTACT_URL_MAX_LENGTH) errors.push({ field: 'url', reason: ContactChannelProblem.TOO_LONG });
    else if (!isContactHttpUrl(url)) errors.push({ field: 'url', reason: ContactChannelProblem.INVALID_FORMAT });
  }

  if (note.length > CONTACT_NOTE_MAX_LENGTH) errors.push({ field: 'note', reason: ContactChannelProblem.TOO_LONG });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, values: { type, label, value, phoneExt: phoneExt || null, url: url || null, note: note || null } };
}

// ── href + ค่าแสดง ──────────────────────────────────────────────────────────────────────────────────────

export interface ContactChannelLinkInput {
  type: ContactChannelType;
  value: string;
  phoneExt?: string | null;
  url?: string | null;
}

/**
 * ลิงก์เมื่อแตะ — `tel:<เลข>[,<ต่อ>]` · `mailto:` · URL ของเว็บ/Facebook/LINE · LINE `@id` → `https://line.me/R/ti/p/%40id` ·
 * LINE ID → `https://line.me/ti/p/~id` · ที่อยู่/อื่น ๆ → `url` หรือ `null` · ค่าที่ไม่ผ่านกฎ (ข้อมูลเก่า) = `null` (ไม่ทำลิงก์ที่ไม่ปลอดภัย)
 */
export function contactChannelHref(channel: ContactChannelLinkInput): string | null {
  const value = channel.value.trim();
  switch (channel.type) {
    case ContactChannelType.PHONE: {
      const phone = normalizeContactPhone(value);
      if (!phone) return null;
      const ext = (channel.phoneExt ?? '').trim();
      return CONTACT_PHONE_EXT_PATTERN.test(ext) ? `tel:${phone},${ext}` : `tel:${phone}`;
    }
    case ContactChannelType.EMAIL:
      return isContactEmail(value) ? `mailto:${value}` : null;
    case ContactChannelType.WEBSITE:
    case ContactChannelType.FACEBOOK:
      return isContactHttpUrl(value) ? value : null;
    case ContactChannelType.LINE: {
      const kind = lineContactKind(value);
      if (kind === 'URL') return value;
      if (kind === 'OA_ID') return `https://line.me/R/ti/p/${encodeURIComponent(value)}`;
      if (kind === 'LINE_ID') return `https://line.me/ti/p/~${encodeURIComponent(value)}`;
      return null;
    }
    default: {
      const url = (channel.url ?? '').trim();
      return url && isContactHttpUrl(url) ? url : null;
    }
  }
}

/** ค่าหลักที่แสดง (ไม่รวม "ต่อ") — `PHONE` จัดรูปเบอร์ · อื่น ๆ ตามที่เก็บ */
export function formatContactValue(type: ContactChannelType, value: string): string {
  return type === ContactChannelType.PHONE ? formatContactPhone(value) : value;
}

/**
 * ค่าแสดงเต็ม — เบอร์จัดรูป + `<extLabel> <ต่อ>` (`02-123-4567 ต่อ 123`) · `extLabel` มาจาก i18n ของผู้เรียก (ไม่ hardcode ภาษา)
 * หน้า LIFF ได้ `LiffContactChannelView.displayValue` (= `formatContactValue`) + `phoneExt` แยก แล้วประกอบด้วยฟังก์ชันนี้
 */
export function contactChannelDisplayValue(channel: Omit<ContactChannelLinkInput, 'url'>, extLabel: string): string {
  const main = formatContactValue(channel.type, channel.value);
  const ext = channel.type === ContactChannelType.PHONE ? (channel.phoneExt ?? '').trim() : '';
  return ext ? `${main} ${extLabel} ${ext}` : main;
}

// ── view / input ────────────────────────────────────────────────────────────────────────────────────────

/** แถวของ `GET /contact-channels` · `GET /contact-channels/:id` — snapshot ของ audit ด้วย (ไม่มี object key ของไอคอน) */
export interface ContactChannelView {
  id: string;
  type: ContactChannelType;
  /** หัวข้อ (เช่น "สายด่วนรับบริจาค") */
  label: string;
  /** เบอร์ (normalize) · อีเมล · URL · LINE (`@id` / ID / ลิงก์) · ข้อความ */
  value: string;
  phoneExt: string | null;
  /** ลิงก์ประกอบของ `ADDRESS` (แผนที่) / `OTHER` */
  url: string | null;
  note: string | null;
  /** ไอคอนพื้นฐานที่เลือก — `null` = ตามประเภท (`resolveContactIconKey`) */
  iconKey: ContactIconKey | null;
  /** ไอคอนที่อัปโหลด (`contactIconUrl`) — มี = ใช้ก่อน `iconKey` · `null` = ไม่มี */
  iconUrl: string | null;
  /** `false` = ซ่อนจากหน้า LINE OA ชั่วคราว (ไม่ต้องลบ) */
  isActive: boolean;
  /** ลำดับ 1..n (ค่าเท่ากันเรียงตาม id) */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
}

/**
 * body ของ `POST /contact-channels` — ต่อท้ายลำดับ · ครบ `CONTACT_CHANNELS_MAX` → 422 `CONTACT_CHANNELS_LIMIT { max }` ·
 * ค่าผิดกฎตามประเภท → 422 `VALIDATION_FAILED { field, reason }` (`checkContactChannelValues`)
 */
export interface ContactChannelCreateInput {
  type: ContactChannelType;
  label: string;
  value: string;
  phoneExt?: string | null;
  url?: string | null;
  note?: string | null;
  iconKey?: ContactIconKey | null;
  /** ไม่ส่ง = `true` */
  isActive?: boolean;
}

/**
 * body ของ `PATCH /contact-channels/:id` — ส่งเฉพาะช่องที่แก้ (`''`/`null` = ล้างช่องที่ไม่บังคับ) · ตรวจทั้งชุดหลังรวมค่าเดิม ·
 * เปลี่ยนประเภทแล้วไม่ส่ง `phoneExt`/`url` = ค่าเดิมที่ประเภทใหม่ไม่มีถูกล้างให้ · แสดง/ซ่อน = `{ isActive }`
 */
export type ContactChannelUpdateInput = Partial<ContactChannelCreateInput>;

/** body ของ `PUT /contact-channels/order` — id ของทุกแถวที่ยังไม่ลบ ครบพอดี ไม่ซ้ำ (ลำดับใหม่) · ไม่ตรง → 422 `CONTACT_CHANNEL_ORDER_INVALID` */
export interface ContactChannelOrderInput {
  ids: string[];
}

/** `details.reason` ของ `CONTACT_CHANNEL_ORDER_INVALID` — `DUPLICATE` id ซ้ำ · `MISMATCH` ขาด/เกิน/ไม่มีอยู่/ถูกลบ */
export type ContactChannelOrderProblem = 'DUPLICATE' | 'MISMATCH';

/** 1 แถวของ `GET /liff/:channel/contact-channels` — เฉพาะที่แสดง (`isActive`) · ไม่มีผู้สร้าง/เวลา */
export interface LiffContactChannelView {
  id: string;
  type: ContactChannelType;
  label: string;
  value: string;
  /** `formatContactValue` (เบอร์จัดรูป · ไม่รวม "ต่อ" — ประกอบด้วย `contactChannelDisplayValue(view, t(…))`) */
  displayValue: string;
  phoneExt: string | null;
  url: string | null;
  note: string | null;
  /** `contactChannelHref` — `null` = ไม่มีลิงก์ (แสดงเป็นข้อความ + ปุ่มคัดลอก) */
  href: string | null;
  /** resolve แล้ว (ไม่เป็น `null`) */
  iconKey: ContactIconKey;
  iconUrl: string | null;
}
