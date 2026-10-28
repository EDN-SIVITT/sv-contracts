import type { SouvenirEligibilityMeta } from './fundraising-souvenirs';
import type { ApiMeta } from './response';
import { formatSequenceCode } from './sequence-code';

/**
 * ของที่ระลึก + สต็อกแบบ lot (e-Donation) — `SV-CR-004` ข้อ 1 · `REQ-SVN-*` · FT-15 · SV-ADR-050
 * `T-077` (สัญญากลางนี้) · `T-078` (API `/souvenirs`) · `T-080` (เว็บ `/souvenirs/**`)
 * enum / view / input / ค่าคงที่ที่ API และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/** สถานะสินค้า — `SUSPENDED` = เลือกใส่ออเดอร์ใหม่ไม่ได้ · ยืนยันออเดอร์ที่มีสินค้านี้ไม่ได้ (422 `SOUVENIR_SUSPENDED`) · สต็อกยังจัดการได้ */
export const SouvenirStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type SouvenirStatus = (typeof SouvenirStatus)[keyof typeof SouvenirStatus];

/**
 * ชนิดการเคลื่อนไหวสต็อก (สมุดบัญชี append-only `souvenir_stock_movements` · SV-ADR-050)
 * `RECEIVE` รับเข้า lot ใหม่ (+) · `ADJUST` ปรับยอด lot (±) · `ISSUE` ตัดออกด้วยออเดอร์ (−) · `RETURN` คืนเข้า lot เดิมเมื่อยกเลิกออเดอร์ / ลดรายการของออเดอร์ที่ยืนยันแล้ว (+)
 */
export const StockMovementType = {
  RECEIVE: 'RECEIVE',
  ADJUST: 'ADJUST',
  ISSUE: 'ISSUE',
  RETURN: 'RETURN',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

/**
 * ชนิดเอกสารอ้างอิงของ movement (`ref_type` VARCHAR(20)) — ทั้งสองค่าอ้างออเดอร์ (`ref_id` = `orders.id` · `refNo` = เลขที่ออเดอร์)
 * `ORDER` ตัดตอนเข้ากลุ่มถือของ (`ORDER_STOCK_HELD_STATUSES`) / คืนตอนออกจากกลุ่ม (ย้อนเป็นรอยืนยัน · ยกเลิก — SV-ADR-074) ·
 * `ORDER_EDIT` = movement เดิมจากการแก้รายการของออเดอร์ที่ยืนยันแล้ว (`T-103` · SV-ADR-067 — ถูกแทนแล้ว: แก้รายการได้เฉพาะรอยืนยัน · ไม่สร้างแถวใหม่) **ยังนับ**ในยอดที่ถืออยู่
 * ยอดที่ออเดอร์ถืออยู่ต่อ lot = −Σ `qty` ของทุก movement ที่ `ref_type` อยู่ใน `ORDER_STOCK_REF_TYPES` และ `ref_id` เดียวกัน
 */
export const StockRefType = {
  ORDER: 'ORDER',
  ORDER_EDIT: 'ORDER_EDIT',
} as const;
export type StockRefType = (typeof StockRefType)[keyof typeof StockRefType];

/** `ref_type` ที่อ้างออเดอร์ (หน้าเว็บทำลิงก์ `/orders/[refId]` · API เติม `refNo`) */
export const ORDER_STOCK_REF_TYPES: readonly StockRefType[] = [StockRefType.ORDER, StockRefType.ORDER_EDIT];

export function isOrderStockRef(refType: StockRefType | string | null | undefined): boolean {
  return (ORDER_STOCK_REF_TYPES as readonly (string | null | undefined)[]).includes(refType);
}

/** ตัวกรองคงเหลือใน list (`GET /souvenirs?stock=`) และ badge — `LOW` 0 < คงเหลือ ≤ จุดเตือน · `OUT` = 0 */
export const StockFilter = {
  LOW: 'LOW',
  OUT: 'OUT',
} as const;
export type StockFilter = (typeof StockFilter)[keyof typeof StockFilter];

/**
 * ลำดับของ list (`GET /souvenirs?sort=`) — ไม่ส่ง = `updated_at DESC` (เดิม) · ค่าเท่ากันเรียง `updated_at DESC, id DESC` ต่อ
 * หน้าเว็บกดหัวคอลัมน์ "มูลค่า" วน น้อย→มาก → มาก→น้อย → ค่าเริ่มต้น (`REQ-SVN-014` · `T-085`) ·
 * `threshold_*` = เรียงตามเกณฑ์ยอดบริจาค (`REQ-SVN-015` · `T-099`) · ระบบลูกเพิ่มคอลัมน์อื่นได้ที่นี่
 */
export const SouvenirSort = {
  VALUE_ASC: 'value_asc',
  VALUE_DESC: 'value_desc',
  THRESHOLD_ASC: 'threshold_asc',
  THRESHOLD_DESC: 'threshold_desc',
} as const;
export type SouvenirSort = (typeof SouvenirSort)[keyof typeof SouvenirSort];

/** ขนาดรูปที่เก็บ (WebP ผ่าน `sharp`) — `thumb` ด้านยาวสุด 160 px (list · ตัวเลือกในฟอร์มออเดอร์) · `full` 1024 px (หน้า view) · ไม่ขยายรูปที่เล็กกว่า */
export const SouvenirImageSize = {
  THUMB: 'thumb',
  FULL: 'full',
} as const;
export type SouvenirImageSize = (typeof SouvenirImageSize)[keyof typeof SouvenirImageSize];
export const SOUVENIR_IMAGE_SIZES = Object.values(SouvenirImageSize) as readonly SouvenirImageSize[];
export const SOUVENIR_IMAGE_MAX_PX: Readonly<Record<SouvenirImageSize, number>> = { thumb: 160, full: 1024 };
/** ชนิดไฟล์ที่ช่องอัปโหลดรูปรับ — อื่นจากนี้/อ่านเป็นรูปไม่ได้ → 422 `SOUVENIR_IMAGE_INVALID` (ขนาดไฟล์สูงสุด = `s3.maxUploadSizeMb`) */
export const SOUVENIR_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** `image_version` = hex 8 ตัว สุ่มใหม่ทุกครั้งที่อัปโหลด → URL `?v=` เปลี่ยน → ตอบ immutable ได้ (แบบไอคอนระบบ `branding.controller`) */
export const SOUVENIR_IMAGE_VERSION_LENGTH = 8;
/**
 * เพดานจำนวนรูปต่อสินค้า (`T-100` · SV-ADR-064) — ค่าคงที่ ไม่ใช่ settings · ครบแล้วเพิ่มอีก → 422 `SOUVENIR_IMAGES_LIMIT` `details { max }`
 * รูปเรียงตาม `sortOrder` · รูปแรก = **รูปหลัก** เสมอ (= `imageVersion` ของสินค้า → list · ออเดอร์ · popup เลือกของ · รายการบริจาค)
 */
export const SOUVENIR_IMAGES_MAX = 10;

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0008_souvenirs_orders.sql` (DOM-04) */
export const SOUVENIR_CATEGORY_NAME_MAX_LENGTH = 100;
export const SOUVENIR_CATEGORY_DESCRIPTION_MAX_LENGTH = 500;
export const SOUVENIR_CODE_MAX_LENGTH = 32;
export const SOUVENIR_NAME_MAX_LENGTH = 200;
export const SOUVENIR_UNIT_MAX_LENGTH = 30;
export const SOUVENIR_DESCRIPTION_MAX_LENGTH = 2000;
export const SOUVENIR_LOT_NO_MAX_LENGTH = 50;
/**
 * มูลค่า/หน่วย (บาท · ใช้เหมือนราคาขาย) DECIMAL(12,2) — 0 ถึงค่านี้ · ทศนิยม ≤ 2 · `0` = ของแจก ไม่กินงบ (`SV-CR-005` ข้อ 2 · `REQ-SVN-014`)
 * มูลค่า = ข้อมูลรอง (`T-104`) — งบของที่ระลึกในรายการบริจาคคิดจาก **เกณฑ์ยอดบริจาค** (Σ qty × `donationThreshold` ≤ ยอดบริจาค · `sumSouvenirThreshold` · `./donations.ts`)
 */
export const SOUVENIR_VALUE_MAX = '9999999.99';
// เกณฑ์ยอดบริจาค (`donationThreshold` · REQ-SVN-015 · T-099) ใช้เพดาน/รูปแบบเดียวกับมูลค่า — `SOUVENIR_VALUE_MAX` · ค่าหลักที่แสดงแบบราคา + ใช้คิดงบ (`T-104`)
/** หมายเหตุของ lot และของ movement (ปรับยอด = บังคับกรอก) */
export const STOCK_NOTE_MAX_LENGTH = 500;
/** จำนวนแถวที่หน้า view แสดงในการ์ด — lot ที่ยังมีของ 5 แถวแรก · การเคลื่อนไหวล่าสุด 10 รายการ (CR ข้อ 1.2) */
export const SOUVENIR_VIEW_LOTS_PREVIEW = 5;
export const SOUVENIR_VIEW_MOVEMENTS_PREVIEW = 10;

/** รหัสสินค้าที่ผู้ใช้กรอกเอง — `A–Z a–z 0–9 - _ .` (ถูกพิมพ์ · ค้นหา · อ่านออกเสียง) · ว่าง = ออกให้อัตโนมัติ */
export const SOUVENIR_CODE_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * รหัสอัตโนมัติ = `prefix + เลขลำดับเติม 0` (`souvenir.codePrefix` · `souvenir.codeDigits` — REQ-SET-038/039) · ค่าด้านล่างเป็นค่าสำรองเมื่อ DB ยังไม่มีแถว
 * เลขลำดับจาก `running_numbers` แถว `SOUVENIR_RUNNING_NUMBER_KEY` · ออกครั้งเดียวตอนสร้าง (แก้รหัสทีหลังได้ด้วย MAINTAIN)
 * กฎของค่าตั้งค่า (prefix 0–10 ตัว · digits 1–12) อยู่ที่ `SETTING_STRING_RULES` / `SETTING_NUMBER_BOUNDS` ใน `./settings.ts`
 */
export const SOUVENIR_CODE_PREFIX_DEFAULT = 'SVN';
export const SOUVENIR_CODE_DIGITS_DEFAULT = 4;
export const SOUVENIR_RUNNING_NUMBER_KEY = 'souvenir';
/** เลข lot อัตโนมัติ = `L` + ลำดับต่อสินค้า 3 หลัก (`L001`) — นับจากจำนวน lot ของสินค้านั้น ไม่ใช้ `running_numbers` */
export const SOUVENIR_LOT_NO_PREFIX = 'L';
export const SOUVENIR_LOT_NO_DIGITS = 3;

/** `formatSouvenirCode('SVN', 4, 12)` → `SVN0012` — alias ของ `formatSequenceCode` */
export function formatSouvenirCode(prefix: string, digits: number, n: number): string {
  return formatSequenceCode(prefix, digits, n);
}

/** `formatSouvenirLotNo(7)` → `L007` · lot ที่ 1000 → `L1000` (ไม่ถูกตัด) */
export function formatSouvenirLotNo(n: number): string {
  return formatSequenceCode(SOUVENIR_LOT_NO_PREFIX, SOUVENIR_LOT_NO_DIGITS, n);
}

/** ระดับคงเหลือสำหรับ badge/ตัวกรอง — `OUT` = 0 · `LOW` 0 < คงเหลือ ≤ จุดเตือน · `null` = ปกติ (หรือไม่ได้ตั้งจุดเตือน) */
export function stockLevelOf(stockOnHand: number, lowStockThreshold: number | null): StockFilter | null {
  if (stockOnHand <= 0) return StockFilter.OUT;
  if (lowStockThreshold !== null && lowStockThreshold > 0 && stockOnHand <= lowStockThreshold) return StockFilter.LOW;
  return null;
}

// ── หมวดหมู่ (`souvenir_categories` · REQ-SVN-001) ──────────────────────────────────────────────

/** แถวในหน้า `/souvenirs/categories` (`GET /souvenir-categories`) — เรียง `sortOrder, name` */
export interface SouvenirCategoryView {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  /** ปิด = ไม่ขึ้นใน dropdown ของฟอร์มสินค้า แต่สินค้าเดิมยังแสดงชื่อหมวด */
  isActive: boolean;
  /** จำนวนสินค้าที่ยังไม่ลบในหมวดนี้ — ลบหมวดได้เมื่อ 0 (ไม่งั้น 409 `SOUVENIR_CATEGORY_IN_USE`) */
  souvenirCount: number;
  createdAt: string;
  updatedAt: string;
}

/** body ของ `POST /souvenir-categories` — `PATCH /souvenir-categories/:id` = `Partial` (ส่งเฉพาะช่องที่แก้ · `''` = ล้างคำอธิบาย) */
export interface SouvenirCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ── สินค้า (`souvenirs` · REQ-SVN-002…006) ────────────────────────────────────────────────────

/** query ของ `GET /souvenirs` — `q` ค้นรหัส/ชื่อ (LIKE escape) · เรียง `updated_at DESC` (หรือตาม `sort`) · pagination กลาง */
export interface SouvenirListQuery {
  q?: string;
  categoryId?: string;
  status?: SouvenirStatus;
  stock?: StockFilter;
  sort?: SouvenirSort;
  page?: number;
  perPage?: number;
  /**
   * บริบทของ picker ในฟอร์มรายการบริจาค (`T-132` · SV-ADR-091) — ส่งอย่างน้อย 1 ช่อง = กรองตามเงื่อนไขของที่ระลึก + `meta.eligibility` ·
   * ไม่ส่งทั้ง 3 = เดิมทุกอย่าง · `eligibleCampaignId` = ใช้กองทุนจริงของแคมเปญ · `eligibleDate` `YYYY-MM-DD` ไม่ส่ง = วันนี้ (เวลาไทย) ·
   * `RULES` = เฉพาะของในกฎที่มีผลวันนั้น (+ `eligibleThreshold`) · `NONE` = รายการว่าง · `LEGACY` = เดิม
   */
  eligibleFundId?: string;
  eligibleCampaignId?: string;
  eligibleDate?: string;
}

/** meta ของ `GET /souvenirs` — `eligibility` มีเมื่อส่ง `eligible*` มา (`T-132`) */
export interface SouvenirListMeta extends ApiMeta {
  eligibility?: SouvenirEligibilityMeta;
}

/** แถวในหน้า list (`GET /souvenirs`) */
export interface SouvenirListItemView {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  /** ชื่อหมวด ณ ปัจจุบัน (หมวดที่ปิดใช้งานยังแสดง) · `null` = ไม่มีหมวด */
  categoryName: string | null;
  /** หน่วยนับ · `null` = หน้าเว็บแสดงค่าเริ่มต้นจาก i18n ("ชิ้น") */
  unit: string | null;
  /** มูลค่า/หน่วย DECIMAL(12,2) เป็นข้อความ (`"120.00"`) · ของเดิมก่อน `0009` = `"0.00"` */
  value: string;
  /**
   * เกณฑ์ยอดบริจาค (บาท) DECIMAL(12,2) เป็นข้อความ (`"1500.00"`) — ผู้บริจาคที่ยอดถึงค่านี้ขึ้นไปเลือกของนี้ได้ (กติกาเลือกยังไม่ทำ) ·
   * `"0.00"` = ไม่มีเกณฑ์ · ของเดิมก่อน `0014` = `"0.00"` (`REQ-SVN-015` · `T-099`)
   */
  donationThreshold: string;
  status: SouvenirStatus;
  /** คงเหลือ — คอลัมน์ denormalized อัปเดตใน transaction เดียวกับทุก movement (= Σ `qtyRemaining` ของ lot) */
  stockOnHand: number;
  /** จุดเตือนใกล้หมด · `null` = ไม่เตือน */
  lowStockThreshold: number | null;
  /** `OUT` · `LOW` · `null` — API คำนวณด้วย `stockLevelOf` ให้แล้ว หน้าเว็บวาด badge ตรง ๆ */
  stockLevel: StockFilter | null;
  /** `null` = ไม่มีรูป (แสดงกรอบเทาไอคอนกล่อง) · มีค่า = ใส่ `?v=` ของ `/souvenir-image/[id]/[size]` */
  imageVersion: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * เกณฑ์ยอดบริจาค/ชิ้นตามกฎของบริบท (`eligible*` · `RULES`) — ใช้แทน `donationThreshold` ในฟอร์มรายการบริจาค · ไม่มีบริบท/`LEGACY` = `null` (`T-132`)
   */
  eligibleThreshold: string | null;
  /** ที่แคมเปญยังใช้ได้ (นโยบาย `ALLOCATED` · `T-133`) · อื่น ๆ = `null` */
  campaignAvailable: number | null;
}

/** หน้า view (`GET /souvenirs/:id`) — ไม่มีบริบทของ picker (`eligibleThreshold` / `campaignAvailable` อยู่เฉพาะ list) */
export interface SouvenirView extends Omit<SouvenirListItemView, 'eligibleThreshold' | 'campaignAvailable'> {
  description: string | null;
  /** รูปทั้งหมดเรียงแล้ว (`sortOrder` 0..n-1) · ตัวแรก = รูปหลัก (version เดียวกับ `imageVersion`) · ไม่มีรูป = `[]` (`T-100`) */
  images: SouvenirImageView[];
  /** lot ที่ยังมีของ (`qtyRemaining > 0`) เรียง FIFO · สูงสุด `SOUVENIR_VIEW_LOTS_PREVIEW` แถว */
  lots: SouvenirLotView[];
  /** จำนวน lot ที่ยังมีของทั้งหมด (ไม่ใช่แค่ที่ส่งมาใน `lots`) */
  activeLotCount: number;
  /** การเคลื่อนไหวล่าสุด ใหม่สุดก่อน · สูงสุด `SOUVENIR_VIEW_MOVEMENTS_PREVIEW` รายการ */
  recentMovements: StockMovementView[];
}

/**
 * body ของ `POST /souvenirs` — `PATCH /souvenirs/:id` = `Partial` (ส่งเฉพาะช่องที่แก้ · `''` = ล้างค่าของช่องที่ไม่บังคับ)
 * ไม่มีช่องสต็อก — คงเหลือเป็นค่าอัตโนมัติจาก lot (CR ข้อ 1.2)
 */
export interface SouvenirInput {
  /** ว่าง/ไม่ส่ง = ออกให้อัตโนมัติ · กรอกเอง = `SOUVENIR_CODE_PATTERN` ≤ 32 · ซ้ำ → 422 `SOUVENIR_CODE_TAKEN` */
  code?: string;
  name: string;
  /** `null` = ไม่มีหมวด */
  categoryId?: string | null;
  unit?: string;
  /**
   * มูลค่า/หน่วย ข้อความทศนิยม ≤ 2 (`"120.00"`) 0 – `SOUVENIR_VALUE_MAX` — ฟอร์มบังคับกรอก (`REQ-SVN-014`)
   * optional ใน type เพื่อให้ `PATCH` (Partial) ส่งเฉพาะช่องที่แก้ · **`POST` ต้องส่ง** (ไม่ส่ง/ว่าง → 422 `details { field: 'value', reason: 'REQUIRED' }`)
   * API รับตัวเลข (`120.5`) ได้ด้วยแบบ `unitCost` · ผิดรูป/ติดลบ/ทศนิยม > 2 → 422 `INVALID_FORMAT` · เกินเพดาน → 422 `OUT_OF_RANGE` (`T-085`)
   */
  value?: string | number;
  /**
   * เกณฑ์ยอดบริจาค (บาท) กติกาเดียวกับ `value` ทุกข้อ (ข้อความ/ตัวเลข · ทศนิยม ≤ 2 · 0 – `SOUVENIR_VALUE_MAX`) — **`POST` ต้องส่ง** ·
   * `PATCH` ไม่ส่ง = คงเดิม · ผิด → 422 `details { field: 'donationThreshold', reason: REQUIRED|INVALID_FORMAT|OUT_OF_RANGE }` (`REQ-SVN-015` · `T-099`)
   */
  donationThreshold?: string | number;
  description?: string;
  status?: SouvenirStatus;
  /** int ≥ 0 · `null`/ไม่ส่ง = ไม่เตือน */
  lowStockThreshold?: number | null;
}

// ── รูปหลายรูป (`souvenir_images` · REQ-SVN-003 · `T-100` · SV-ADR-064) ──────────────────────────

/**
 * รูป 1 รูปของสินค้า — ไม่มี storage key · หน้าเว็บโหลดผ่าน `/souvenir-image/<souvenirId>/<size>?img=<id>&v=<version>`
 * API: `GET /souvenirs/:id/images/:imageId/:size` (READ_ONLY) · `…/public` (เฉพาะสินค้า `ACTIVE` · อื่น 404 กลาง)
 */
export interface SouvenirImageView {
  id: string;
  /** hex 8 ตัว เปลี่ยนทุกครั้งที่อัปโหลด/แทนที่ (`?v=` · ETag `"<version>-<size>"`) */
  version: string;
  /** 0..n-1 · 0 = รูปหลัก */
  sortOrder: number;
}

/**
 * body ของ `PUT /souvenirs/:id/images/order` — id ของรูป**ทุกรูป**ของสินค้านี้ตามลำดับใหม่ (ตัวแรก = รูปหลัก)
 * ขาด · เกิน · ซ้ำ · เป็นของสินค้าอื่น → 422 `SOUVENIR_IMAGE_ORDER_INVALID` `details { field: 'imageIds', reason }`
 */
export interface SouvenirImagesOrderInput {
  imageIds: string[];
}

/** คำตอบของ `POST /souvenirs/:id/images` · `DELETE /souvenirs/:id/images/:imageId` · `PUT /souvenirs/:id/images/order` = สถานะรูปหลังทำ */
export interface SouvenirImagesResult {
  souvenirId: string;
  /** version ของรูปหลักใหม่ (= `SouvenirListItemView.imageVersion`) · `null` = ไม่มีรูปแล้ว */
  imageVersion: string | null;
  images: SouvenirImageView[];
  /** เฉพาะ `POST` — รูปที่เพิ่งเพิ่ม (ต่อท้าย) */
  image?: SouvenirImageView;
}

// ── สต็อกแบบ lot (`souvenir_lots` + `souvenir_stock_movements` · REQ-SVN-007…011) ──────────────

/** lot 1 แถว = ของที่รับเข้าแต่ละครั้ง (`GET /souvenirs/:id/lots` ทั้งหมด · เรียง `receivedAt, id`) */
export interface SouvenirLotView {
  id: string;
  souvenirId: string;
  lotNo: string;
  /** วันที่รับ `YYYY-MM-DD` (DATE ไม่มีเวลา) — ลำดับ FIFO = `receivedAt, id` */
  receivedAt: string;
  qtyReceived: number;
  qtyRemaining: number;
  /** ต้นทุน/หน่วย DECIMAL(12,2) เป็นข้อความ (`"25.00"`) กันทศนิยมเพี้ยน · `null` = ไม่ระบุ */
  unitCost: string | null;
  /** วันหมดอายุ `YYYY-MM-DD` · `null` = ไม่มี (หน้าเว็บเตือนสีเมื่อใกล้/เลย) */
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** body ของ `POST /souvenirs/:id/lots` — รับเข้า lot ใหม่ → movement `RECEIVE +qty` */
export interface SouvenirLotReceiveInput {
  /** ว่าง = `formatSouvenirLotNo(ลำดับถัดไปของสินค้า)` · ซ้ำในสินค้าเดียวกัน → 422 `SOUVENIR_LOT_NO_TAKEN` */
  lotNo?: string;
  /** `YYYY-MM-DD` · ว่าง = วันนี้ (เวลาท้องถิ่นของเซิร์ฟเวอร์ตาม TZ ของแอป) */
  receivedAt?: string;
  /** จำนวนรับเข้า ≥ 1 */
  qty: number;
  /** ทศนิยม 2 ตำแหน่ง · ส่งเป็นข้อความหรือตัวเลขก็ได้ · `null`/ว่าง = ไม่ระบุ */
  unitCost?: string | number | null;
  expiresAt?: string | null;
  note?: string;
}

/** body ของ `PATCH /souvenirs/:id/lots/:lotId` — แก้ข้อมูล lot โดยไม่แตะจำนวน (จำนวนแก้ผ่าน adjust เท่านั้น) */
export interface SouvenirLotUpdateInput {
  lotNo?: string;
  receivedAt?: string;
  unitCost?: string | number | null;
  expiresAt?: string | null;
  note?: string;
}

/** body ของ `POST /souvenirs/:id/lots/:lotId/adjust` — `qtyRemaining += qty` ต้องไม่ติดลบ (422 `STOCK_INSUFFICIENT`) → movement `ADJUST ±qty` */
export interface StockAdjustInput {
  /** จำนวนที่ปรับ ≠ 0 (ลบได้ — นับสต็อก/ชำรุด · บวก = เพิ่มของเข้า lot เดิม) */
  qty: number;
  /** บังคับ ≤ `STOCK_NOTE_MAX_LENGTH` */
  note: string;
}

/** 1 แถวในสมุดบัญชีสต็อก (`GET /souvenirs/:id/movements?page=` ใหม่สุดก่อน) */
export interface StockMovementView {
  id: string;
  souvenirId: string;
  lotId: string | null;
  /** เลข lot ณ ปัจจุบัน · `null` = lot ถูกลบ (เกิดได้เฉพาะ lot ที่มีแค่ RECEIVE — movement นั้นถูกลบพร้อมกัน) */
  lotNo: string | null;
  type: StockMovementType;
  /** จำนวนมีเครื่องหมาย — รับเข้า/คืน `+n` · ตัดออก `−n` · ปรับยอด `±n` */
  qty: number;
  refType: StockRefType | null;
  refId: string | null;
  /** เลขเอกสารอ้างอิงที่คนอ่านรู้เรื่อง (เลขที่ออเดอร์) — หน้าเว็บทำลิงก์ `/orders/[refId]` */
  refNo: string | null;
  note: string | null;
  actorUserId: string | null;
  /** ชื่อผู้ทำ (`system_users`) · `null` = ระบบ / ผู้ใช้ถูกลบ */
  actorName: string | null;
  createdAt: string;
}
