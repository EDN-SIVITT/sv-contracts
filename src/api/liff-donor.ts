import type { DonationSource, DonationStatus, SlipFileKind } from './donations';
import type { SouvenirEligibilityMode } from './fundraising-souvenirs';
import type { OrderStatus } from './orders';
import type { SouvenirImageView } from './souvenirs';

/**
 * หน้า LINE OA ของผู้บริจาค 4 เมนู (`SV-CR-012` · SV-ADR-103…107) — บัญชีของฉัน (สรุป · ประวัติ · ติดตามของที่ระลึก · กดรับ · ให้คะแนน) ·
 * แจ้งการบริจาค · แคตตาล็อกของที่ระลึก — ทุก endpoint อยู่ใต้ `/liff/:channel/…` (LINE ID token · ไม่มี session CMS)
 *
 * กติกาข้อมูลที่ผู้บริจาคเห็น (SV-ADR-105): เงิน = DECIMAL เป็นข้อความ `"1234.50"` (คิดเป็นสตางค์ด้วย `./money`) · วันที่ `YYYY-MM-DD` · เวลา ISO UTC ·
 * **ไม่มี** หมายเหตุของเจ้าหน้าที่ · `slipNote` · `cancelReason` · มูลค่าของที่ระลึก (`value`) · จำนวนสต็อกจริง (ส่งเป็นระดับ `LiffStockLevel` + เพดานที่เลือกได้)
 * ของคนอื่น/ลบแล้ว/ไม่มี = 404 `NOT_FOUND` เดียวกันทุกกรณี
 */

// ── ค่าคงที่ ──────────────────────────────────────────────────────────────────────────────────────

/** ไฟล์หลักฐานการโอนต่อการแจ้ง 1 ครั้ง — อย่างน้อย 1 (SV-ADR-103 · Q-103) · มากสุด 5 (ผู้บริจาคไม่ต้องจัดการไฟล์เยอะ · CMS เพิ่มได้ถึง `PAYMENT_SLIP_FILES_MAX`) */
export const LIFF_DONATION_SLIP_FILES_MIN = 1;
export const LIFF_DONATION_SLIP_FILES_MAX = 5;
/** หมายเหตุถึงเจ้าหน้าที่ (เก็บใน `donations.note`) */
export const LIFF_DONATION_NOTE_MAX_LENGTH = 500;
/** ของที่ระลึกต่อการแจ้ง 1 ครั้ง (ชนิด) — เท่ากับเพดานของ CMS */
export const LIFF_DONATION_ITEMS_MAX = 50;
/** `requestId` ของการแจ้ง (UUID v4 ที่หน้าเว็บสุ่มตอนเปิดฟอร์ม) — ส่งซ้ำ = คืนรายการเดิม (กันกดซ้ำ/เน็ตหลุดแล้วลองใหม่) */
export const LIFF_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** หน้า list ของบัญชีของฉัน — ค่าเริ่มต้น/เพดานต่อหน้า */
export const LIFF_LIST_PAGE_SIZE = 20;
export const LIFF_LIST_PAGE_SIZE_MAX = 50;

/** คะแนนความพึงพอใจของผู้รับ (SV-ADR-106) — 1 ไม่พอใจมาก … 5 พอใจมาก · ความเห็นไม่บังคับ */
export const ORDER_RATING_MIN = 1;
export const ORDER_RATING_MAX = 5;
export const ORDER_RATING_COMMENT_MAX_LENGTH = 500;

// ── ของที่ระลึก (ใช้ร่วมฟอร์มแจ้งบริจาค + แคตตาล็อก) ─────────────────────────────────────────────────

/** ระดับของที่พร้อมส่ง (ไม่บอกจำนวนจริง) — `OUT` คงเหลือ ≤ 0 · `LOW` ≤ `low_stock_threshold` ของชิ้นนั้น · `AVAILABLE` อื่น ๆ */
export const LiffStockLevel = {
  AVAILABLE: 'AVAILABLE',
  LOW: 'LOW',
  OUT: 'OUT',
} as const;
export type LiffStockLevel = (typeof LiffStockLevel)[keyof typeof LiffStockLevel];

// ── ② แจ้งการบริจาค: ตัวเลือกปลายทาง (`GET …/donate/options`) ─────────────────────────────────────

/** แคมเปญที่เปิดรับ = เกณฑ์ `OPEN_CAMPAIGNS` เดิม + วันนี้ (Asia/Bangkok) อยู่ในช่วงวันที่ของแคมเปญ (null = ไม่จำกัด · SV-ADR-104) */
export interface LiffCampaignOption {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

/** กองทุนที่เปิดรับ (active ตลอดสาย) · `campaigns` ว่าง = บริจาคเข้ากองทุนโดยไม่ระบุแคมเปญ · `program` = `null` เมื่อไม่มีโปรแกรมหรือชั้นโปรแกรมปิด */
export interface LiffFundOption {
  id: string;
  name: string;
  description: string | null;
  program: { id: string; name: string } | null;
  campaigns: LiffCampaignOption[];
}

/** เรียง: (ชั้นโปรแกรมเปิด) ชื่อโปรแกรม → ชื่อกองทุน → id · แคมเปญ: วันสิ้นสุดใกล้ก่อน (null ท้าย) → ชื่อ → id · `today` = วันนี้ของ Bangkok (ค่าเริ่มต้นวันโอน + ห้ามอนาคต) */
export interface LiffDonateOptionsView {
  programEnabled: boolean;
  today: string;
  funds: LiffFundOption[];
}

/** query ของ `GET …/donate/souvenirs` — `date` = วันโอน (กฎมีผลตามวันนั้น · ไม่ส่ง = วันนี้) */
export interface LiffDonateSouvenirsQuery {
  fundId?: string;
  campaignId?: string;
  date?: string;
}

/**
 * ของที่ระลึกที่เลือกได้ในบริบทนี้ (กติกาเดียวกับฟอร์ม CMS — `resolveSouvenirEligibility`) · `minAmount` = เกณฑ์ต่อชิ้น (`"0.00"` = ไม่มีเกณฑ์) ·
 * งบ: Σ qty × minAmount ≤ ยอดบริจาค (`DONATION_SOUVENIR_OVER_AMOUNT`) · `maxQty` = เพดานจากของที่พร้อมส่งในบริบทนี้ (โควตาแคมเปญเมื่อ `ALLOCATED`) — 0 = หมด
 */
export interface LiffEligibleSouvenirView {
  id: string;
  name: string;
  unit: string;
  description: string | null;
  images: SouvenirImageView[];
  minAmount: string;
  stockLevel: LiffStockLevel;
  maxQty: number;
}

/** `mode` = `NONE` → แคมเปญไม่แจกของ (ซ่อนส่วนของที่ระลึก) · เรียงตามกฎ (`sort_order`) แล้วชื่อ */
export interface LiffDonateSouvenirsView {
  mode: SouvenirEligibilityMode;
  items: LiffEligibleSouvenirView[];
}

/**
 * body ของ `POST …/donor/donations` (multipart: field `payload` = JSON นี้ · field `files` = ไฟล์หลักฐาน 1–5) — `ACTIVE` เท่านั้น
 * ผู้บริจาค = จาก token · สถานะ `PENDING` · `source = LINE_OA` · ผู้รับ = ที่อยู่ในบัญชี (มีของแต่ไม่มีที่อยู่ = 422 `DONATION_RECIPIENT_ADDRESS_REQUIRED`)
 * ตรวจเหมือน `POST /donations` + วันที่ของแคมเปญ + ของพร้อมส่ง (`DONATION_SOUVENIR_OUT_OF_STOCK`) · `requestId` ซ้ำ (ผู้บริจาคเดิม) = 200 คืนรายการเดิม
 */
export interface LiffDonationReportInput {
  requestId: string;
  amount: string;
  donationDate: string;
  fundId: string | null;
  campaignId: string | null;
  items: { souvenirId: string; qty: number }[];
  note?: string | null;
}

// ── ③ แคตตาล็อกของที่ระลึก (`GET …/souvenirs` · `GET …/souvenirs/:id`) ──────────────────────────────

/** ของชิ้นนี้รับได้จากแคมเปญไหน — กฎที่มีผลวันนี้ · `untilDate` = วันที่สิ้นสุดที่มาก่อนระหว่างกฎกับแคมเปญ (null = ไม่จำกัด) */
export interface LiffSouvenirOfferView {
  campaignId: string;
  campaignName: string;
  fundId: string;
  fundName: string;
  /** `null` = ไม่มีโปรแกรม / ชั้นโปรแกรมปิด */
  programName: string | null;
  minAmount: string;
  untilDate: string | null;
}

/** การ์ดในแคตตาล็อก — เฉพาะของ `ACTIVE` ที่ผูกด้วยกฎกับแคมเปญที่เปิดรับ (SV-ADR-104) · `minAmountFrom` = เกณฑ์ต่ำสุดของทุก offer */
export interface LiffSouvenirCardView {
  id: string;
  name: string;
  unit: string;
  images: SouvenirImageView[];
  stockLevel: LiffStockLevel;
  minAmountFrom: string;
  offers: LiffSouvenirOfferView[];
}

/** `campaigns` = แคมเปญที่มีของในแคตตาล็อกอย่างน้อย 1 ชิ้น (ชิปกรอง) · การ์ดเรียงชื่อ → id */
export interface LiffSouvenirCatalogView {
  campaigns: { id: string; name: string; fundName: string }[];
  items: LiffSouvenirCardView[];
}

export interface LiffSouvenirDetailView extends LiffSouvenirCardView {
  description: string | null;
}

// ── ① บัญชีของฉัน: สรุป (`GET …/donor/summary`) ─────────────────────────────────────────────────────

/**
 * ยอดสะสม = สถานะ `DONATION_COUNTED_STATUSES` (CONFIRMED + ORDERED · ตรงกับ `donors.donation_total` ของ CMS) · รอตรวจสอบ = `PENDING` (แยก · ไม่รวม) ·
 * `years` = นับยอดเท่านั้น ปีของ `donation_date` (ค.ศ. — หน้าเว็บแสดง พ.ศ.) ใหม่ → เก่า · `fundCount`/`campaignCount` = ที่ไม่ซ้ำในรายการนับยอด
 */
export interface LiffDonorSummaryView {
  totalAmount: string;
  donationCount: number;
  firstDonationDate: string | null;
  lastDonationDate: string | null;
  fundCount: number;
  campaignCount: number;
  pendingCount: number;
  pendingAmount: string;
  years: { year: number; amount: string; count: number }[];
  /** Σ จำนวนของในออเดอร์ที่ได้รับแล้ว */
  souvenirReceivedQty: number;
  /** ออเดอร์ `SHIPPED` (รอกดรับ) */
  ordersToReceive: number;
  /** ออเดอร์ `RECEIVED` ที่ยังไม่มีคะแนน */
  ordersToRate: number;
  /** ออเดอร์ `DRAFT` · `CONFIRMED` · `PREPARING` · `SHIPPED` */
  ordersInProgress: number;
}

// ── ① บัญชีของฉัน: รายการบริจาค ───────────────────────────────────────────────────────────────────

/**
 * ความคืบหน้าของของที่ระลึกของรายการบริจาค (คำนวณที่ API) — `NONE` ไม่ได้ขอของ · `WAITING` ขอแล้ว ยังไม่ออกการจัดส่ง ·
 * `PREPARING` มีการจัดส่งที่ยังไม่ส่ง (DRAFT/CONFIRMED/PREPARING) · `SHIPPED` ส่งแล้วอย่างน้อย 1 และยังไม่ได้รับครบ · `RECEIVED` ได้รับครบทุกใบที่ไม่ยกเลิก ·
 * `CANCELLED` ทุกใบถูกยกเลิก
 */
export const LiffSouvenirProgress = {
  NONE: 'NONE',
  WAITING: 'WAITING',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type LiffSouvenirProgress = (typeof LiffSouvenirProgress)[keyof typeof LiffSouvenirProgress];

export interface LiffRefView {
  id: string;
  name: string;
}

/** แถวรายการบริจาคของตัวเอง — เรียง `donation_date` ใหม่ → เก่า แล้ว id ใหม่ → เก่า · ไม่รวมที่ลบ */
export interface LiffDonationListItem {
  id: string;
  donationNo: string;
  amount: string;
  donationDate: string;
  status: DonationStatus;
  source: DonationSource;
  program: LiffRefView | null;
  fund: LiffRefView | null;
  campaign: LiffRefView | null;
  /** Σ จำนวนของที่ขอ (0 = ไม่ได้ขอ) */
  souvenirQty: number;
  souvenirProgress: LiffSouvenirProgress;
  createdAt: string;
}

/** ไฟล์หลักฐานของตัวเอง — อ่านที่ `GET …/donor/donations/:id/slips/:fileId/:size?v=<version>` (PDF มีแค่ `full`) */
export interface LiffSlipFileView {
  id: string;
  kind: SlipFileKind;
  version: string;
}

export interface LiffRecipientView {
  name: string;
  /** แสดงผลแบบมีขีด */
  phone: string;
  /** ที่อยู่ข้อความเต็ม (snapshot) */
  address: string;
}

export interface LiffDonationDetailView extends LiffDonationListItem {
  /** เหตุผลที่เจ้าหน้าที่ปฏิเสธ (เฉพาะ `REJECTED` — ผู้บริจาคเห็น · CMS เตือนตอนกรอก) */
  rejectReason: string | null;
  /** เวลาที่เจ้าหน้าที่ยืนยัน/ปฏิเสธ */
  reviewedAt: string | null;
  /** หมายเหตุที่ผู้บริจาคเขียนเอง (`source = LINE_OA` เท่านั้น · รายการของเจ้าหน้าที่ = `null` เสมอ) */
  note: string | null;
  slips: LiffSlipFileView[];
  items: LiffOrderItemView[];
  recipient: LiffRecipientView | null;
  /** การจัดส่งที่ออกจากรายการนี้ (ไม่รวมที่ลบ) เรียงชุด → ใบที่ */
  orders: LiffOrderListItem[];
}

// ── ① บัญชีของฉัน: การจัดส่งของที่ระลึก (ออเดอร์) ─────────────────────────────────────────────────────

export interface LiffOrderItemView {
  souvenirId: string;
  name: string;
  unit: string;
  qty: number;
  /** รูปของชิ้นนั้นตอนนี้ (ของที่ลบ/ระงับ = ว่าง — รูปสาธารณะเปิดเฉพาะ ACTIVE) */
  images: SouvenirImageView[];
}

export interface LiffOrderRatingView {
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** ออเดอร์ทั้งหมดของผู้บริจาค (ทุกที่มา · ไม่รวมที่ลบ) — เรียง: SHIPPED → DRAFT/CONFIRMED/PREPARING → RECEIVED/CANCELLED แล้ว `created_at` ใหม่ → เก่า */
export interface LiffOrderListItem {
  id: string;
  orderNo: string;
  status: OrderStatus;
  /** `DRAFT` ที่ของยังไม่พอ (นิยามเดียวกับ `OrderListItem.awaitingStock`) */
  awaitingStock: boolean;
  createdAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  shippingCarrier: string | null;
  trackingNo: string | null;
  totalQty: number;
  items: LiffOrderItemView[];
  /** มาจากรายการบริจาค (`source_donation_id`) · แยกส่ง = `splitNo`/`splitTotal` (ใบที่ k จาก N) */
  donation: { id: string; donationNo: string; splitNo: number | null; splitTotal: number | null } | null;
  rating: LiffOrderRatingView | null;
}

export interface LiffOrderDetailView extends LiffOrderListItem {
  recipient: LiffRecipientView;
  /** ใบอื่นในชุดแยกส่งเดียวกัน (ไม่รวมใบนี้ · ไม่รวมที่ลบ) */
  siblings: { id: string; orderNo: string; status: OrderStatus; splitNo: number | null }[];
}

/** body ของ `PUT …/donor/orders/:id/rating` — `RECEIVED` เท่านั้น (อื่น 409 `ORDER_RATING_NOT_ALLOWED`) · ส่งซ้ำ = แก้คะแนนเดิม · `comment` `''`/`null` = ไม่มี */
export interface OrderRatingInput {
  rating: number;
  comment?: string | null;
}

/** คะแนนในหน้า view ออเดอร์ของ CMS (`OrderView.rating`) */
export interface OrderRatingView {
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  /** ผู้ให้คะแนน = ผู้บริจาคของออเดอร์ (ชื่อ/รหัสปัจจุบันจากเมนูผู้บริจาค) — ผ่าน LINE OA เท่านั้น */
  donorCode: string;
  donorName: string | null;
}
