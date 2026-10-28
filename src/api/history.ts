import { AuditAction } from '../enums/audit';
import { PermissionSubject } from '../permissions';
import type { ApiListResponse } from './response';

/**
 * "ประวัติการแก้ไข" ของรายการ (`T-107` · SV-ADR-071) — เมนูรายการบริจาค · ออเดอร์ · ของที่ระลึก · โปรแกรม · กองทุน · แคมเปญ (`T-125`)
 * อ่านจาก `audit_logs` (ไม่มีตารางใหม่ · อยู่นานเท่าระยะเก็บ log) → API แปลงเป็น entry ที่อ่านง่าย: ใคร · ทำอะไร · เมื่อไร · ช่องไหนเปลี่ยน
 * `GET /<เมนู>/history` = ทุกรายการของเมนู (รวมที่ลบ) · `GET /<เมนู>/:id/history` = รายการเดียว (id ที่ลบแล้วยังเปิดได้) · สิทธิ์ = READ_ONLY ของเมนูนั้น
 * ⚠️ ไม่มีค่าภายใน (storage key · ip · user agent · trace) — ช่องที่ส่งมาเฉพาะ whitelist ต่อเมนู (`RECORD_HISTORY_FIELDS`)
 */

/** เมนูที่มีประวัติการแก้ไข = permission subject ของเมนู (สิทธิ์ READ_ONLY ของเมนูนั้น) */
export const RECORD_HISTORY_MENUS = [
  PermissionSubject.DONATIONS,
  PermissionSubject.ORDERS,
  PermissionSubject.SOUVENIRS,
  // โปรแกรม · กองทุน · แคมเปญ (`SV-CR-006` · `T-125`) — ช่อง `status` = `FundraisingStatus` (จาก `isActive`)
  PermissionSubject.PROGRAMS,
  PermissionSubject.FUNDS,
  PermissionSubject.CAMPAIGNS,
] as const;
export type RecordHistoryMenu = (typeof RECORD_HISTORY_MENUS)[number];

/** ตัวกรอง "การกระทำ" ของหน้า history (คอลัมน์ `audit_logs.action`) */
export const RECORD_HISTORY_ACTIONS = [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE] as const;
export type RecordHistoryAction = (typeof RECORD_HISTORY_ACTIONS)[number];

/** คำค้นยาวสุด (เลขที่ / รหัส / ชื่อรายการ) */
export const RECORD_HISTORY_QUERY_MAX_LENGTH = 100;
/** ออเดอร์อื่นที่พิมพ์ใบแปะหน้าพร้อมกัน แสดงได้สูงสุดกี่ใบต่อ entry (ที่เหลือบอกเป็นจำนวน `summary.count`) */
export const RECORD_HISTORY_RELATED_MAX = 10;

/** เหตุการณ์ที่หน้าเว็บใช้เป็นหัวข้อของ entry (`history.event.<EVENT>`) */
export const RecordHistoryEvent = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
  /** ปุ่มยืนยัน/ปฏิเสธ/จัดส่ง/ยกเลิก */
  STATUS_CHANGED: 'STATUS_CHANGED',
  /** รายการบริจาค → ออกออเดอร์ (`T-108`) */
  ORDER_ISSUED: 'ORDER_ISSUED',
  /** รายการบริจาคกลับเป็นยืนยัน เพราะออเดอร์ถูกยกเลิก (`T-108`) */
  ORDER_RELEASED: 'ORDER_RELEASED',
  SLIP_UPLOADED: 'SLIP_UPLOADED',
  SLIP_REMOVED: 'SLIP_REMOVED',
  LABEL_PRINTED: 'LABEL_PRINTED',
  IMAGE_ADDED: 'IMAGE_ADDED',
  IMAGE_REPLACED: 'IMAGE_REPLACED',
  IMAGE_REMOVED: 'IMAGE_REMOVED',
  IMAGES_REORDERED: 'IMAGES_REORDERED',
  LOT_RECEIVED: 'LOT_RECEIVED',
  LOT_ADJUSTED: 'LOT_ADJUSTED',
  LOT_UPDATED: 'LOT_UPDATED',
  LOT_REMOVED: 'LOT_REMOVED',
} as const;
export type RecordHistoryEvent = (typeof RecordHistoryEvent)[keyof typeof RecordHistoryEvent];

/**
 * วิธีแสดงค่าของช่อง — `money` = ทศนิยม `"1500.00"` · `date` = `YYYY-MM-DD` หรือ ISO · `status` = enum สถานะของเมนูนั้น ·
 * `item` = ของที่ระลึก 1 แถว (`label` = รหัส · ชื่อ · before/after = จำนวน · `null` = ไม่มี → เพิ่ม/ลบ)
 */
export const RECORD_HISTORY_FIELD_KINDS = ['text', 'money', 'number', 'date', 'status', 'phone', 'item'] as const;
export type RecordHistoryFieldKind = (typeof RECORD_HISTORY_FIELD_KINDS)[number];

/** ชื่อช่องที่ส่งได้ต่อเมนู (whitelist) — หน้าเว็บแปลด้วย `history.field.<field>` (ต้องครบทั้ง th/en) */
export const RECORD_HISTORY_FIELDS = {
  [PermissionSubject.DONATIONS]: [
    'status', 'donor', 'donationDate', 'amount', 'fund', 'campaign', 'recipientName', 'recipientPhone', 'recipientAddress',
    'note', 'slipNote', 'rejectReason', 'order', 'reason', 'items', 'totalValue', 'totalDonationThreshold',
  ],
  [PermissionSubject.ORDERS]: [
    'status', 'donor', 'sourceDonation', 'recipientName', 'recipientPhone', 'recipientAddress', 'shippingCarrier',
    'trackingNo', 'note', 'cancelReason', 'donationAmount', 'donationDate', 'slipNote', 'items', 'totalValue', 'totalDonationThreshold',
  ],
  [PermissionSubject.SOUVENIRS]: [
    'code', 'name', 'category', 'unit', 'value', 'donationThreshold', 'status', 'lowStockThreshold', 'description',
    'lotNo', 'receivedAt', 'qtyReceived', 'qtyRemaining', 'unitCost', 'expiresAt', 'lotNote',
  ],
  /** `program` / `fund` = "รหัส · ชื่อ" ของแม่ (เทียบด้วย id) · รายการบริจาค `fund` / `campaign` แบบเดียวกัน (`T-126`) */
  [PermissionSubject.PROGRAMS]: ['code', 'name', 'description', 'status'],
  [PermissionSubject.FUNDS]: ['code', 'name', 'program', 'description', 'status'],
  [PermissionSubject.CAMPAIGNS]: ['code', 'name', 'fund', 'description', 'year', 'startDate', 'endDate', 'targetAmount', 'status'],
} as const satisfies Record<RecordHistoryMenu, readonly string[]>;
export type RecordHistoryField = (typeof RECORD_HISTORY_FIELDS)[RecordHistoryMenu][number];

export type RecordHistoryValue = string | number | null;

/** ช่องที่เปลี่ยน 1 ช่อง — CREATE: `before = null` (ค่าเริ่มต้น) · item: `before = null` เพิ่ม / `after = null` ลบ */
export interface RecordHistoryChange {
  field: RecordHistoryField;
  kind: RecordHistoryFieldKind;
  /** เฉพาะ `item` — "รหัส · ชื่อ" ของที่ระลึก */
  label?: string;
  before: RecordHistoryValue;
  after: RecordHistoryValue;
}

/** รายการที่ entry นี้เป็นของ — `deleted` = ถูกลบแล้ว (soft) หรือหาไม่พบแล้ว · `label` = เลขที่ / รหัส · ชื่อ */
export interface RecordHistoryRef {
  id: string;
  label: string;
  deleted: boolean;
}

export interface RecordHistorySummary {
  /** เลขล็อต (`LOT_*`) · เลขออเดอร์ (`ORDER_*`) */
  ref?: string | null;
  /** จำนวนออเดอร์ที่พิมพ์ใบแปะหน้าพร้อมกัน (`LABEL_PRINTED`) */
  count?: number;
  /** ออเดอร์ที่พิมพ์พร้อมกัน ≤ `RECORD_HISTORY_RELATED_MAX` ใบ (ประวัติรวม · `LABEL_PRINTED`) */
  related?: RecordHistoryRef[];
}

export interface RecordHistoryEntry {
  /** id ของ audit log */
  id: string;
  action: AuditAction;
  /** ชนิดของข้อมูลที่ถูกเขียน (`donation` `donation_status` `donation_slip` · `order` `order_status` `order_slip` `order_label` · `souvenir` `souvenir_image` `souvenir_lot` · `program` `fund` `campaign`) */
  entity: string;
  event: RecordHistoryEvent;
  /** `id = null` = ไม่ใช่ผู้ใช้ CMS (ระบบ / LINE) · `name = null` = ไม่ทราบ */
  actor: { id: string | null; name: string | null };
  createdAt: string;
  /** `null` = entry ที่ครอบหลายรายการ (พิมพ์ใบแปะหน้าหลายใบ — ดู `summary.related`) */
  record: RecordHistoryRef | null;
  changes: RecordHistoryChange[];
  summary?: RecordHistorySummary;
}

/** query ของ `GET /<เมนู>/history` และ `GET /<เมนู>/:id/history` (`q` ใช้เฉพาะแบบรวม) */
export interface RecordHistoryQuery {
  /** ค้นเลขที่ (รายการบริจาค/ออเดอร์) · รหัส/ชื่อ (ของที่ระลึก · โปรแกรม · กองทุน · แคมเปญ) — รวมรายการที่ลบแล้ว */
  q?: string;
  action?: RecordHistoryAction;
  /** ช่วงวันที่ทำ (`YYYY-MM-DD` เวลาไทย · รวมปลาย) */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

/** `GET /<เมนู>/history` */
export type RecordHistoryListResponse = ApiListResponse<RecordHistoryEntry>;

/** `GET /<เมนู>/:id/history` — envelope list กลาง + `record` (หัวหน้า · ใช้ได้แม้รายการถูกลบ) */
export interface RecordHistoryResponse extends ApiListResponse<RecordHistoryEntry> {
  record: RecordHistoryRef;
}
