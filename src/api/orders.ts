import type { DonationStatus, PaymentSlipFileView } from './donations';
import type { DonorAddressFormat, DonorAddressView, DonorStatus } from './donors';
import type { ApiListResponse } from './response';
import { formatSequenceCode } from './sequence-code';
import { SettingKey } from './settings';
import type { SouvenirStatus } from './souvenirs';

/**
 * ออเดอร์จัดส่งของที่ระลึกให้ผู้บริจาค + ใบแปะหน้ากล่อง (e-Donation) — `SV-CR-004` ข้อ 2 · `REQ-ORD-*` · FT-16 · SV-ADR-050/074 (สถานะ/สต็อก/ล็อก) · SV-ADR-051 (ใบแปะหน้า)
 * `T-077` (สัญญากลางนี้) · `T-079` (API `/orders`) · `T-081` (เว็บ `/orders/**` · `/print/orders-labels`)
 * enum / view / input / ค่าคงที่ที่ API และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/**
 * สถานะออเดอร์ (SV-ADR-074 · `T-110` — แทนตารางสถานะของ SV-ADR-050) — ลำดับ key = ลำดับงานซ้าย→ขวา (แท็บ/ตัวกรอง/timeline ใช้ลำดับนี้)
 * `DRAFT` รอยืนยัน (ค่าใน DB คงชื่อเดิม) · `CONFIRMED` ยืนยัน (ตัดสต็อกแล้ว) · `PREPARING` เตรียมจัดส่ง · `SHIPPED` จัดส่งแล้ว · `RECEIVED` รับสินค้าแล้ว ·
 * `CANCELLED` ยกเลิก (คืนสต็อกถ้าถืออยู่)
 */
export const OrderStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * สายงานปกติ (ไม่รวม `CANCELLED`) เรียงขั้น — เข้าสถานะ X = ตั้งเวลาของ X · ล้างเวลาของขั้น**หลัง** X (ย้อนสถานะ) · ปุ่มหลักหน้า view = ขั้นถัดไปในสายนี้
 * เวลาต่อขั้น: `DRAFT` = `createdAt` · `CONFIRMED` `confirmedAt` · `PREPARING` `preparingAt` · `SHIPPED` `shippedAt` · `RECEIVED` `receivedAt`
 */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.RECEIVED,
];

/** ขั้นถัดไปของสายงาน — `nextOrderStatus('CONFIRMED')` → `'PREPARING'` · `RECEIVED`/`CANCELLED` → `null` */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  return index < 0 || index === ORDER_STATUS_FLOW.length - 1 ? null : ORDER_STATUS_FLOW[index + 1];
}

/**
 * ตารางเปลี่ยนสถานะ (SV-ADR-074) — **API ตรวจ** (ไม่ตรง → 409 `ORDER_STATUS_INVALID` details `{ from, to }`) และ **ปุ่มหน้าเว็บเลือก** จากตัวเดียวกัน
 * ฐาน = ไปสถานะอื่นได้ทุกตัว (ข้ามขั้น/ย้อนได้ · ยกเลิกจากสถานะใดก็ได้ · ย้อนจากยกเลิกได้) ยกเว้นตัวเอง — ระบบลูกจำกัดเองได้ที่ตารางนี้ตารางเดียว
 */
const ALL_ORDER_STATUSES: readonly OrderStatus[] = Object.values(OrderStatus);
const otherOrderStatuses = (self: OrderStatus): readonly OrderStatus[] => ALL_ORDER_STATUSES.filter((status) => status !== self);
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  DRAFT: otherOrderStatuses(OrderStatus.DRAFT),
  CONFIRMED: otherOrderStatuses(OrderStatus.CONFIRMED),
  PREPARING: otherOrderStatuses(OrderStatus.PREPARING),
  SHIPPED: otherOrderStatuses(OrderStatus.SHIPPED),
  RECEIVED: otherOrderStatuses(OrderStatus.RECEIVED),
  CANCELLED: otherOrderStatuses(OrderStatus.CANCELLED),
};

/** `canTransition('DRAFT', 'DRAFT')` → `false` (ตัวเอง) · คู่อื่นตาม `ORDER_STATUS_TRANSITIONS` */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * กลุ่ม "ถือของ" (ตัดสต็อกแล้ว) — เข้ากลุ่ม = ตัด FIFO (422 `STOCK_INSUFFICIENT`/`SOUVENIR_SUSPENDED` = ไม่เปลี่ยนอะไร) ·
 * ออกจากกลุ่ม (ไป `DRAFT`/`CANCELLED`) = คืนยอดที่ถืออยู่ทั้งหมด (net · idempotent) · ย้ายภายในกลุ่ม = ไม่แตะสต็อก
 */
export const ORDER_STOCK_HELD_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.RECEIVED,
];

/** สถานะที่นับว่า "ออเดอร์เปิดอยู่" — กันลบสินค้าที่ถูกอ้างถึง (409 `SOUVENIR_IN_USE` details `openOrders`) · ยกเลิกออเดอร์จากรายการบริจาคได้ (`T-108`) */
export const ORDER_OPEN_STATUSES: readonly OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.PREPARING];

/**
 * สีต่อสถานะ (SV-ADR-075 · `T-111` · `REQ-SET-050`) — ตั้งค่าได้ในเมนู ตั้งค่า → ออเดอร์ (6 key หมวด `order` · `#RRGGBB` ตาม `SETTING_STRING_RULES`)
 * badge = จุดสี + พื้นสีจาง + ตัวอักษรสีปกติของธีม · แท็บที่เลือก = เส้นใต้ + ตัวเลขสีสถานะ · อ่านผ่าน `GET /orders/status-colors` (ค่าเสีย/ว่าง = ค่าเริ่มต้น)
 */
export const ORDER_STATUS_COLOR_KEYS: Readonly<Record<OrderStatus, SettingKey>> = {
  DRAFT: SettingKey.ORDER_STATUS_COLOR_DRAFT,
  CONFIRMED: SettingKey.ORDER_STATUS_COLOR_CONFIRMED,
  PREPARING: SettingKey.ORDER_STATUS_COLOR_PREPARING,
  SHIPPED: SettingKey.ORDER_STATUS_COLOR_SHIPPED,
  RECEIVED: SettingKey.ORDER_STATUS_COLOR_RECEIVED,
  CANCELLED: SettingKey.ORDER_STATUS_COLOR_CANCELLED,
};

/** ค่าเริ่มต้น (= seed `0022`) — ใช้เมื่อแถวหาย/ค่าเสีย · หน้าเว็บที่ผู้ใช้ไม่มีสิทธิ์ออเดอร์ · ปุ่ม "คืนค่าเริ่มต้น" */
export const ORDER_STATUS_COLOR_DEFAULTS: Readonly<OrderStatusColors> = {
  DRAFT: '#64748B',
  CONFIRMED: '#2563EB',
  PREPARING: '#D97706',
  SHIPPED: '#7C3AED',
  RECEIVED: '#16A34A',
  CANCELLED: '#DC2626',
};

/** response ของ `GET /orders/status-colors` — `#RRGGBB` ตัวพิมพ์ใหญ่ครบทุกสถานะ */
export type OrderStatusColors = Record<OrderStatus, string>;

/**
 * ส่วนของออเดอร์ที่แก้ได้ (`PATCH /orders/:id`) — `items` รายการของที่ระลึก · `donation` อ้างอิงรายการบริจาค (`sourceDonationId` · `T-117` · SV-ADR-079 —
 * ยอด/วันที่/หมายเหตุสลิป/ไฟล์หลักฐานมาจากรายการบริจาคเท่านั้น แก้เองไม่ได้) · `recipient` ผู้รับ (ชื่อ/เบอร์) + ที่อยู่จัดส่ง · `shipping` ขนส่ง/เลขพัสดุ · `note` หมายเหตุ
 */
export const OrderEditSection = {
  ITEMS: 'items',
  DONATION: 'donation',
  RECIPIENT: 'recipient',
  SHIPPING: 'shipping',
  NOTE: 'note',
} as const;
export type OrderEditSection = (typeof OrderEditSection)[keyof typeof OrderEditSection];

const ALL_ORDER_EDIT_SECTIONS: readonly OrderEditSection[] = Object.values(OrderEditSection);

/**
 * ล็อกการแก้ไขตามสถานะ (SV-ADR-074) — API ตรวจ (ส่งช่องของส่วนที่ล็อก → 409 `ORDER_NOT_EDITABLE` details `{ status, section }` ·
 * สถานะที่ไม่มีส่วนแก้ได้เลย → 409 details `{ status }`) และฟอร์มหน้าเว็บแสดงส่วนที่ล็อกเป็นอ่านอย่างเดียวจากตัวเดียวกัน
 * แก้รายการ/อ้างอิงรายการบริจาคหลังยืนยัน = ย้อนสถานะเป็นรอยืนยันก่อน (คืนสต็อก) · มีอ้างอิงอยู่แล้ว = เปลี่ยนไม่ได้ทุกสถานะ (409 `ORDER_DONATION_ALREADY_LINKED` — ยกเลิกออเดอร์แทน)
 */
export const ORDER_EDITABLE_SECTIONS: Readonly<Record<OrderStatus, readonly OrderEditSection[]>> = {
  DRAFT: ALL_ORDER_EDIT_SECTIONS,
  CONFIRMED: [OrderEditSection.RECIPIENT, OrderEditSection.SHIPPING, OrderEditSection.NOTE],
  PREPARING: [OrderEditSection.SHIPPING, OrderEditSection.NOTE],
  SHIPPED: [],
  RECEIVED: [],
  CANCELLED: [],
};

/** `canEditOrderSection('PREPARING', 'recipient')` → `false` */
export function canEditOrderSection(status: OrderStatus, section: OrderEditSection): boolean {
  return ORDER_EDITABLE_SECTIONS[status].includes(section);
}

/** ขนส่ง/เลขพัสดุส่งมากับ `POST /orders/:id/status` ได้เมื่อปลายทางเป็นสถานะเหล่านี้ (อื่น → 422 `VALIDATION_FAILED` `{ field, reason: 'STATUS_MISMATCH' }`) */
export const ORDER_SHIPPING_INPUT_STATUSES: readonly OrderStatus[] = [OrderStatus.PREPARING, OrderStatus.SHIPPED];

/** ตัวกรอง "พิมพ์ใบแปะหน้าแล้ว" ใน list (`GET /orders?printed=`) — `YES` มี `labelPrintedAt` · `NO` ยังไม่เคยพิมพ์ */
export const OrderPrintedFilter = {
  YES: 'YES',
  NO: 'NO',
} as const;
export type OrderPrintedFilter = (typeof OrderPrintedFilter)[keyof typeof OrderPrintedFilter];

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0008_souvenirs_orders.sql` (DOM-04) */
export const ORDER_RECIPIENT_NAME_MAX_LENGTH = 200;
/** ที่อยู่ผู้รับ snapshot เป็นข้อความหลายบรรทัด — เก็บเสมอ (แบบฟอร์ม → API แปลงด้วย `recipientAddressText` · SV-ADR-057) */
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

/** คำนำหน้าพื้นที่ที่ชื่อจากตารางอาจมีมาแล้ว — มีแล้วไม่เติมซ้ำ */
const AREA_PREFIX = /^(ต\.|ตำบล|แขวง|อ\.|อำเภอ|เขต|จ\.|จังหวัด)/;

function areaLabel(name: string | null, prefix: string): string | null {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return null;
  return AREA_PREFIX.test(trimmed) ? trimmed : `${prefix}${trimmed}`;
}

/** ส่วนของแบบฟอร์มที่ใช้สร้างข้อความ — ชื่อพื้นที่ภาษาไทย (`DonorAddressView` ส่งเข้าได้ตรง ๆ) */
export type RecipientAddressTextParts = Pick<
  DonorAddressView,
  'addressLine' | 'subdistrictNameTh' | 'districtNameTh' | 'provinceNameTh' | 'postcode'
>;

/**
 * แบบฟอร์มที่อยู่ → ข้อความหลายบรรทัด **ภาษาไทยเสมอ** (ใบแปะหน้า · list · ค้นหา ใช้ข้อความนี้) — SV-ADR-057
 * `<บรรทัดที่อยู่>\nต.<ตำบล> อ.<อำเภอ> จ.<จังหวัด> <รหัสไปรษณีย์>` (กรุงเทพฯ ใช้ แขวง/เขต และไม่ใส่ "จ.") · ส่วนที่ไม่มีข้อมูลข้าม · ว่างทั้งหมด = `null`
 * **API เป็นผู้สร้างข้อความที่บันทึก** (ข้อความที่ส่งมาพร้อมแบบฟอร์มไม่ถูกใช้) · หน้าเว็บเรียกตัวเดียวกันเพื่อแสดงตัวอย่างก่อนบันทึก
 */
export function recipientAddressText(parts: RecipientAddressTextParts): string | null {
  const province = parts.provinceNameTh?.trim() ?? '';
  const bangkok = province.includes('กรุงเทพ');
  const area = [
    areaLabel(parts.subdistrictNameTh, bangkok ? 'แขวง' : 'ต.'),
    areaLabel(parts.districtNameTh, bangkok ? 'เขต' : 'อ.'),
    province ? (bangkok ? province : areaLabel(province, 'จ.')) : null,
    parts.postcode?.trim() || null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const lines = [parts.addressLine?.trim() ?? '', area].filter((line) => line.length > 0);
  return lines.length > 0 ? lines.join('\n').slice(0, ORDER_RECIPIENT_ADDRESS_MAX_LENGTH) : null;
}

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

/**
 * 1 รายการในออเดอร์ — `souvenirCode` `souvenirName` `unit` `unitValue` `unitDonationThreshold` เป็น snapshot ตอนสร้าง/แก้ร่าง ·
 * ส่วน `souvenirValue` `souvenirDonationThreshold` `souvenirStatus` `stockOnHand` `imageVersion` เป็นค่าปัจจุบันของสินค้า
 */
export interface OrderItemView {
  id: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  unit: string | null;
  /** snapshot มูลค่า/หน่วย (บาท · `"120.50"`) — migration `0012` (ออเดอร์เดิม backfill จากมูลค่าสินค้า ณ วันรัน) · T-094 */
  unitValue: string;
  qty: number;
  /** `qty × unitValue` คิดเป็นสตางค์แล้วจัดรูป (`"361.50"`) */
  lineTotal: string;
  /** snapshot เกณฑ์ยอดบริจาค/หน่วย (บาท · `"1500.00"`) — migration `0014` (รายการเดิม backfill จากเกณฑ์ของสินค้า ณ วันรัน) · T-099 */
  unitDonationThreshold: string;
  /** `qty × unitDonationThreshold` คิดเป็นสตางค์แล้วจัดรูป (`"4501.50"`) */
  lineDonationThreshold: string;
  note: string | null;
  sortOrder: number;
  /** มูลค่า/หน่วยปัจจุบันของสินค้า — ฟอร์มแก้ร่างใช้คิดยอด (บันทึกร่าง = snapshot ค่านี้ใหม่) · `null` = สินค้าถูกลบ */
  souvenirValue: string | null;
  /** เกณฑ์ยอดบริจาคปัจจุบันของสินค้า — ฟอร์มแก้ร่างใช้คิดยอด (บันทึกร่าง = snapshot ค่านี้ใหม่) · `null` = สินค้าถูกลบ (T-099) */
  souvenirDonationThreshold: string | null;
  /** ค่าปัจจุบัน — ฟอร์มแก้ร่างใช้เตือน "จำนวน > คงเหลือ" · badge ระงับ · thumb (`null` = ไม่มีรูป / สินค้าถูกลบ) */
  souvenirStatus: SouvenirStatus | null;
  stockOnHand: number | null;
  imageVersion: string | null;
}

/** query ของ `GET /orders` — `q` ค้นเลขที่ · ชื่อผู้รับ · เบอร์ · เลขพัสดุ · รหัส/ชื่อผู้บริจาค · เรียง `created_at DESC` */
export interface OrderListQuery {
  q?: string;
  /** แท็บสถานะ (`?status=`) — กรองแถวเท่านั้น ไม่มีผลกับ `statusCounts` */
  status?: OrderStatus;
  printed?: OrderPrintedFilter;
  /** ลิงก์จากหน้าผู้บริจาค (`/orders?donorId=`) */
  donorId?: string;
  page?: number;
  perPage?: number;
}

/** จำนวนออเดอร์ต่อสถานะตามตัวกรองเดียวกับ list **ยกเว้น `status`** (แท็บ · SV-ADR-075) + `total` = ทุกสถานะ */
export type OrderStatusCounts = Record<OrderStatus, number> & { total: number };

/** response ของ `GET /orders` — envelope list กลาง (`ApiListResponse`) + `statusCounts` ระดับบนสุด (แบบ `DonationListResponse`) */
export interface OrderListResponse extends ApiListResponse<OrderListItemView> {
  statusCounts: OrderStatusCounts;
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
  /** ขนส่งที่เลือกจากรายการ (`T-096`) · `null` = ไม่ระบุ หรือข้อความเดิมก่อน 0013 ที่ไม่อยู่ในรายการ */
  shippingCarrierId: string | null;
  /** snapshot ชื่อขนส่ง ณ ตอนเลือก — ใบแปะหน้า / list / view / ค้นหา ใช้ข้อความนี้ (ไม่เปลี่ยนตามการแก้ชื่อในรายการ) */
  shippingCarrier: string | null;
  trackingNo: string | null;
  labelPrintedAt: string | null;
  labelPrintCount: number;
  /**
   * เวลาเข้าแต่ละขั้น (SV-ADR-074) — `null` = ยังไม่ถึง/ข้ามขั้น/ถูกล้างเพราะย้อนสถานะ (ย้อนไป X = ล้างเวลาของขั้นหลัง X) ·
   * ไป `CANCELLED` ไม่ล้างเวลาเดิม · ออกจาก `CANCELLED` = ล้าง `cancelledAt` + `cancelReason` (ประวัติอยู่ใน audit)
   */
  confirmedAt: string | null;
  /** เข้าสถานะเตรียมจัดส่ง — migration `0021` (`T-110`) */
  preparingAt: string | null;
  shippedAt: string | null;
  /** เข้าสถานะรับสินค้าแล้ว — migration `0021` (`T-110`) */
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * รายการบริจาคที่ออเดอร์นี้ออกมาจาก (`orders.source_donation_id` · `T-108` · SV-ADR-072) — ตั้งตอนสร้าง แก้ไม่ได้ · `null` = สร้างจากเมนูออเดอร์
   * ออเดอร์ที่ยังไม่ยกเลิก = ออเดอร์ active ของรายการนั้น (รายการเป็น `ORDERED` ⇔ มี ≥ 1 ใบ · แยกหลายใบได้ `T-113`) · ยกเลิกแล้วยังเก็บไว้เป็นประวัติ · ลบออเดอร์ที่มีค่านี้ไม่ได้ (409 `ORDER_LINKED_TO_DONATION`)
   */
  sourceDonation: OrderSourceDonationRef | null;
}

/** รายการบริจาคต้นทางของออเดอร์ — list/view แสดง "อ้างอิง DON…" (ลิงก์ `/donations/[id]`) + สถานะรายการบริจาคปัจจุบัน */
export interface OrderSourceDonationRef {
  id: string;
  donationNo: string;
  status: DonationStatus;
  /** รายการบริจาคถูกลบ (soft · หลังยกเลิกออเดอร์แล้ว) — แสดงเลขอย่างเดียวไม่ทำลิงก์ */
  deleted: boolean;
  /**
   * ชุดที่ออกพร้อมกัน (`T-113` · SV-ADR-077 · `0024`) — `batchNo` = ครั้งที่ออกออเดอร์จากรายการนั้น (1, 2, …) · `splitNo`/`splitTotal` = ใบที่ k จาก N ใบของชุด ·
   * ออกแบบไม่แยก = 1/1 · หน้าเว็บแสดง "แยก k/N" เมื่อ `splitTotal` > 1 · ยอดบริจาคของใบที่แยก = ยอดของทั้งรายการ (ไม่คิดงบคงเหลือต่อใบ)
   */
  batchNo: number;
  splitNo: number;
  splitTotal: number;
}

/** ออเดอร์อื่นในชุดเดียวกัน (`OrderView.siblings` · `T-113`) — รวมใบที่ยกเลิกแล้ว (ติดสถานะ) */
export interface OrderSplitSiblingView {
  id: string;
  orderNo: string;
  status: OrderStatus;
  splitNo: number;
  recipientName: string;
  totalQty: number;
}

/** แบบฟอร์มที่อยู่ผู้รับ (`OrderView.recipientStructuredAddress`) — รูปเดียวกับ `DonorAddressView` (ชื่อพื้นที่ th/en) ไม่รวม `format`/`text` */
export type OrderRecipientStructuredAddressView = Omit<DonorAddressView, 'format' | 'text'>;

/** หน้า view (`GET /orders/:id`) — ปุ่มที่ทำได้ = `ORDER_STATUS_TRANSITIONS[status]` · ส่วนที่แก้ได้ = `ORDER_EDITABLE_SECTIONS[status]` (ไม่ส่งซ้ำ) */
export interface OrderView extends OrderListItemView {
  /** สถานะผู้บริจาค ณ ปัจจุบัน (badge เตือนเมื่อ `SUSPENDED`) · `null` = ถูกลบ */
  donorStatus: DonorStatus | null;
  /** ข้อความล้วน — เก็บทุกรูปแบบ (`STRUCTURED` = ข้อความที่ API แปลงจากแบบฟอร์ม) · ใบแปะหน้า/list/ค้นหาใช้ตัวนี้ */
  recipientAddress: string | null;
  /** รูปแบบที่อยู่ของออเดอร์ (SV-ADR-057) — `null` = ออเดอร์ก่อน migration `0011` (ถือเป็น `TEXT` · แปลงภายหลังได้) */
  recipientAddressFormat: DonorAddressFormat | null;
  /** แบบฟอร์มที่บันทึกไว้ — มีค่าเฉพาะ `STRUCTURED` ที่กรอกแล้ว · `STRUCTURED` + `null` = ไม่มีที่อยู่ · `TEXT` = `null` เสมอ */
  recipientStructuredAddress: OrderRecipientStructuredAddressView | null;
  note: string | null;
  cancelReason: string | null;
  items: OrderItemView[];
  /** Σ `lineTotal` (สตางค์ · `sumSouvenirValue`) — `"1440.00"` · ไม่มีรายการ = `"0.00"` */
  totalValue: string;
  /** Σ `lineDonationThreshold` (สตางค์ · integer — ไม่ผ่าน float) — `"4502.00"` · ไม่มีรายการ = `"0.00"` · T-099 */
  totalDonationThreshold: string;
  /**
   * ยอดบริจาคและหลักฐานการโอน (`T-105` · SV-ADR-069 · `0018`) — ชุดเดียวกับ `DonationView` (`amount`/`donationDate`/`slipFiles`/`slipNote`) ·
   * ตั้งแต่ `T-117` (SV-ADR-079) = snapshot จากรายการบริจาคที่อ้างอิง (`sourceDonation`) เท่านั้น · ไม่มีอ้างอิงแต่มีค่า = ข้อมูลเดิมที่กรอกเองก่อน `T-117` (อ่านอย่างเดียว)
   * ยอด `"1500.00"` / วันที่ `YYYY-MM-DD` มาคู่กัน (`null` ทั้งคู่ = ไม่ระบุ) · งบของที่ระลึก = ยอด − `totalDonationThreshold` (เตือนเท่านั้น)
   */
  donationAmount: string | null;
  donationDate: string | null;
  /** ไฟล์หลักฐานการโอน ≤ `PAYMENT_SLIP_FILES_MAX` (`order_slip_files` · `0023`) เรียงตามลำดับอัปโหลด/คัดลอก · `[]` = ไม่มี */
  slipFiles: PaymentSlipFileView[];
  /** หมายเหตุหลักฐานการโอน ≤ `DONATION_SLIP_NOTE_MAX_LENGTH` · `null` = ไม่มี (มีได้แม้ไม่มีไฟล์) */
  slipNote: string | null;
  createdBy: OrderActorView | null;
  updatedBy: OrderActorView | null;
  /** ใบอื่นในชุดแยกเดียวกัน (`sourceDonation.batchNo` เดียวกัน · ไม่รวมใบนี้ · เรียง `splitNo`) · ไม่ได้แยก/ไม่ได้ออกจากรายการบริจาค = `[]` (`T-113`) */
  siblings: OrderSplitSiblingView[];
}

/**
 * ผู้รับ + ที่อยู่จัดส่ง (snapshot) ชุดเดียวกับ `OrderView` — ใช้ร่วมกับรายการบริจาค (`DonationView` · SV-ADR-065 · `T-101`)
 * หน้าเว็บใช้ตั้งค่าเริ่มต้นของ `RecipientSection` ได้จากทั้ง 2 view
 */
export type OrderRecipientView = Pick<
  OrderView,
  'recipientName' | 'recipientPhone' | 'recipientAddress' | 'recipientAddressFormat' | 'recipientStructuredAddress'
>;

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

/**
 * แบบฟอร์มที่อยู่ผู้รับ (`recipient.structuredAddress`) — `subdistrictId` เป็นแหล่งความจริง (API หาอำเภอ/จังหวัดเอง ·
 * `districtId`/`provinceId` ส่งมาได้เพื่อตรวจว่าตรงกับตำบล) · `postcode` ว่าง = ของตำบล · ทุกช่อง `''` = ไม่มีที่อยู่
 */
export interface OrderRecipientStructuredInput {
  addressLine: string;
  subdistrictId: string;
  districtId?: string;
  provinceId?: string;
  postcode?: string;
}

/**
 * ผู้รับ — ไม่ส่งตอนสร้าง = คัดลอกจากผู้บริจาค (ชื่อ · เบอร์ · รูปแบบ + ชุดที่ใช้งานของที่อยู่) · `''` = ล้างเบอร์/ที่อยู่
 * ที่อยู่ตาม `addressFormat` (SV-ADR-057):
 * - `STRUCTURED` → ตรวจแบบฟอร์ม **ครบ** แบบชุดที่ใช้งานของผู้บริจาค (422 `recipient.addressLine` / `recipient.subdistrictId` / `recipient.postcode` …) ·
 *   API สร้างข้อความเองด้วย `recipientAddressText` (`address` ที่ส่งมาไม่ถูกใช้) · แบบฟอร์มว่างทั้งหมด = ไม่มีที่อยู่ (รูปแบบยังเป็น `STRUCTURED`)
 * - `TEXT` หรือไม่ส่ง (client เดิม) → ใช้ `address` · ช่องแบบฟอร์มถูกล้าง · PATCH ที่ไม่ส่งทั้ง `addressFormat` และ `address` = ไม่แตะที่อยู่
 */
export interface OrderRecipientInput {
  name: string;
  /** รับรูปแบบที่ผู้ใช้พิมพ์ · API normalize แบบผู้บริจาค */
  phone?: string;
  /** ข้อความ — ใช้เมื่อ `addressFormat` เป็น `TEXT`/ไม่ส่ง */
  address?: string;
  addressFormat?: DonorAddressFormat;
  /** ใช้เมื่อ `addressFormat` = `STRUCTURED` (ไม่ส่ง = ว่าง) */
  structuredAddress?: OrderRecipientStructuredInput;
}

/** body ของ `POST /orders` — ได้ `DRAFT` · `confirm: true` = สร้างแล้วยืนยัน (ตัดสต็อก) ใน transaction เดียว · ยอด/หลักฐานการโอนมาจาก `sourceDonationId` เท่านั้น (`T-117`) */
export interface OrderCreateInput {
  donorId: string;
  recipient?: OrderRecipientInput;
  items: OrderItemInput[];
  note?: string;
  /** ขนส่งจากรายการ (`GET /shipping-carriers/options`) · ไม่ส่ง = ไม่เปลี่ยน · `null` = ล้าง (id + ชื่อ) · id ที่ปิดใช้งาน/ไม่พบ = 422 `field: 'carrierId'` (ยกเว้นเท่ากับค่าปัจจุบันของออเดอร์) */
  carrierId?: string | null;
  trackingNo?: string;
  /** อ้างอิงรายการบริจาค (`T-117`) — กติกาเดียวกับ `OrderUpdateInput.sourceDonationId` */
  sourceDonationId?: string;
  confirm?: boolean;
}

/**
 * body ของ `PATCH /orders/:id` — ส่งได้เฉพาะช่องของส่วนที่แก้ได้ในสถานะปัจจุบัน (`ORDER_EDITABLE_SECTIONS` · SV-ADR-074):
 * `items` → `items` · `sourceDonationId` → `donation` · `recipient` → `recipient` · `carrierId`/`trackingNo` → `shipping` · `note` → `note`
 * ส่งช่องของส่วนที่ล็อก (แม้ค่าเท่าเดิม) → 409 `ORDER_NOT_EDITABLE` `{ status, section }` · สถานะที่ไม่มีส่วนแก้ได้ → 409 `{ status }` · ตรวจซ้ำใต้ล็อก
 * `items` (เฉพาะ `DRAFT`): แทนทั้งชุด · snapshot ค่าปัจจุบันของสินค้าใหม่ทุกแถว · ไม่แตะสต็อก (ตัดตอนเข้าสถานะถือของ)
 */
export interface OrderUpdateInput {
  recipient?: OrderRecipientInput;
  items?: OrderItemInput[];
  note?: string;
  /** ขนส่งจากรายการ (`GET /shipping-carriers/options`) · ไม่ส่ง = ไม่เปลี่ยน · `null` = ล้าง (id + ชื่อ) · id ที่ปิดใช้งาน/ไม่พบ = 422 `field: 'carrierId'` (ยกเว้นเท่ากับค่าปัจจุบันของออเดอร์) */
  carrierId?: string | null;
  trackingNo?: string;
  /**
   * อ้างอิงรายการบริจาค (`T-117` · SV-ADR-079 · ส่วน `donation`) — id ของรายการ `CONFIRMED` ที่ไม่มีออเดอร์ active · ต้องมีสิทธิ์ `donations` MAINTAIN (ไม่มี → 403) ·
   * ไม่พบ/ถูกลบ → 404 · สถานะอื่น/มีออเดอร์แล้ว → 409 `DONATION_STATUS_INVALID` `{ from, to: 'ORDERED' }` · ผู้บริจาคไม่ตรงออเดอร์ → 422 `{ field: 'sourceDonationId', reason: 'DONOR_MISMATCH' }` ·
   * ออเดอร์มีอ้างอิงแล้ว → 409 `ORDER_DONATION_ALREADY_LINKED` · ไม่ใช่ `DRAFT` → 409 `ORDER_NOT_EDITABLE` `{ status, section: 'donation' }`
   * ผล (transaction เดียวกับการบันทึก): คัดลอกยอด/วันที่/หมายเหตุสลิป + ไฟล์หลักฐานทุกไฟล์ (แทนไฟล์เดิมของออเดอร์) · ชุดใหม่ 1/1 · รายการบริจาค → `ORDERED`
   * ของที่ระลึกของออเดอร์ = `items` ที่ส่งมา (ไม่บังคับให้เท่ารายการบริจาค) · ยอด/วันที่/หมายเหตุสลิปส่งเองไม่ได้ → 422 `{ field, reason: 'FROM_DONATION_ONLY' }`
   */
  sourceDonationId?: string;
}

/**
 * body ของ `POST /orders/:id/status` (SV-ADR-074) — เปลี่ยน/ย้อนสถานะตาม `ORDER_STATUS_TRANSITIONS` (ตัวเอง → 409 `ORDER_STATUS_INVALID`) ใน transaction เดียว:
 * สต็อกตาม `ORDER_STOCK_HELD_STATUSES` · เวลาตาม `ORDER_STATUS_FLOW` · ผูกรายการบริจาค (`T-113` · SV-ADR-077): ไป `CANCELLED` = ใบสุดท้ายที่ active → รายการกลับ `CONFIRMED` ·
 * ยังมีใบ active อื่น → รายการคง `ORDERED` · ออกจาก `CANCELLED` (มี `sourceDonation`) = รายการ `CONFIRMED` ไม่มีใบ active → `ORDERED` · รายการ `ORDERED` ที่ใบ active
 * ทั้งหมดอยู่ชุด (`batchNo`) เดียวกับใบนี้ → กลับเข้าชุด (รายการไม่เปลี่ยน) · อื่น ๆ (ชุดอื่น/ถูกลบ/สถานะอื่น) → 409 `ORDER_DONATION_RELINK_CONFLICT`
 * ทางลัดเดิม `/confirm` (→ CONFIRMED) · `/ship` (→ SHIPPED · `OrderShipInput`) · `/cancel` (→ CANCELLED · `OrderCancelInput`) เรียกตัวเดียวกัน
 */
export interface OrderStatusChangeInput {
  status: OrderStatus;
  /** บังคับเมื่อ `status = CANCELLED` (≤ `ORDER_CANCEL_REASON_MAX_LENGTH` · ช่องว่างล้วน → 422 `{ field: 'reason', reason: 'REQUIRED' }`) · สถานะอื่นส่งมา → 422 `STATUS_MISMATCH` */
  reason?: string;
  /** ใช้ได้เมื่อ `status` ∈ `ORDER_SHIPPING_INPUT_STATUSES` (กติกาเดียวกับ `OrderShipInput`) · สถานะอื่นส่งมา → 422 `{ field: 'carrierId', reason: 'STATUS_MISMATCH' }` */
  carrierId?: string | null;
  /** ใช้ได้เมื่อ `status` ∈ `ORDER_SHIPPING_INPUT_STATUSES` · `''` = ล้าง · สถานะอื่นส่งมา → 422 `{ field: 'trackingNo', reason: 'STATUS_MISMATCH' }` */
  trackingNo?: string;
}

/** body ของ `POST /orders/:id/ship` (ทางลัดของ `/status` → `SHIPPED`) — ไม่บังคับเลขพัสดุ (ส่งเองได้) */
export interface OrderShipInput {
  /** ขนส่งจากรายการ (`GET /shipping-carriers/options`) · ไม่ส่ง = ไม่เปลี่ยน · `null` = ล้าง (id + ชื่อ) · id ที่ปิดใช้งาน/ไม่พบ = 422 `field: 'carrierId'` (ยกเว้นเท่ากับค่าปัจจุบันของออเดอร์) */
  carrierId?: string | null;
  trackingNo?: string;
}

/** body ของ `POST /orders/:id/cancel` (ทางลัดของ `/status` → `CANCELLED`) — เหตุผลบังคับ ≤ `ORDER_CANCEL_REASON_MAX_LENGTH` */
export interface OrderCancelInput {
  reason: string;
}

/** body ของ `POST /orders/labels/printed` — หน้าพิมพ์ส่งหลัง `afterprint` (MAINTAIN) → `labelPrintedAt = now` · `labelPrintCount += 1` */
export interface OrderLabelsPrintedInput {
  ids: string[];
}
