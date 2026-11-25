/**
 * นำเข้ารายการบริจาคเก่าจากไฟล์ .xlsx (`SV-CR-035` §3 · SV-ADR-178 · `T-261` · `T-262`)
 *
 * `POST /donations/import/preview` (multipart `file` + `campaignId`) = อ่าน + ตรวจ + จับคู่ผู้บริจาค/ของที่ระลึก **ไม่เขียน DB** → `DonationImportPreview`
 * `POST /donations/import` (multipart `file` + `sha256` จาก preview + `campaignId`) = ตรวจซ้ำทั้งไฟล์ → เขียนทั้งไฟล์ใน transaction เดียว → `DonationImportResult`
 * `campaignId` (บังคับ · `T-265` · SV-ADR-180) = แคมเปญของ**ทุกรายการ**ในไฟล์ (กองทุน = กองทุนของแคมเปญ) — กติกาเดียวกับเลือกในฟอร์ม: เปิดใช้งานทั้งสาย ·
 *   ไม่ส่ง/รูปแบบผิด 400 · ไม่พบ/ลบ/ปิด 422 `DONATION_CAMPAIGN_UNAVAILABLE` · กองทุน/โปรแกรมปิด 422 `DONATION_FUND_UNAVAILABLE` · ย้ายกองทุนระหว่างยืนยัน 422 `DONATION_CAMPAIGN_FUND_MISMATCH`
 * สิทธิ์: donations FULL + orders MAINTAIN + donors MAINTAIN · ไฟล์ ≤ `DONATION_IMPORT_MAX_BYTES` · แถว ≤ `DONATION_IMPORT_MAX_ROWS`
 * ผล: ผู้บริจาค (จับเบอร์ · มีแล้วไม่แก้) · รายการบริจาค (`ORDERED` มีของ / `CONFIRMED` ไม่มีของ) · ออเดอร์ `COMPLETED` · เวลาทุกขั้น = `timestamp` ของแถว
 */

/** หัวคอลัมน์ที่รู้จัก (ไม่สนตัวพิมพ์ · ช่องว่าง/ขีด = `_`) — คอลัมน์**หลัง** `status` = รหัสของที่ระลึก (`souvenirs.code`) */
export const DonationImportColumn = {
  TIMESTAMP: 'timestamp',
  DONOR_NAME: 'donor_name',
  PHONE_NUMBER: 'phone_number',
  ADDRESS: 'address',
  EVIDENCE: 'evidence',
  REMARK: 'remark',
  DONATION_AMOUNT: 'donation_amount',
  REQUESTED_SOUVENIR_NOTE: 'requested_souvenir_note',
  REQUESTED_QUANTITY_NOTE: 'requested_quantity_note',
  STATUS: 'status',
} as const;
export type DonationImportColumn = (typeof DonationImportColumn)[keyof typeof DonationImportColumn];
export const DONATION_IMPORT_COLUMNS = Object.values(DonationImportColumn) as readonly DonationImportColumn[];
/** ต้องมีในหัวตาราง — ขาด = ทั้งไฟล์ไม่ผ่าน */
export const DONATION_IMPORT_REQUIRED_COLUMNS: readonly DonationImportColumn[] = [
  DonationImportColumn.TIMESTAMP,
  DonationImportColumn.DONOR_NAME,
  DonationImportColumn.PHONE_NUMBER,
  DonationImportColumn.DONATION_AMOUNT,
];
/** ชื่อเดิมที่รับแทนกันได้ → ชื่อมาตรฐาน */
export const DONATION_IMPORT_COLUMN_ALIASES: Readonly<Record<string, DonationImportColumn>> = {
  donation: DonationImportColumn.DONATION_AMOUNT,
  amount: DonationImportColumn.DONATION_AMOUNT,
  phone: DonationImportColumn.PHONE_NUMBER,
  name: DonationImportColumn.DONOR_NAME,
};

export const DONATION_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const DONATION_IMPORT_MAX_ROWS = 1000;
/** คอลัมน์รหัสของที่ระลึกต่อไฟล์ */
export const DONATION_IMPORT_MAX_SOUVENIR_COLUMNS = 50;
export const DONATION_IMPORT_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** ระดับของปัญหา — `ERROR` = ทั้งไฟล์นำเข้าไม่ได้จนกว่าจะแก้ · `WARNING` = นำเข้าได้แต่ควรรู้ · `INFO` = บอกให้ทราบ */
export const DonationImportIssueLevel = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;
export type DonationImportIssueLevel = (typeof DonationImportIssueLevel)[keyof typeof DonationImportIssueLevel];

/**
 * รหัสปัญหา (เว็บแปลด้วย `donations.import.issue.<code>` + `params`) —
 * ระดับไฟล์: `FILE_*` `SHEET_EMPTY` `HEADER_*` `NO_ROWS` `TOO_MANY_ROWS` `SOUVENIR_COLUMNS_TOO_MANY` `SOUVENIR_COLUMN_UNKNOWN` (WARNING — คอลัมน์ที่ไม่มีใครขอ)
 * ระดับแถว (ERROR): เวลา · ชื่อ · เบอร์ · ยอด · จำนวนของ · รหัสไม่พบ · ยาวเกิน · (WARNING): ของถูกระงับ · สต็อกไม่พอ (จะติดลบ) · หลักฐานไม่ใช่ลิงก์ (เก็บเป็นข้อความ) ·
 * ข้อมูลประกอบยาวเกิน (ตัด) · ซ้ำในไฟล์/ซ้ำกับที่นำเข้าแล้ว (ข้าม) · (INFO): ผู้บริจาคมีอยู่แล้ว (ไม่แก้โปรไฟล์)
 */
export const DonationImportIssueCode = {
  FILE_REQUIRED: 'FILE_REQUIRED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_NOT_XLSX: 'FILE_NOT_XLSX',
  FILE_UNREADABLE: 'FILE_UNREADABLE',
  SHEET_EMPTY: 'SHEET_EMPTY',
  HEADER_MISSING: 'HEADER_MISSING',
  HEADER_DUPLICATE: 'HEADER_DUPLICATE',
  NO_ROWS: 'NO_ROWS',
  TOO_MANY_ROWS: 'TOO_MANY_ROWS',
  SOUVENIR_COLUMNS_TOO_MANY: 'SOUVENIR_COLUMNS_TOO_MANY',
  SOUVENIR_COLUMN_UNKNOWN: 'SOUVENIR_COLUMN_UNKNOWN',
  TIMESTAMP_REQUIRED: 'TIMESTAMP_REQUIRED',
  TIMESTAMP_INVALID: 'TIMESTAMP_INVALID',
  TIMESTAMP_FUTURE: 'TIMESTAMP_FUTURE',
  NAME_REQUIRED: 'NAME_REQUIRED',
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
  PHONE_REQUIRED: 'PHONE_REQUIRED',
  PHONE_INVALID: 'PHONE_INVALID',
  AMOUNT_REQUIRED: 'AMOUNT_REQUIRED',
  AMOUNT_INVALID: 'AMOUNT_INVALID',
  AMOUNT_OUT_OF_RANGE: 'AMOUNT_OUT_OF_RANGE',
  QTY_INVALID: 'QTY_INVALID',
  SOUVENIR_NOT_FOUND: 'SOUVENIR_NOT_FOUND',
  SOUVENIR_SUSPENDED: 'SOUVENIR_SUSPENDED',
  STOCK_SHORT: 'STOCK_SHORT',
  EVIDENCE_AS_TEXT: 'EVIDENCE_AS_TEXT',
  INFO_TRUNCATED: 'INFO_TRUNCATED',
  DUPLICATE_IN_FILE: 'DUPLICATE_IN_FILE',
  ALREADY_IMPORTED: 'ALREADY_IMPORTED',
  DONOR_EXISTING: 'DONOR_EXISTING',
} as const;
export type DonationImportIssueCode = (typeof DonationImportIssueCode)[keyof typeof DonationImportIssueCode];

export interface DonationImportIssue {
  level: DonationImportIssueLevel;
  code: DonationImportIssueCode;
  /** แถวใน Excel (1 = หัวตาราง) · `null` = ทั้งไฟล์ */
  row: number | null;
  /** หัวคอลัมน์ตามไฟล์ · `null` = ไม่เจาะคอลัมน์ */
  column: string | null;
  /** ค่าประกอบข้อความ (`max` · `code` · `onHand` · `requested` · `value` …) */
  params?: Record<string, string | number>;
}

/** ผลจับคู่ผู้บริจาคด้วยเบอร์ (ผู้บริจาคที่ยังไม่ถูกลบ) — `NEW` = จะสร้างใหม่ (ชื่อ/เบอร์/ที่อยู่ข้อความจากแถวแรกของเบอร์นี้) */
export type DonationImportDonorMatch =
  | { status: 'NEW' }
  | { status: 'EXISTING'; id: string; donorCode: string; fullName: string | null };

export interface DonationImportItemPreview {
  /** หัวคอลัมน์ = รหัสของที่ระลึก */
  code: string;
  souvenirId: string | null;
  name: string | null;
  unit: string | null;
  qty: number;
}

export const DonationImportRowAction = {
  CREATE: 'CREATE',
  SKIP: 'SKIP',
} as const;
export type DonationImportRowAction = (typeof DonationImportRowAction)[keyof typeof DonationImportRowAction];

export interface DonationImportPreviewRow {
  /** แถวใน Excel */
  row: number;
  action: DonationImportRowAction;
  /** ISO (UTC) — `null` = อ่านไม่ได้ (มี error) */
  timestamp: string | null;
  /** วันที่ตามเวลาไทยของ `timestamp` `YYYY-MM-DD` */
  donationDate: string | null;
  donorName: string;
  /** normalize แล้ว (`0812345678`) · อ่านไม่ได้ = ค่าดิบ */
  phone: string;
  address: string | null;
  /** `"6000.00"` · `null` = อ่านไม่ได้ */
  amount: string | null;
  evidence: { kind: 'LINK' | 'TEXT'; value: string } | null;
  /** ข้อความที่จะลง "ข้อมูลประกอบ" (ไม่แสดงต่อผู้บริจาค) */
  additionalInfo: string | null;
  donor: DonationImportDonorMatch;
  items: DonationImportItemPreview[];
  issues: DonationImportIssue[];
}

export interface DonationImportSouvenirColumn {
  code: string;
  souvenirId: string | null;
  name: string | null;
  /** คงเหลือตอนนี้ (ก่อนนำเข้า) · `null` = ไม่พบสินค้า */
  stockOnHand: number | null;
  /** Σ จำนวนที่จะตัดจากไฟล์ (แถวที่จะสร้าง) */
  requestedQty: number;
}

export interface DonationImportSummary {
  /** แถวข้อมูลในไฟล์ */
  rows: number;
  toCreate: number;
  skipped: number;
  newDonors: number;
  existingDonors: number;
  orders: number;
  souvenirQty: number;
  /** Σ ยอดของแถวที่จะสร้าง `"12500.00"` */
  amountTotal: string;
  errors: number;
  warnings: number;
}

/** ชื่อของกองทุน/แคมเปญ/โปรแกรมในหน้า review */
export interface DonationImportFundraisingName {
  id: string;
  code: string | null;
  name: string;
}

/** แคมเปญที่ทุกรายการในไฟล์จะผูก (`T-265`) — `program` = `null` เมื่อชั้นโปรแกรมปิด (SV-ADR-090) หรือกองทุนยังไม่จัดโปรแกรม */
export interface DonationImportCampaign extends DonationImportFundraisingName {
  fund: DonationImportFundraisingName;
  program: DonationImportFundraisingName | null;
}

export interface DonationImportPreview {
  /** แคมเปญที่เลือก (ตรวจแล้วว่าเลือกได้) — ยืนยันต้องส่ง `campaignId` เดิม */
  campaign: DonationImportCampaign;
  fileName: string | null;
  /** SHA-256 hex ของไฟล์ — ส่งกลับมาตอนยืนยัน */
  sha256: string;
  sheetName: string | null;
  souvenirColumns: DonationImportSouvenirColumn[];
  rows: DonationImportPreviewRow[];
  /** ปัญหาระดับไฟล์ (`row = null`) */
  fileIssues: DonationImportIssue[];
  summary: DonationImportSummary;
  /** ไม่มี ERROR ทั้งไฟล์ + มีแถวที่จะสร้าง ≥ 1 */
  canImport: boolean;
}

export interface DonationImportCreatedRef {
  row: number;
  donationId: string;
  donationNo: string;
  orderId: string | null;
  orderNo: string | null;
}

export interface DonationImportResult {
  batchId: string;
  donationCount: number;
  orderCount: number;
  donorCreatedCount: number;
  skippedCount: number;
  amountTotal: string;
  created: DonationImportCreatedRef[];
}
