import type { DonorStatus } from './donors';
import { parseMoneyToSatang } from './money';
import type { ApiListResponse } from './response';
import { formatSequenceCode } from './sequence-code';
import type { SouvenirStatus } from './souvenirs';

/**
 * รายการบริจาค + งบของที่ระลึกตามยอด (e-Donation) — `SV-CR-005` ข้อ 3 · `REQ-DNT-*` · FT-17 · SV-ADR-053
 * `T-084` (สัญญากลางนี้) · `T-086` (API `/donations`) · `T-087` (เว็บ `/donations/**`)
 * enum / view / input / ค่าคงที่ที่ API และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 * เงินทุกช่อง (`amount` · `unitValue` · `lineTotal` · `souvenirTotalValue`) = DECIMAL(12,2) เป็นข้อความ `"1234.50"` · คำนวณด้วยสตางค์ (`./money.ts`)
 */

/** สถานะ — `PENDING` รอการยืนยัน · `CONFIRMED` ยืนยัน (นับเข้ายอดสะสมผู้บริจาค) · `REJECTED` ปฏิเสธ (เหตุผลบังคับ) · ฟอร์มตั้งได้ทุกค่า */
export const DonationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const;
export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];

/** ช่องทางที่สร้างรายการ — `STAFF` เจ้าหน้าที่บันทึก (รอบนี้) · `LINE_OA` ผู้บริจาคแจ้งเองผ่าน LINE OA (จองค่าไว้รอบหน้า · Q-050) */
export const DonationSource = {
  STAFF: 'STAFF',
  LINE_OA: 'LINE_OA',
} as const;
export type DonationSource = (typeof DonationSource)[keyof typeof DonationSource];

/**
 * ปุ่มเร็ว `POST /donations/:id/confirm` · `/reject` — ได้เฉพาะจาก `PENDING` (ไม่ตรง → 409 `DONATION_STATUS_INVALID` details `{ from, to }`)
 * **ไม่ใช้กับฟอร์มแก้ไข** (`PATCH` ตั้งสถานะได้ทุกค่า · CR ข้อ 3.3 ข้อ 4) · หน้าเว็บเลือกปุ่มจากตารางเดียวกันนี้
 */
export const DONATION_STATUS_TRANSITIONS: Readonly<Record<DonationStatus, readonly DonationStatus[]>> = {
  PENDING: [DonationStatus.CONFIRMED, DonationStatus.REJECTED],
  CONFIRMED: [],
  REJECTED: [],
};

/** `canTransitionDonation('CONFIRMED', 'REJECTED')` → `false` (ปุ่มเร็ว · ฟอร์มแก้ไขไม่ถูกจำกัด) */
export function canTransitionDonation(from: DonationStatus, to: DonationStatus): boolean {
  return DONATION_STATUS_TRANSITIONS[from].includes(to);
}

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0009_donations.sql` (DOM-04) */
export const DONATION_NOTE_MAX_LENGTH = 1000;
/** บังคับเมื่อ `REJECTED` (422 `DONATION_REJECT_REASON_REQUIRED`) · สถานะอื่น API ล้างเป็น `null` */
export const DONATION_REJECT_REASON_MAX_LENGTH = 500;
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

// ── สลิป / หลักฐานการโอน (1 รูป/รายการ · ไม่บังคับ) ─────────────────────────────────────────────

/** ขนาดที่เก็บ (WebP ผ่าน `sharp` · ไม่ขยายรูปที่เล็กกว่า) — `thumb` 320 px (list/view) · `full` 2000 px (อ่านตัวเลขบนสลิปได้) */
export const DonationSlipSize = {
  THUMB: 'thumb',
  FULL: 'full',
} as const;
export type DonationSlipSize = (typeof DonationSlipSize)[keyof typeof DonationSlipSize];
export const DONATION_SLIP_SIZES = Object.values(DonationSlipSize) as readonly DonationSlipSize[];
export const DONATION_SLIP_MAX_PX: Readonly<Record<DonationSlipSize, number>> = { thumb: 320, full: 2000 };
/** ชนิดไฟล์ที่รับ — อื่นจากนี้/อ่านเป็นรูปไม่ได้/เกิน `s3.maxUploadSizeMb` → 422 `DONATION_SLIP_INVALID` */
export const DONATION_SLIP_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** `slip_version` = hex 8 ตัว สุ่มใหม่ทุกครั้งที่อัปโหลด → URL `?v=` เปลี่ยน (แบบ `SOUVENIR_IMAGE_VERSION_LENGTH`) */
export const DONATION_SLIP_VERSION_LENGTH = 8;

// ── งบของที่ระลึก (CR ข้อ 3.3 ข้อ 1) ──────────────────────────────────────────────────────────

/** 1 แถวที่ใช้คิดงบ — `unitValue` = มูลค่า/หน่วยของสินค้า (ข้อความ `"120.00"` หรือตัวเลข) */
export interface SouvenirValueLine {
  /** จำนวนเต็ม ≥ 0 — ฟอร์มที่ช่องว่างให้แปลงเป็น 0 ก่อนเรียก */
  qty: number;
  unitValue: string | number;
}

/**
 * Σ (`qty` × `unitValue`) เป็น **สตางค์** (integer ล้วน) — API ตรวจ `≤ amount` (422 `DONATION_SOUVENIR_OVER_AMOUNT`) · หน้าเว็บวาดแถบงบ/ปิดปุ่มบันทึก
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
 * 1 แถวของที่ระลึกในรายการ — `souvenirCode` `souvenirName` `unit` `unitValue` = snapshot ณ ตอนบันทึก (แก้รายการ = คิดราคาปัจจุบันใหม่ทั้งชุด)
 * `souvenirValue` `souvenirStatus` `stockOnHand` `imageVersion` = ค่าปัจจุบันของสินค้า (`null` = สินค้าถูกลบ) — ฟอร์มแก้ไขใช้คิดงบใหม่/เตือนสต็อก/badge ระงับ
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
  sortOrder: number;
  /** มูลค่า/หน่วยปัจจุบัน — บันทึกฟอร์มแก้ไข = ใช้ค่านี้ */
  souvenirValue: string | null;
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
  /** cache: Σ (qty × unitValue) `"240.00"` */
  souvenirTotalValue: string;
  /** มีรูปสลิป (ไอคอนในคอลัมน์สถานะ) */
  hasSlip: boolean;
  /** หมายเหตุ ≤ `DONATION_NOTE_MAX_LENGTH` — คอลัมน์ "หมายเหตุ" ของ list (ตัดบรรทัดเดียว · คำสั่งเจ้าของ) · `null` = ไม่มี (`T-087`) */
  note: string | null;
  donor: DonationDonorView;
  createdAt: string;
}

/** จำนวนรายการต่อสถานะตามตัวกรองเดียวกับ list **ยกเว้น `status`** (แท็บ) + `total` = ทุกสถานะ */
export type DonationStatusCounts = Record<DonationStatus, number> & { total: number };

/** response ของ `GET /donations` — envelope list กลาง (`ApiListResponse`) + `statusCounts` ระดับบนสุด */
export interface DonationListResponse extends ApiListResponse<DonationListItemView> {
  statusCounts: DonationStatusCounts;
}

/** หน้า view (`GET /donations/:id`) · ปุ่มยืนยัน/ปฏิเสธ = `DONATION_STATUS_TRANSITIONS[status]` */
export interface DonationView extends DonationListItemView {
  /** มีค่าเฉพาะ `REJECTED` */
  rejectReason: string | null;
  /** ผู้ยืนยัน/ปฏิเสธ + เวลา — ตั้งเมื่อเปลี่ยนเป็น CONFIRMED/REJECTED · กลับเป็น PENDING = `null` */
  reviewedBy: DonationActorView | null;
  reviewedAt: string | null;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
  updatedAt: string;
  /** `null` = ไม่มีสลิป · มีค่า = `?v=` ของ `/donation-slip/[id]/[size]` */
  slipVersion: string | null;
  items: DonationItemView[];
}

// ── input ─────────────────────────────────────────────────────────────────────────────────────

/** 1 แถวใน body — ห้ามซ้ำ `souvenirId` (422 `DONATION_ITEM_DUPLICATE`) · ลำดับใน array = `sortOrder` · `qty` 1–`DONATION_ITEM_QTY_MAX` */
export interface DonationItemInput {
  souvenirId: string;
  qty: number;
}

/**
 * body ของ `POST /donations` — `source` = `STAFF` เสมอ (API ตั้งเอง)
 * `amount` ข้อความทศนิยม ≤ 2 (> 0 – `DONATION_AMOUNT_MAX`) · `donationDate` `YYYY-MM-DD` ห้ามเป็นวันในอนาคต (Asia/Bangkok)
 * `items` = `[]` ได้ · Σ มูลค่า (ราคาปัจจุบันของสินค้า) ≤ `amount` (422 `DONATION_SOUVENIR_OVER_AMOUNT` details `{ amount, souvenirTotal }`)
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
  items: DonationItemInput[];
}

/** body ของ `PATCH /donations/:id` — ส่งเฉพาะช่องที่แก้ · ส่ง `items` = **แทนทั้งชุด** (คิดราคาปัจจุบันใหม่) · ไม่ส่ง = รายการเดิม */
export type DonationUpdateInput = Partial<DonationCreateInput>;

/** body ของ `POST /donations/:id/reject` — เหตุผลบังคับ ≤ `DONATION_REJECT_REASON_MAX_LENGTH` */
export interface DonationRejectInput {
  reason: string;
}
