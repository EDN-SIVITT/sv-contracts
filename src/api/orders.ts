import type { DonorStatus } from './donors';
import { formatSequenceCode } from './sequence-code';
import type { SouvenirStatus } from './souvenirs';

/**
 * ออเดอร์จัดส่งของที่ระลึกให้ผู้บริจาค + ใบแปะหน้ากล่อง (e-Donation) — `SV-CR-004` ข้อ 2 · `REQ-ORD-*` · FT-16 · SV-ADR-050 (สถานะ/สต็อก) · SV-ADR-051 (ใบแปะหน้า)
 * `T-077` (สัญญากลางนี้) · `T-079` (API `/orders`) · `T-081` (เว็บ `/orders/**` · `/print/orders-labels`)
 * enum / view / input / ค่าคงที่ที่ API และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/** สถานะออเดอร์ — `DRAFT` ร่าง · `CONFIRMED` ยืนยันแล้ว (ตัดสต็อกแล้ว) · `SHIPPED` จัดส่งแล้ว (สิ้นสุด) · `CANCELLED` ยกเลิก (คืนสต็อกถ้าเคยยืนยัน) */
export const OrderStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * ตารางเปลี่ยนสถานะ (SV-ADR-050) — **API ตรวจ** (ไม่ตรง → 409 `ORDER_STATUS_INVALID` details `{ from, to }`) และ **ปุ่มหน้าเว็บเลือก** จากตัวเดียวกัน
 * DRAFT ─confirm→ CONFIRMED ─ship→ SHIPPED · DRAFT/CONFIRMED ─cancel→ CANCELLED · SHIPPED / CANCELLED = สิ้นสุด
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [],
  CANCELLED: [],
};

/** `canTransition('DRAFT', 'SHIPPED')` → `false` (ต้องยืนยันก่อน) */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** สถานะที่นับว่า "ออเดอร์เปิดอยู่" — กันลบสินค้าที่ถูกอ้างถึง (409 `SOUVENIR_IN_USE` details `openOrders`) */
export const ORDER_OPEN_STATUSES: readonly OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.CONFIRMED];

/** ตัวกรอง "พิมพ์ใบแปะหน้าแล้ว" ใน list (`GET /orders?printed=`) — `YES` มี `labelPrintedAt` · `NO` ยังไม่เคยพิมพ์ */
export const OrderPrintedFilter = {
  YES: 'YES',
  NO: 'NO',
} as const;
export type OrderPrintedFilter = (typeof OrderPrintedFilter)[keyof typeof OrderPrintedFilter];

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0008_souvenirs_orders.sql` (DOM-04) */
export const ORDER_RECIPIENT_NAME_MAX_LENGTH = 200;
/** ที่อยู่ผู้รับ snapshot เป็นข้อความหลายบรรทัด (ที่อยู่ `STRUCTURED` ของผู้บริจาคถูกแปลงเป็นข้อความตอนสร้าง) */
export const ORDER_RECIPIENT_ADDRESS_MAX_LENGTH = 1000;
export const ORDER_NOTE_MAX_LENGTH = 1000;
export const ORDER_SHIPPING_CARRIER_MAX_LENGTH = 100;
export const ORDER_TRACKING_NO_MAX_LENGTH = 100;
export const ORDER_CANCEL_REASON_MAX_LENGTH = 500;
export const ORDER_ITEM_NOTE_MAX_LENGTH = 500;
/** รายการต่อออเดอร์ ≥ 1 (422 `ORDER_ITEMS_EMPTY`) และ ≤ 50 */
export const ORDER_ITEMS_MAX = 50;
/** `GET /orders/labels?ids=` รับได้ครั้งละไม่เกิน 100 ออเดอร์ */
export const ORDER_LABELS_MAX = 100;

/**
 * เลขที่ออเดอร์ = `prefix + เลขลำดับเติม 0` (`order.noPrefix` · `order.noDigits` — REQ-SET-040) · ค่าด้านล่างเป็นค่าสำรองเมื่อ DB ยังไม่มีแถว
 * เลขลำดับจาก `running_numbers` แถว `ORDER_RUNNING_NUMBER_KEY` · ออกตอนสร้าง · unique รวมแถวที่ลบแล้ว
 */
export const ORDER_NO_PREFIX_DEFAULT = 'ORD';
export const ORDER_NO_DIGITS_DEFAULT = 6;
export const ORDER_RUNNING_NUMBER_KEY = 'order';

/** `formatOrderNo('ORD', 6, 1)` → `ORD000001` — alias ของ `formatSequenceCode` */
export function formatOrderNo(prefix: string, digits: number, n: number): string {
  return formatSequenceCode(prefix, digits, n);
}

// ── ใบแปะหน้ากล่อง (สติ๊กเกอร์ฉลากยา · REQ-ORD-010… · SV-ADR-051) ─────────────────────────────

/** ขนาดสติ๊กเกอร์สำเร็จรูป (mm) — ปุ่ม chip ในหน้าตั้งค่าเติม `order.labelWidthMm`/`labelHeightMm` · "กำหนดเอง" = พิมพ์ตัวเลขเอง */
export interface OrderLabelPreset {
  /** `"<w>x<h>"` ใช้เป็น id ของ chip และคีย์ i18n ได้ (ไม่มีจุด) */
  key: string;
  widthMm: number;
  heightMm: number;
}

/** 70×50 = ค่าเริ่มต้น (ฉลากยาร้านขายยาไทย · เครื่องพิมพ์ความร้อนทั่วไป) · 100×150 = ฉลากพัสดุขนส่ง */
export const ORDER_LABEL_PRESETS: readonly OrderLabelPreset[] = [
  { key: '50x30', widthMm: 50, heightMm: 30 },
  { key: '60x40', widthMm: 60, heightMm: 40 },
  { key: '70x50', widthMm: 70, heightMm: 50 },
  { key: '80x50', widthMm: 80, heightMm: 50 },
  { key: '100x75', widthMm: 100, heightMm: 75 },
  { key: '100x150', widthMm: 100, heightMm: 150 },
];

/** ค่าสำรองของค่าตั้งค่าใบแปะหน้าเมื่อ DB ยังไม่มีแถว — ช่วงที่รับได้อยู่ใน `SETTING_NUMBER_BOUNDS` (`./settings.ts`) */
export const ORDER_LABEL_WIDTH_MM_DEFAULT = 70;
export const ORDER_LABEL_HEIGHT_MM_DEFAULT = 50;
export const ORDER_LABEL_MARGIN_MM_DEFAULT = 2;
/** จำนวนบรรทัดบนดวง (CR ข้อ 2.4) — ที่อยู่ผู้รับ ≤ 3 บรรทัด (ellipsis) · รายการของ ≤ 3 บรรทัด (เกิน = "+N รายการ") */
export const ORDER_LABEL_ADDRESS_MAX_LINES = 3;
export const ORDER_LABEL_ITEMS_MAX_LINES = 3;

/** ค่าตั้งค่าใบแปะหน้าที่ API อ่านจากหมวด `order` ส่งมาพร้อม `OrderLabelsResponse` — หน้าพิมพ์และตัวอย่างสดในหน้าตั้งค่าใช้ตัวเดียวกัน */
export interface OrderLabelSettings {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  /** `''` = หน้าเว็บแสดงชื่อระบบแทน */
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  showItems: boolean;
  showBarcode: boolean;
}

// ── โมเดล (`orders` + `order_items` · CR ข้อ 2.1) ───────────────────────────────────────────────

/** ผู้ใช้ที่สร้าง/แก้ล่าสุด (`system_users`) — แสดงชื่อในหน้า view */
export interface OrderActorView {
  id: string;
  /** `null` = ผู้ใช้ถูกลบ */
  displayName: string | null;
}

/** 1 รายการในออเดอร์ — `souvenirCode` `souvenirName` `unit` เป็น snapshot ตอนสร้าง/แก้ · ส่วน `souvenirStatus` `stockOnHand` `imageVersion` เป็นค่าปัจจุบันของสินค้า */
export interface OrderItemView {
  id: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  unit: string | null;
  qty: number;
  note: string | null;
  sortOrder: number;
  /** ค่าปัจจุบัน — ฟอร์มแก้ร่างใช้เตือน "จำนวน > คงเหลือ" · badge ระงับ · thumb (`null` = ไม่มีรูป / สินค้าถูกลบ) */
  souvenirStatus: SouvenirStatus | null;
  stockOnHand: number | null;
  imageVersion: string | null;
}

/** query ของ `GET /orders` — `q` ค้นเลขที่ · ชื่อผู้รับ · เบอร์ · เลขพัสดุ · รหัส/ชื่อผู้บริจาค · เรียง `created_at DESC` */
export interface OrderListQuery {
  q?: string;
  status?: OrderStatus;
  printed?: OrderPrintedFilter;
  /** ลิงก์จากหน้าผู้บริจาค (`/orders?donorId=`) */
  donorId?: string;
  page?: number;
  perPage?: number;
}

/** แถวในหน้า list (`GET /orders`) */
export interface OrderListItemView {
  id: string;
  orderNo: string;
  status: OrderStatus;
  donorId: string;
  /** ข้อมูลผู้บริจาค ณ ปัจจุบัน · `null` = ผู้บริจาคถูกลบ (ออเดอร์ยังเปิดดูได้ · FK RESTRICT กัน hard delete) */
  donorCode: string | null;
  donorName: string | null;
  /** snapshot ผู้รับ — แก้เฉพาะออเดอร์นี้ ไม่กระทบผู้บริจาค */
  recipientName: string;
  /** ตัวเลขล้วนขึ้นต้น 0 — แสดงด้วย `formatThaiPhone()` */
  recipientPhone: string | null;
  /** cache บนออเดอร์ — `2 รายการ · 5 ชิ้น` */
  itemCount: number;
  totalQty: number;
  shippingCarrier: string | null;
  trackingNo: string | null;
  labelPrintedAt: string | null;
  labelPrintCount: number;
  confirmedAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** หน้า view (`GET /orders/:id`) — ปุ่มที่ทำได้ = `ORDER_STATUS_TRANSITIONS[status]` (ไม่ส่งซ้ำ) */
export interface OrderView extends OrderListItemView {
  /** สถานะผู้บริจาค ณ ปัจจุบัน (badge เตือนเมื่อ `SUSPENDED`) · `null` = ถูกลบ */
  donorStatus: DonorStatus | null;
  recipientAddress: string | null;
  note: string | null;
  cancelReason: string | null;
  items: OrderItemView[];
  createdBy: OrderActorView | null;
  updatedBy: OrderActorView | null;
}

/** ผู้รับบนใบแปะหน้า — `addressLines` แยกบรรทัดแล้ว (หน้าเว็บตัดที่ `ORDER_LABEL_ADDRESS_MAX_LINES`) */
export interface OrderLabelRecipient {
  name: string;
  phone: string | null;
  addressLines: string[];
}

export interface OrderLabelItem {
  name: string;
  qty: number;
  unit: string | null;
}

/** 1 ออเดอร์ = 1 ดวง (`GET /orders/labels?ids=`) */
export interface OrderLabelView {
  id: string;
  orderNo: string;
  status: OrderStatus;
  createdAt: string;
  recipient: OrderLabelRecipient;
  items: OrderLabelItem[];
  itemCount: number;
  totalQty: number;
}

/** ออเดอร์ที่ถูกข้ามตอนพิมพ์ — `CANCELLED` (มีค่าครบ) · ไม่พบ/ถูกลบ = `orderNo`/`status` เป็น `null` (หน้าพิมพ์แสดง `#id`) */
export interface OrderLabelSkipped {
  id: string;
  orderNo: string | null;
  status: OrderStatus | null;
}

/** response ของ `GET /orders/labels?ids=1,2,3` — `labels` เรียงตามลำดับ `ids` ที่ส่ง · ≤ `ORDER_LABELS_MAX` */
export interface OrderLabelsResponse {
  labels: OrderLabelView[];
  skipped: OrderLabelSkipped[];
  settings: OrderLabelSettings;
}

// ── input ─────────────────────────────────────────────────────────────────────────────────────

/** 1 รายการใน body — ห้ามซ้ำ `souvenirId` ในออเดอร์เดียว (422 `ORDER_ITEM_DUPLICATE`) · ลำดับใน array = `sortOrder` */
export interface OrderItemInput {
  souvenirId: string;
  /** ≥ 1 */
  qty: number;
  note?: string;
}

/** ผู้รับ — ไม่ส่งตอนสร้าง = คัดลอกจากผู้บริจาค (ชื่อ · เบอร์ · ที่อยู่แปลงเป็นข้อความ) · `''` = ล้างเบอร์/ที่อยู่ */
export interface OrderRecipientInput {
  name: string;
  /** รับรูปแบบที่ผู้ใช้พิมพ์ · API normalize แบบผู้บริจาค */
  phone?: string;
  address?: string;
}

/** body ของ `POST /orders` — ได้ `DRAFT` · `confirm: true` = สร้างแล้วยืนยัน (ตัดสต็อก) ใน transaction เดียว */
export interface OrderCreateInput {
  donorId: string;
  recipient?: OrderRecipientInput;
  items: OrderItemInput[];
  note?: string;
  carrier?: string;
  trackingNo?: string;
  confirm?: boolean;
}

/**
 * body ของ `PATCH /orders/:id` — `DRAFT`: ทุกช่อง (`items` แทนทั้งชุด) · `CONFIRMED`: เฉพาะ `recipient` `note` `carrier` `trackingNo`
 * (ส่ง `items` มา → 409 `ORDER_NOT_EDITABLE`) · `SHIPPED`/`CANCELLED` → 409
 */
export interface OrderUpdateInput {
  recipient?: OrderRecipientInput;
  items?: OrderItemInput[];
  note?: string;
  carrier?: string;
  trackingNo?: string;
}

/** body ของ `POST /orders/:id/ship` — ไม่บังคับเลขพัสดุ (ส่งเองได้) */
export interface OrderShipInput {
  carrier?: string;
  trackingNo?: string;
}

/** body ของ `POST /orders/:id/cancel` — เหตุผลบังคับ ≤ `ORDER_CANCEL_REASON_MAX_LENGTH` */
export interface OrderCancelInput {
  reason: string;
}

/** body ของ `POST /orders/labels/printed` — หน้าพิมพ์ส่งหลัง `afterprint` (MAINTAIN) → `labelPrintedAt = now` · `labelPrintCount += 1` */
export interface OrderLabelsPrintedInput {
  ids: string[];
}
