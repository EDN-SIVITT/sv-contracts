import type { DonorStatus } from './donors';
import { parseMoneyToSatang } from './money';
import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_ITEM_NOTE_MAX_LENGTH,
  type OrderRecipientInput,
  type OrderRecipientView,
  type OrderStatus,
} from './orders';
import type { ApiListResponse } from './response';
import { formatSequenceCode } from './sequence-code';
import { SettingKey } from './settings';
import type { SouvenirStatus } from './souvenirs';

/**
 * รายการบริจาค + งบของที่ระลึกตามยอด (e-Donation) — `SV-CR-005` ข้อ 3 · `REQ-DNT-*` · FT-17 · SV-ADR-053
 * `T-084` (สัญญากลางนี้) · `T-086` (API `/donations`) · `T-087` (เว็บ `/donations/**`)
 * enum / view / input / ค่าคงที่ที่ API และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 * เงินทุกช่อง (`amount` · `unitValue` · `lineTotal` · `souvenirTotalValue` · `souvenirTotalThreshold`) = DECIMAL(12,2) เป็นข้อความ `"1234.50"` · คำนวณด้วยสตางค์ (`./money.ts`)
 */

/**
 * สถานะ — `PENDING` รอการยืนยัน · `CONFIRMED` ยืนยัน (นับเข้ายอดสะสมผู้บริจาค) · `ORDERED` ออกออเดอร์แล้ว (`T-108` · SV-ADR-072 —
 * ส่งข้อมูลไปสร้างออเดอร์แล้ว · ยังนับเข้ายอดสะสม · **ดูได้อย่างเดียว** ทำได้แค่ "ยกเลิกออเดอร์") · `REJECTED` ปฏิเสธ (เหตุผลบังคับ)
 * ลำดับ key = ลำดับแท็บ/ตัวเลือกบนหน้าเว็บ · ฟอร์มตั้งได้เฉพาะ `DONATION_FORM_STATUSES`
 */
export const DonationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ORDERED: 'ORDERED',
  REJECTED: 'REJECTED',
} as const;
export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];

/** สถานะที่ฟอร์ม (`POST`/`PATCH /donations`) ตั้งได้ — `ORDERED` ได้จากปุ่ม "ออกออเดอร์" เท่านั้น (ส่งมา → 422 `VALIDATION_FAILED` `{ field: 'status', reason: 'ORDER_ACTION_ONLY' }`) */
export const DONATION_FORM_STATUSES: readonly DonationStatus[] = [DonationStatus.PENDING, DonationStatus.CONFIRMED, DonationStatus.REJECTED];
/** สถานะที่นับเข้ายอดบริจาคสะสมของผู้บริจาค (`donors.donation_count` / `donation_total`) — ออกออเดอร์แล้วยอดสะสมต้องไม่ลด */
export const DONATION_COUNTED_STATUSES: readonly DonationStatus[] = [DonationStatus.CONFIRMED, DonationStatus.ORDERED];
/** สถานะอ่านอย่างเดียว — `PATCH` · `DELETE` · อัปโหลด/ลบสลิป → 409 `DONATION_NOT_EDITABLE` (ยกเลิกออเดอร์ก่อน) */
export const DONATION_LOCKED_STATUSES: readonly DonationStatus[] = [DonationStatus.ORDERED];

/** `isDonationLocked('ORDERED')` → `true` — หน้าเว็บซ่อนปุ่มแก้ไข/ลบ/สลิป · API ตอบ 409 */
export function isDonationLocked(status: DonationStatus): boolean {
  return DONATION_LOCKED_STATUSES.includes(status);
}

/**
 * ยอดชำระที่ยืนยันแล้ว = บัญชีรายรับ (SV-ADR-081 · `T-119`) — สถานะที่ "ช่องการเงิน" (`DonationPaymentField`) แก้ไม่ได้:
 * `PATCH` ที่ทำให้ช่องเหล่านี้**เปลี่ยนจริง** (ส่งค่าเดิม = ไม่ error) · เพิ่ม/ลบไฟล์หลักฐาน · `DELETE` → 409 `DONATION_PAYMENT_LOCKED` `{ status, fields }`
 * (`ORDERED` ตอบ `DONATION_NOT_EDITABLE` ก่อนตามเดิม) · ทางย้อนทางเดียว = ปุ่ม "ยกเลิกการยืนยัน" (`unconfirm` · donations FULL) · ของ/ผู้รับ/หมายเหตุยังแก้ได้
 */
export const DONATION_PAYMENT_LOCKED_STATUSES: readonly DonationStatus[] = [DonationStatus.CONFIRMED, DonationStatus.ORDERED];

/** `isDonationPaymentLocked('CONFIRMED')` → `true` — หน้าเว็บแสดงส่วนชำระเงินแบบอ่านอย่างเดียว + ป้าย "ยืนยันรับชำระแล้ว" · ซ่อนปุ่มลบ/สลิป */
export function isDonationPaymentLocked(status: DonationStatus): boolean {
  return DONATION_PAYMENT_LOCKED_STATUSES.includes(status);
}

/** ช่องการเงินของรายการบริจาค (ชื่อ = ช่องใน body/view) — `slipFiles` = ไฟล์หลักฐาน (`POST`/`DELETE /donations/:id/slips`) · `details.fields` ของ `DONATION_PAYMENT_LOCKED` */
export const DonationPaymentField = {
  AMOUNT: 'amount',
  DONATION_DATE: 'donationDate',
  DONOR_ID: 'donorId',
  SLIP_NOTE: 'slipNote',
  SLIP_FILES: 'slipFiles',
} as const;
export type DonationPaymentField = (typeof DonationPaymentField)[keyof typeof DonationPaymentField];

/** `details` ของ 409 `DONATION_PAYMENT_LOCKED` — `fields` = ช่องการเงินที่พยายามเปลี่ยน (ลบรายการ = `[]`) */
export interface DonationPaymentLockedDetails {
  status: DonationStatus;
  fields: DonationPaymentField[];
}

/** ช่องทางที่สร้างรายการ — `STAFF` เจ้าหน้าที่บันทึก (รอบนี้) · `LINE_OA` ผู้บริจาคแจ้งเองผ่าน LINE OA (จองค่าไว้รอบหน้า · Q-050) */
export const DonationSource = {
  STAFF: 'STAFF',
  LINE_OA: 'LINE_OA',
} as const;
export type DonationSource = (typeof DonationSource)[keyof typeof DonationSource];

/**
 * วงจรสถานะผ่านปุ่ม (ไม่รวมฟอร์มแก้ไข — `PATCH` ตั้ง PENDING/CONFIRMED/REJECTED ได้เมื่อเป็น PENDING/REJECTED · CONFIRMED ส่งได้แค่ค่าเดิม
 * (อื่น → 409 `DONATION_STATUS_INVALID` · SV-ADR-081) · `ORDERED` แก้ไม่ได้)
 * PENDING → CONFIRMED/REJECTED (ยืนยัน/ปฏิเสธ) · CONFIRMED → ORDERED (ออกออเดอร์) / PENDING (ยกเลิกการยืนยัน · FULL · เหตุผลบังคับ · `T-119`) ·
 * ORDERED → CONFIRMED (ยกเลิกออเดอร์ — จากเมนูไหนก็ได้)
 * แต่ละปุ่มเริ่มได้จากสถานะเดียว (`DONATION_ACTION_TRANSITIONS`) · ไม่ตรง → 409 `DONATION_STATUS_INVALID` details `{ from, to }`
 */
export const DONATION_STATUS_TRANSITIONS: Readonly<Record<DonationStatus, readonly DonationStatus[]>> = {
  PENDING: [DonationStatus.CONFIRMED, DonationStatus.REJECTED],
  CONFIRMED: [DonationStatus.ORDERED, DonationStatus.PENDING],
  ORDERED: [DonationStatus.CONFIRMED],
  REJECTED: [],
};

/** `canTransitionDonation('CONFIRMED', 'REJECTED')` → `false` (ฟอร์มแก้ไขของ PENDING/REJECTED ไม่ถูกจำกัด) */
export function canTransitionDonation(from: DonationStatus, to: DonationStatus): boolean {
  return DONATION_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * ปุ่มของรายการบริจาค → สถานะต้นทาง/ปลายทาง — API ตรวจ `from` ใต้ล็อก · หน้าเว็บเลือกปุ่มจากตารางเดียวกันนี้
 * `confirm` `reject` = `POST /donations/:id/confirm|reject` · `order` = `POST /donations/:id/order` · `cancelOrder` = `POST /donations/:id/cancel-order` ·
 * `unconfirm` = `POST /donations/:id/unconfirm` (`T-119` · SV-ADR-081 · donations FULL · ต้องไม่มีออเดอร์ active)
 */
export const DONATION_ACTION_TRANSITIONS = {
  confirm: { from: DonationStatus.PENDING, to: DonationStatus.CONFIRMED },
  reject: { from: DonationStatus.PENDING, to: DonationStatus.REJECTED },
  unconfirm: { from: DonationStatus.CONFIRMED, to: DonationStatus.PENDING },
  order: { from: DonationStatus.CONFIRMED, to: DonationStatus.ORDERED },
  cancelOrder: { from: DonationStatus.ORDERED, to: DonationStatus.CONFIRMED },
} as const satisfies Record<string, { from: DonationStatus; to: DonationStatus }>;
export type DonationStatusAction = keyof typeof DONATION_ACTION_TRANSITIONS;

/** `canDonationAction('CONFIRMED', 'order')` → `true` */
export function canDonationAction(status: DonationStatus, action: DonationStatusAction): boolean {
  return DONATION_ACTION_TRANSITIONS[action].from === status;
}

/**
 * สีต่อสถานะ (SV-ADR-080 · `T-118` · `REQ-SET-052`) — ตั้งค่าได้ในเมนู ตั้งค่า → รายการบริจาค (4 key หมวด `donation` · `#RRGGBB` ตาม `SETTING_STRING_RULES`) ·
 * แบบเดียวกับสีสถานะออเดอร์ (`ORDER_STATUS_COLOR_KEYS` · SV-ADR-075): badge = จุดสี + พื้นสีจาง + ตัวอักษรสีปกติของธีม · แท็บที่เลือก = เส้นใต้ + ตัวเลขสีสถานะ ·
 * อ่านผ่าน `GET /donations/status-colors` (สิทธิ์รายการบริจาค READ_ONLY · ค่าเสีย/ว่าง = ค่าเริ่มต้น)
 */
export const DONATION_STATUS_COLOR_KEYS: Readonly<Record<DonationStatus, SettingKey>> = {
  PENDING: SettingKey.DONATION_STATUS_COLOR_PENDING,
  CONFIRMED: SettingKey.DONATION_STATUS_COLOR_CONFIRMED,
  ORDERED: SettingKey.DONATION_STATUS_COLOR_ORDERED,
  REJECTED: SettingKey.DONATION_STATUS_COLOR_REJECTED,
};

/**
 * ค่าเริ่มต้น (= seed `0026`) — ใช้เมื่อแถวหาย/ค่าเสีย · หน้าเว็บที่ผู้ใช้ไม่มีสิทธิ์รายการบริจาค · ปุ่ม "คืนค่าเริ่มต้น" ·
 * = สี token ของธีมที่ badge ใช้ก่อน `T-118` (หน้าตาเดิมไม่เปลี่ยน): รอการยืนยัน `--color-warning` · ยืนยัน `--color-success` · ออกออเดอร์แล้ว `--color-brand` · ปฏิเสธ `--color-danger`
 */
export const DONATION_STATUS_COLOR_DEFAULTS: Readonly<DonationStatusColors> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#16A34A',
  ORDERED: '#2563EB',
  REJECTED: '#DC2626',
};

/** response ของ `GET /donations/status-colors` — `#RRGGBB` ตัวพิมพ์ใหญ่ครบทุกสถานะ */
export type DonationStatusColors = Record<DonationStatus, string>;

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0009_donations.sql` (DOM-04) */
export const DONATION_NOTE_MAX_LENGTH = 1000;
/** บังคับเมื่อ `REJECTED` (422 `DONATION_REJECT_REASON_REQUIRED`) · สถานะอื่น API ล้างเป็น `null` */
export const DONATION_REJECT_REASON_MAX_LENGTH = 500;
/** หมายเหตุของหลักฐานการโอน (`slip_note` · `0016`) — ไม่มีรูปสลิปก็ระบุเหตุผลได้ · เกิน → 422 `VALIDATION_FAILED` `{ field: 'slipNote', reason: 'TOO_LONG', max }` */
export const DONATION_SLIP_NOTE_MAX_LENGTH = 500;
/** หมายเหตุต่อแถวของที่ระลึก — เท่ากับของออเดอร์ (`order_items.note` · โครงสร้างเดียวกับออเดอร์ · SV-ADR-065) */
export const DONATION_ITEM_NOTE_MAX_LENGTH = ORDER_ITEM_NOTE_MAX_LENGTH;
/** ยอดบริจาค > 0 ถึงค่านี้ · ทศนิยม ≤ 2 (DECIMAL(12,2)) — เทียบด้วย `parseMoneyToSatang` */
export const DONATION_AMOUNT_MAX = '99999999.99';
/** ของที่ระลึก ≤ 50 แถว/รายการ (0 แถวก็บันทึกได้) · จำนวนต่อแถว 1–9,999 */
export const DONATION_ITEMS_MAX = 50;
export const DONATION_ITEM_QTY_MAX = 9999;

/**
 * เลขที่รายการบริจาค = `prefix + เลขลำดับเติม 0` (`donation.noPrefix` · `donation.noDigits` — REQ-SET-046/047) · ค่าด้านล่างเป็นค่าสำรองเมื่อ DB ยังไม่มีแถว
 * เลขลำดับจาก `running_numbers` แถว `DONATION_RUNNING_NUMBER_KEY` · ออกตอนสร้าง · unique รวมแถวที่ลบแล้ว · แก้ไม่ได้
 */
export const DONATION_NO_PREFIX_DEFAULT = 'DON';
export const DONATION_NO_DIGITS_DEFAULT = 6;
export const DONATION_RUNNING_NUMBER_KEY = 'donation';

/** `formatDonationNo('DON', 6, 1)` → `DON000001` — alias ของ `formatSequenceCode` */
export function formatDonationNo(prefix: string, digits: number, n: number): string {
  return formatSequenceCode(prefix, digits, n);
}

// ── สลิป / หลักฐานการโอน (หลายไฟล์ · รูปหรือ PDF · ไม่บังคับ · ใช้ร่วมกับออเดอร์ — SV-ADR-076 · `T-112`) ─────────────────

/** ขนาดที่เก็บของไฟล์รูป (WebP ผ่าน `sharp` · ไม่ขยายรูปที่เล็กกว่า) — `thumb` 320 px (กริด/list) · `full` 2000 px (อ่านตัวเลขบนสลิปได้) · PDF มีแค่ `full` */
export const DonationSlipSize = {
  THUMB: 'thumb',
  FULL: 'full',
} as const;
export type DonationSlipSize = (typeof DonationSlipSize)[keyof typeof DonationSlipSize];
export const DONATION_SLIP_SIZES = Object.values(DonationSlipSize) as readonly DonationSlipSize[];
export const DONATION_SLIP_MAX_PX: Readonly<Record<DonationSlipSize, number>> = { thumb: 320, full: 2000 };
/** ชนิดรูปที่รับ (ตรวจจากเนื้อไฟล์ด้วย sharp) → แปลงเป็น WebP 2 ขนาด */
export const DONATION_SLIP_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** `version` ของไฟล์ = hex 8 ตัว สุ่มต่อไฟล์ → URL `?v=` / ETag (แบบ `SOUVENIR_IMAGE_VERSION_LENGTH`) */
export const DONATION_SLIP_VERSION_LENGTH = 8;

/** ชนิดไฟล์หลักฐานการโอน — `IMAGE` = รูป (WebP 2 ขนาด · ภาพย่อ + lightbox) · `PDF` = เก็บไฟล์เดิม (ไอคอน · เปิดแท็บใหม่ · ไม่มี `thumb`) */
export const SlipFileKind = {
  IMAGE: 'IMAGE',
  PDF: 'PDF',
} as const;
export type SlipFileKind = (typeof SlipFileKind)[keyof typeof SlipFileKind];
/** MIME ของ PDF — ตรวจจริงจากหัวไฟล์ `%PDF-` (ไม่เชื่อนามสกุล/MIME ที่เบราว์เซอร์ส่ง) */
export const PAYMENT_SLIP_PDF_MIME = 'application/pdf';
/** ชนิดไฟล์ที่รับ (รายการบริจาค) — อื่นจากนี้/อ่านไม่ได้/เกิน `s3.maxUploadSizeMb` → 422 `DONATION_SLIP_INVALID` (ออเดอร์อัปโหลดเองไม่ได้ — คัดลอกจากรายการบริจาค · `T-117`) */
export const PAYMENT_SLIP_MIME_TYPES = [...DONATION_SLIP_MIME_TYPES, PAYMENT_SLIP_PDF_MIME] as const;
/** ไฟล์หลักฐานการโอนสูงสุดต่อรายการ/ออเดอร์ — ใบที่เกิน → 422 `reason: 'TOO_MANY'` `details { max }` (นับใต้ล็อกแถวแม่) */
export const PAYMENT_SLIP_FILES_MAX = 10;

/**
 * ไฟล์หลักฐานการโอน 1 ไฟล์ (`donation_slip_files` / `order_slip_files` · `0023`) — เรียง `sort_order, id` (ตามลำดับอัปโหลด) · ไม่มี storage key
 * URL หน้าเว็บ: `/donation-slip/[id]/[fileId]/[size]?v=<version>` · `/order-slip/…` (`size` = `thumb` เฉพาะรูป · `full` ทุกชนิด)
 */
export interface PaymentSlipFileView {
  id: string;
  kind: SlipFileKind;
  /** ชื่อไฟล์ตอนอัปโหลด · `null` = ไฟล์ที่ย้ายมาจากสลิปเดิม (ก่อน `0023`) */
  name: string | null;
  /** ชนิดของไฟล์ที่เก็บ (`image/webp` · `application/pdf`) */
  mime: string;
  /** ขนาดไฟล์ตัวเต็ม (ไบต์) · `null` = ไม่ทราบ (ไฟล์ที่ย้ายมาจากสลิปเดิม) */
  sizeBytes: number | null;
  version: string;
  createdAt: string;
}

// ── งบของที่ระลึก (CR ข้อ 3.3 ข้อ 1) ──────────────────────────────────────────────────────────

/** 1 แถวที่ใช้คิดงบ — `unitValue` = มูลค่า/หน่วยของสินค้า (ข้อความ `"120.00"` หรือตัวเลข) */
export interface SouvenirValueLine {
  /** จำนวนเต็ม ≥ 0 — ฟอร์มที่ช่องว่างให้แปลงเป็น 0 ก่อนเรียก */
  qty: number;
  unitValue: string | number;
}

/**
 * Σ (`qty` × `unitValue`) เป็น **สตางค์** (integer ล้วน) — ตัวคูณเงินกลาง: มูลค่ารวม (ข้อมูลรอง) และเป็นแกนของ `sumSouvenirThreshold` (งบ)
 * `qty` ไม่ใช่จำนวนเต็ม ≥ 0 หรือ `unitValue` อ่านไม่ออก → RangeError (ข้อมูลผิดตั้งแต่ต้นทาง — ไม่เดาเป็น 0)
 * แสดงผล: `formatSatang(sumSouvenirValue(items))` → `"1234.50"`
 */
export function sumSouvenirValue(items: readonly SouvenirValueLine[]): number {
  let total = 0;
  for (const { qty, unitValue } of items) {
    const unit = parseMoneyToSatang(unitValue);
    if (!Number.isSafeInteger(qty) || qty < 0 || unit === null) {
      throw new RangeError(`รายการคิดมูลค่าไม่ถูกต้อง: qty=${qty} unitValue=${unitValue}`);
    }
    total += qty * unit;
  }
  if (!Number.isSafeInteger(total)) throw new RangeError(`มูลค่ารวมเกินช่วง: ${total}`);
  return total;
}

/** 1 แถวที่ใช้คิดงบ — `unitDonationThreshold` = เกณฑ์ยอดบริจาค/หน่วย (ข้อความ `"1500.00"` หรือตัวเลข) */
export interface SouvenirThresholdLine {
  /** จำนวนเต็ม ≥ 0 — ฟอร์มที่ช่องว่างให้แปลงเป็น 0 ก่อนเรียก */
  qty: number;
  unitDonationThreshold: string | number;
}

/**
 * **งบของที่ระลึก** = Σ (`qty` × เกณฑ์ยอดบริจาค/หน่วย) เป็นสตางค์ (`T-104` · SV-ADR-068 — เดิมคิดจากมูลค่า) —
 * API ตรวจ `≤ amount` (422 `DONATION_SOUVENIR_OVER_AMOUNT` · details `souvenirTotal` = ผลนี้) · หน้าเว็บวาดแถบงบ/คงเหลือ/ปิดปุ่มบันทึก
 * กฎเงิน/RangeError เดียวกับ `sumSouvenirValue` · แสดงผล: `formatSatang(sumSouvenirThreshold(items))`
 */
export function sumSouvenirThreshold(items: readonly SouvenirThresholdLine[]): number {
  return sumSouvenirValue(items.map(({ qty, unitDonationThreshold }) => ({ qty, unitValue: unitDonationThreshold })));
}

// ── โมเดล (`donations` + `donation_items` · CR ข้อ 3.2) ───────────────────────────────────────

/** ผู้ใช้ระบบ (`system_users`) ที่สร้าง/แก้/ตรวจรายการ */
export interface DonationActorView {
  id: string;
  /** `null` = ผู้ใช้ถูกลบ */
  name: string | null;
}

/** ผู้บริจาค = **join สด** จาก `donors` (ไม่ snapshot — CR ข้อ 3.2) · หน้าเว็บทำลิงก์ `/donors/[id]` */
export interface DonationDonorView {
  id: string;
  donorCode: string;
  fullName: string;
  /** ตัวเลขล้วนขึ้นต้น 0 — แสดงด้วย `formatThaiPhone()` */
  phone: string;
  /** badge เตือนเมื่อ `SUSPENDED` */
  status: DonorStatus;
  /** ผู้บริจาคถูกลบ (soft) — รายการเดิมยังเปิดดูได้ (FK RESTRICT) · หน้าเว็บแสดงข้อความแทนลิงก์ */
  deleted: boolean;
}

/**
 * 1 แถวของที่ระลึกในรายการ — `souvenirCode` `souvenirName` `unit` `unitValue` `unitDonationThreshold` = snapshot ณ ตอนบันทึก (แก้รายการ = คิดค่าปัจจุบันใหม่ทั้งชุด)
 * `souvenirValue` `souvenirDonationThreshold` `souvenirStatus` `stockOnHand` `imageVersion` = ค่าปัจจุบันของสินค้า (`null` = สินค้าถูกลบ) — ฟอร์มแก้ไขใช้คิดงบใหม่/เตือนสต็อก/badge ระงับ
 * ชื่อช่องเดียวกับ `OrderItemView` (SV-ADR-065 — รายการบริจาคจะถูกนำไปสร้างออเดอร์)
 */
export interface DonationItemView {
  id: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  unit: string | null;
  /** มูลค่า/หน่วย ณ ตอนบันทึก `"120.00"` */
  unitValue: string;
  qty: number;
  /** `qty × unitValue` `"240.00"` */
  lineTotal: string;
  /** snapshot เกณฑ์ยอดบริจาค/หน่วย (บาท · `"1500.00"`) — migration `0016` (แถวเดิม backfill จากเกณฑ์ของสินค้า ณ วันรัน) · `T-101` */
  unitDonationThreshold: string;
  /** `qty × unitDonationThreshold` คิดเป็นสตางค์แล้วจัดรูป */
  lineDonationThreshold: string;
  /** หมายเหตุต่อแถว ≤ `DONATION_ITEM_NOTE_MAX_LENGTH` · `null` = ไม่มี */
  note: string | null;
  sortOrder: number;
  /** มูลค่า/หน่วยปัจจุบัน — บันทึกฟอร์มแก้ไข = ใช้ค่านี้ */
  souvenirValue: string | null;
  /** เกณฑ์ยอดบริจาคปัจจุบันของสินค้า — บันทึกรายการใหม่ = snapshot ค่านี้ · `null` = สินค้าถูกลบ */
  souvenirDonationThreshold: string | null;
  souvenirStatus: SouvenirStatus | null;
  /** คงเหลือปัจจุบัน — เตือนอ่อน "เกินคงเหลือ n" (ไม่บล็อก · ไม่ตัด/จองสต็อก) */
  stockOnHand: number | null;
  /** `null` = ไม่มีรูป / สินค้าถูกลบ · มีค่า = `?v=` ของ `/souvenir-image/[id]/[size]` */
  imageVersion: string | null;
}

/** query ของ `GET /donations` — `q` ค้นเลขที่ · รหัส/ชื่อ/เบอร์ผู้บริจาค · เรียง `donation_date DESC, id DESC` */
export interface DonationListQuery {
  q?: string;
  status?: DonationStatus;
  /** ช่วง `donation_date` `YYYY-MM-DD` (รวมปลาย) */
  dateFrom?: string;
  dateTo?: string;
  /** ลิงก์จากหน้าผู้บริจาค (`/donations?donorId=`) */
  donorId?: string;
  page?: number;
  perPage?: number;
}

/** แถวในหน้า list (`GET /donations`) */
export interface DonationListItemView {
  id: string;
  donationNo: string;
  /** วันที่โอน/บริจาค `YYYY-MM-DD` (DATE ไม่มีเวลา) */
  donationDate: string;
  status: DonationStatus;
  source: DonationSource;
  /** ยอดบริจาค `"1500.00"` */
  amount: string;
  /** cache: Σ qty ของ `donation_items` — คอลัมน์ "ของที่ระลึก (n ชิ้น)" */
  souvenirTotalQty: number;
  /** cache: Σ (qty × unitValue) `"240.00"` — มูลค่ารวม (ข้อมูลรอง) */
  souvenirTotalValue: string;
  /** cache: Σ (qty × unitDonationThreshold) `"3000.00"` — **ยอดที่ใช้คิดงบ** (≤ `amount`) · migration `0017` · `T-104` */
  souvenirTotalThreshold: string;
  /** มีไฟล์หลักฐานการโอนอย่างน้อย 1 ไฟล์ (ไอคอนในคอลัมน์สถานะ · EXISTS `donation_slip_files`) */
  hasSlip: boolean;
  /** หมายเหตุ ≤ `DONATION_NOTE_MAX_LENGTH` — คอลัมน์ "หมายเหตุ" ของ list (ตัดบรรทัดเดียว · คำสั่งเจ้าของ) · `null` = ไม่มี (`T-087`) */
  note: string | null;
  donor: DonationDonorView;
  /**
   * ออเดอร์ active ของรายการนี้ (`orders.source_donation_id` ที่ไม่ `CANCELLED`/ไม่ถูกลบ · `T-108` · `T-113` SV-ADR-077) เรียง `splitNo` —
   * มีค่าเฉพาะ `ORDERED` (≥ 1 ใบ · แยกได้ ≤ `DONATION_ORDER_SPLIT_MAX`) · `[]` = ยังไม่ออก/ยกเลิกทั้งหมดแล้ว
   */
  orders: DonationOrderRef[];
  createdAt: string;
}

/**
 * ออเดอร์ที่ผูกกับรายการบริจาค (`T-108` · `T-113`) — list แสดงเลขใบแรก + "+N" · view แสดงทุกใบ (เลขลิงก์ `/orders/[id]` · สถานะ · "k/N" · ผู้รับ · ชิ้น)
 * `splitNo`/`splitTotal` = ลำดับในชุดที่ออกพร้อมกัน (`orders.source_split_no`/`source_split_total` · `0024`) — ออกแบบเดิม (ไม่แยก) = 1/1
 */
export interface DonationOrderRef {
  id: string;
  orderNo: string;
  status: OrderStatus;
  splitNo: number;
  splitTotal: number;
  /** snapshot ผู้รับของออเดอร์ใบนี้ */
  recipientName: string;
  /** ข้อความที่อยู่ของใบนี้ (`orders.recipient_address`) · `null` = ไม่มีที่อยู่ */
  recipientAddress: string | null;
  /** Σ qty ของใบนี้ (`orders.total_qty`) */
  totalQty: number;
}

/** จำนวนรายการต่อสถานะตามตัวกรองเดียวกับ list **ยกเว้น `status`** (แท็บ) + `total` = ทุกสถานะ */
export type DonationStatusCounts = Record<DonationStatus, number> & { total: number };

/**
 * แถบสรุปของหน้า list (`T-116`) — ตัวกรองเดียวกับ list **รวม `status`** (แท็บที่เลือก · ไม่ส่ง = ทุกสถานะ) · ทุกหน้า ไม่ใช่เฉพาะหน้าปัจจุบัน
 * ไม่มีผล = `{ count: 0, amountTotal: '0.00', souvenirQty: 0 }`
 */
export interface DonationListSummary {
  /** จำนวนรายการ (= `meta.total`) */
  count: number;
  /** Σ `amount` รูปแบบเดียวกับ `amount` ของแถว (`"12500.00"`) */
  amountTotal: string;
  /** Σ ชิ้นของที่ระลึก (Σ cache `souvenirTotalQty` = Σ qty ของ `donation_items` — ไม่นับซ้ำเมื่อรายการมีของหลายแถว) */
  souvenirQty: number;
}

/** response ของ `GET /donations` — envelope list กลาง (`ApiListResponse`) + `statusCounts` · `summary` ระดับบนสุด */
export interface DonationListResponse extends ApiListResponse<DonationListItemView> {
  statusCounts: DonationStatusCounts;
  summary: DonationListSummary;
}

/**
 * หน้า view (`GET /donations/:id`) · ปุ่มยืนยัน/ปฏิเสธ/ออกออเดอร์/ยกเลิกออเดอร์ = `DONATION_ACTION_TRANSITIONS` (`canDonationAction`)
 * ผู้รับ/ที่อยู่จัดส่ง (`OrderRecipientView` — ชุดเดียวกับออเดอร์ · SV-ADR-065): snapshot ที่บันทึกไว้ ·
 * รายการก่อน `0016` (ยังไม่บันทึกผู้รับ) = คิดจากผู้บริจาค ณ ตอนนี้ด้วยกติกาเดียวกับออเดอร์ (ชื่อว่าง = `''`) — บันทึกครั้งถัดไปเขียนลง DB
 */
export interface DonationView extends DonationListItemView, OrderRecipientView {
  /** มีค่าเฉพาะ `REJECTED` */
  rejectReason: string | null;
  /** ผู้ยืนยัน/ปฏิเสธ + เวลา — ตั้งเมื่อเปลี่ยนเป็น CONFIRMED/REJECTED · กลับเป็น PENDING = `null` */
  reviewedBy: DonationActorView | null;
  reviewedAt: string | null;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
  updatedAt: string;
  /** ไฟล์หลักฐานการโอน ≤ `PAYMENT_SLIP_FILES_MAX` เรียงตามลำดับอัปโหลด · `[]` = ไม่มี (`T-112` · SV-ADR-076) */
  slipFiles: PaymentSlipFileView[];
  /** หมายเหตุของหลักฐานการโอน ≤ `DONATION_SLIP_NOTE_MAX_LENGTH` · `null` = ไม่มี (มีได้แม้ไม่มีไฟล์) */
  slipNote: string | null;
  items: DonationItemView[];
  /** Σ `lineTotal` (สตางค์) — เท่ากับ `souvenirTotalValue` (cache) · ชื่อเดียวกับ `OrderView.totalValue` */
  totalValue: string;
  /** Σ `lineDonationThreshold` (สตางค์ · integer) — `"4500.00"` · ไม่มีรายการ = `"0.00"` · เท่ากับ `souvenirTotalThreshold` (cache) · คงเหลือจากยอด = `amount − ค่านี้` */
  totalDonationThreshold: string;
}

// ── input ─────────────────────────────────────────────────────────────────────────────────────

/** 1 แถวใน body — ห้ามซ้ำ `souvenirId` (422 `DONATION_ITEM_DUPLICATE`) · ลำดับใน array = `sortOrder` · `qty` 1–`DONATION_ITEM_QTY_MAX` */
export interface DonationItemInput {
  souvenirId: string;
  qty: number;
  /** ≤ `DONATION_ITEM_NOTE_MAX_LENGTH` (เกิน → 400 แบบ `OrderItemInput.note`) · ว่าง/ไม่ส่ง = ไม่มี */
  note?: string;
}

/**
 * body ของ `POST /donations` — `source` = `STAFF` เสมอ (API ตั้งเอง)
 * `amount` ข้อความทศนิยม ≤ 2 (> 0 – `DONATION_AMOUNT_MAX`) · `donationDate` `YYYY-MM-DD` ห้ามเป็นวันในอนาคต (Asia/Bangkok)
 * `items` = `[]` ได้ · Σ (qty × เกณฑ์ยอดบริจาคปัจจุบันของสินค้า) ≤ `amount` (`sumSouvenirThreshold` · 422 `DONATION_SOUVENIR_OVER_AMOUNT` details `{ amount, souvenirTotal }` — `souvenirTotal` = เกณฑ์รวม · `T-104`)
 */
export interface DonationCreateInput {
  donorId: string;
  amount: string;
  donationDate: string;
  status: DonationStatus;
  /** บังคับเมื่อ `status = REJECTED` (≤ `DONATION_REJECT_REASON_MAX_LENGTH`) · สถานะอื่นไม่สนใจ (เก็บ `null`) */
  rejectReason?: string;
  /** ≤ `DONATION_NOTE_MAX_LENGTH` · `''` = ล้าง */
  note?: string;
  /**
   * ผู้รับ/ที่อยู่จัดส่ง — **รูปแบบ/กติกาเดียวกับ `OrderRecipientInput` ของออเดอร์** (ชื่อบังคับ · เบอร์ normalize · `addressFormat` TEXT/STRUCTURED ·
   * 422 `recipient.<ช่อง>`) · ไม่ส่ง = คัดลอกจากผู้บริจาค (สร้าง) / คงเดิม (แก้ไข — รายการก่อน `0016` = คัดลอกจากผู้บริจาค) ·
   * ผู้บริจาคยังไม่มีชื่อ + ไม่ส่ง = ยังไม่บันทึกผู้รับ (ไม่ 422)
   */
  recipient?: OrderRecipientInput;
  /** หมายเหตุหลักฐานการโอน ≤ `DONATION_SLIP_NOTE_MAX_LENGTH` (หลัง trim · เกิน → 422 `slipNote`) · `''` = ล้าง */
  slipNote?: string;
  items: DonationItemInput[];
}

/**
 * body ของ `PATCH /donations/:id` — ส่งเฉพาะช่องที่แก้ · ส่ง `items` = **แทนทั้งชุด** (คิดเกณฑ์/มูลค่าปัจจุบันใหม่ + ตรวจงบ) · ไม่ส่ง = รายการเดิม
 * ไม่ส่ง `items` แต่ยอดเปลี่ยน = เทียบกับเกณฑ์รวมที่บันทึกไว้ (`souvenirTotalThreshold`) · ไม่แตะยอด/รายการ = ไม่ตรวจงบ (รายการเดิมที่เกณฑ์รวมเกินยอดยังแก้ช่องอื่นได้)
 */
export type DonationUpdateInput = Partial<DonationCreateInput>;

/** body ของ `POST /donations/:id/reject` — เหตุผลบังคับ ≤ `DONATION_REJECT_REASON_MAX_LENGTH` */
export interface DonationRejectInput {
  reason: string;
}

/**
 * body ของ `POST /donations/:id/unconfirm` ("ยกเลิกการยืนยัน" · `T-119` · SV-ADR-081) — เหตุผลบังคับ (trim) ≤ `DONATION_REJECT_REASON_MAX_LENGTH` ·
 * ไม่ส่ง/ช่องว่างล้วน → 422 `VALIDATION_FAILED` `{ field: 'reason', reason: 'REQUIRED' }` · ยาวเกิน/ชนิดผิด → 400 ·
 * ต้อง `CONFIRMED` + ไม่มีออเดอร์ active (ตรวจใต้ล็อก · ไม่ตรง → 409 `DONATION_STATUS_INVALID` `{ from, to: 'PENDING' }`) →
 * `PENDING` + ล้างผู้ตรวจ + ยอดสะสมผู้บริจาคใหม่ · เหตุผลเก็บใน audit (`donation_status` after `reason`) ไม่มีคอลัมน์ · response = `DonationView` หลังเปลี่ยน
 */
export interface DonationUnconfirmInput {
  reason: string;
}

/** แยกออเดอร์ได้สูงสุดกี่ใบต่อการออก 1 ครั้ง (`shipments.length` · `T-113` · SV-ADR-077) */
export const DONATION_ORDER_SPLIT_MAX = 10;

/**
 * เหตุผล 422 `VALIDATION_FAILED` ของ `shipments` (`T-113`) — `details { field, reason, … }` · `field` เป็น path (`shipments` · `shipments.2.items` · `shipments.0.items.1.qty`)
 * - `TOO_MANY` (`shipments` · `max`) เกิน `DONATION_ORDER_SPLIT_MAX` · `REQUIRED` (`shipments`) ส่ง `[]`
 * - `EMPTY_SHIPMENT` (`shipments.<i>.items`) ใบที่ไม่มีของ · `UNKNOWN_ITEM` (`shipments.<i>.items.<j>.donationItemId`) ไม่ใช่แถวของรายการนี้ ·
 *   `DUPLICATE_ITEM` (ช่องเดียวกัน) แถวซ้ำในใบเดียว · `OUT_OF_RANGE` (`shipments.<i>.items.<j>.qty` · `min` `max`) จำนวนไม่ใช่ 1..qty ของแถว
 * - `ALLOCATION_MISMATCH` (`shipments` · `donationItemId` `expected` `allocated`) ผลรวมต่อแถวไม่เท่าจำนวนในรายการ (ต้องครบพอดีทุกชิ้น)
 * - ผู้รับ/ที่อยู่ = กติกาเดียวกับออเดอร์ โดยเติมหน้า path (`shipments.<i>.recipient.name` …)
 */
export const DonationOrderSplitReason = {
  TOO_MANY: 'TOO_MANY',
  REQUIRED: 'REQUIRED',
  EMPTY_SHIPMENT: 'EMPTY_SHIPMENT',
  UNKNOWN_ITEM: 'UNKNOWN_ITEM',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  ALLOCATION_MISMATCH: 'ALLOCATION_MISMATCH',
} as const;
export type DonationOrderSplitReason = (typeof DonationOrderSplitReason)[keyof typeof DonationOrderSplitReason];

/** ของ 1 แถวในใบที่แยก — `donationItemId` = `DonationItemView.id` · `qty` จำนวนเต็ม 1..qty ของแถว */
export interface DonationOrderShipmentItemInput {
  donationItemId: string;
  qty: number;
}

/** ออเดอร์ 1 ใบของการแยก — ผู้รับรูปเดียวกับ `OrderRecipientInput` (บังคับ) · `note` ไม่ส่ง = หมายเหตุของรายการบริจาค · `''` = ไม่มี */
export interface DonationOrderShipmentInput {
  recipient: OrderRecipientInput;
  items: DonationOrderShipmentItemInput[];
  /** ≤ `ORDER_NOTE_MAX_LENGTH` */
  note?: string;
}

/**
 * body ของ `POST /donations/:id/order` ("ออกออเดอร์" · `T-108` · SV-ADR-072 · แยก `T-113` · SV-ADR-077) — สิทธิ์ `donations` MAINTAIN **และ** `orders` MAINTAIN (ขาดตัวไหน = 403)
 * ต้อง `CONFIRMED` + ไม่มีออเดอร์ active (ไม่ตรง → 409 `DONATION_STATUS_INVALID` `{ from, to }` · ตรวจซ้ำใต้ล็อก — กดซ้ำ/พร้อมกัน = ได้ชุดเดียว) →
 * สร้างออเดอร์ (`DRAFT`) ด้วยผู้บริจาค · ผู้รับ/ที่อยู่ · ของที่ระลึก (snapshot ของรายการบริจาค) · หมายเหตุ · ยอด/วันที่/หมายเหตุสลิป · ไฟล์หลักฐาน (คัดลอกแยก key ต่อใบ) ·
 * อ้างอิง `sourceDonation` (+ `batchNo` ครั้งที่ออก · `splitNo`/`splitTotal`) → รายการเป็น `ORDERED` — ทั้งหมดใน transaction เดียว
 * - ไม่ส่ง `shipments` = **1 ใบ** ผู้รับของรายการ ของทุกแถว (พฤติกรรมเดิม · 1/1)
 * - ส่ง 1..`DONATION_ORDER_SPLIT_MAX` ใบ = แต่ละใบเป็นออเดอร์ของตัวเอง (ของ = snapshot ของแถวแต่ qty ตามที่จัดสรร) · ต้องจัดสรรครบทุกชิ้นพอดี (422 `DonationOrderSplitReason`) ·
 *   ยอด/วันที่/หมายเหตุสลิป/ไฟล์ = snapshot **ทุกใบ** (ยอดของทั้งรายการ — ห้าม SUM ข้ามใบ)
 * ไม่มีของที่ระลึก → 422 `ORDER_ITEMS_EMPTY` · ของระงับ → 422 `SOUVENIR_SUSPENDED` · ของถูกลบ → 404 (กติกาสร้างออเดอร์เดิม)
 * response = `DonationView` หลังเปลี่ยน (`orders` = ใบที่สร้าง)
 */
export interface DonationCreateOrderInput {
  /** `true` = ยืนยัน**ทุกใบ** (ตัดสต็อก FIFO) ใน transaction เดียวกัน · สต็อกไม่พอ → 422 `STOCK_INSUFFICIENT` ไม่เปลี่ยนอะไร (rollback ทั้งชุด) · ไม่ส่ง = ออเดอร์ร่าง */
  confirm?: boolean;
  /** แยกหลายออเดอร์ (หลายที่อยู่) — ไม่ส่ง = ออเดอร์เดียว */
  shipments?: DonationOrderShipmentInput[];
}

/**
 * body ของ `POST /donations/:id/cancel-order` (`T-108` · `T-113`) — สิทธิ์เหมือน `/order` · ต้อง `ORDERED` (อื่น 409 `DONATION_STATUS_INVALID`) ·
 * ยกเลิก**ทุกใบ active** — ทุกใบต้องอยู่ใน `ORDER_OPEN_STATUSES` (`DRAFT`/`CONFIRMED`/`PREPARING` · มีใบ `SHIPPED`/`RECEIVED` → 409 `ORDER_STATUS_INVALID`
 * `{ from, to, orderId, orderNo }` ไม่แตะใบไหน) → ยกเลิก (คืนสต็อกถ้าถืออยู่ · `cancelReason` = เหตุผลนี้) + รายการกลับ `CONFIRMED` ใน transaction เดียว ·
 * ออเดอร์เดิมยังอ้างอิงรายการนี้ (ประวัติ) · ออกออเดอร์ใหม่ได้ · response = `DonationView`
 */
export interface DonationCancelOrderInput {
  /** บังคับ ≤ `DONATION_CANCEL_ORDER_REASON_MAX_LENGTH` — กติกาเดียวกับ `OrderCancelInput` (ไม่ส่ง/ว่าง → 400 · ช่องว่างล้วน → 422 `{ field: 'reason', reason: 'REQUIRED' }`) */
  reason: string;
}

/** เหตุผลยกเลิกออเดอร์จากรายการบริจาค = `cancel_reason` ของออเดอร์ */
export const DONATION_CANCEL_ORDER_REASON_MAX_LENGTH = ORDER_CANCEL_REASON_MAX_LENGTH;
