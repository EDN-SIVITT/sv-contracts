import { PermissionSubject } from '../permissions';
import { DASHBOARD_DAY_BUCKET_MAX_DAYS, DASHBOARD_EXPIRING_WITHIN_DAYS, ymdAddDays, ymdDiffDays } from './dashboard';
import { DONATION_COUNTED_STATUSES, DonationStatus, type DonationSource } from './donations';
import type { DonorLineStatus, DonorRegistrationChannel, DonorStatus } from './donors';
import { OrderStatus, type OrderPrintedFilter } from './orders';
import type { SouvenirStatus, StockFilter, StockMovementType, StockRefType } from './souvenirs';

/**
 * เมนู "รายงาน" (`SV-CR-009` ข้อ 2 · FT-19 · SV-ADR-095/096) — โครงกลาง + R1 ยอดบริจาค (`T-138`) · R2–R6 (`T-139` · `T-140`) เพิ่มต่อในไฟล์นี้
 * แต่ละรายงานมี 2 endpoint: `GET /reports/<slug>` (บนจอ · ตารางหลักแบ่งหน้า · ไม่ audit) และ `GET /reports/<slug>/export?format=xlsx|pdf`
 * (ทุกแถว ≤ `REPORT_EXPORT_MAX_ROWS` — นับก่อนดึงแถว เกิน = 422 `REPORT_TOO_MANY_ROWS` · audit `EXPORT`)
 * สิทธิ์ 2 ชั้น: `reports` READ_ONLY **และ** READ_ONLY ของทุกเมนูต้นทางใน `REPORT_SOURCE_SUBJECTS` (กันรายงานเป็นทางลัดเห็นข้อมูลที่เมนูต้นทางปิดไว้)
 * วันที่ = `YYYY-MM-DD` ตามวันไทย (ช่วงเดียวกับ Dashboard — `dashboardRangeProblem` · ≤ 366 วัน · ไม่ส่ง = เดือนนี้) ·
 * เงิน = ข้อความ DECIMAL `"1234.50"` (รวมใน SQL · คิดต่อด้วยสตางค์) · % = ข้อความทศนิยม 2 ตำแหน่ง `"12.34"` (ปัดครึ่งขึ้น)
 */

/** รายงานทั้งหมด — ค่า = slug ของ path (`/reports/<slug>`) · ลำดับ key = ลำดับการ์ดในหน้า `/reports` */
export const ReportKey = {
  DONATIONS: 'donations',
  DONORS: 'donors',
  PENDING: 'pending',
  SHIPPING: 'shipping',
  DISTRIBUTION: 'distribution',
  STOCK: 'stock',
} as const;
export type ReportKey = (typeof ReportKey)[keyof typeof ReportKey];

export const REPORT_KEYS = Object.values(ReportKey) as readonly ReportKey[];

export function isReportKey(value: unknown): value is ReportKey {
  return typeof value === 'string' && (REPORT_KEYS as readonly string[]).includes(value);
}

/**
 * เมนูต้นทางของแต่ละรายงาน — ต้องมี READ_ONLY ครบทุกตัว (API ตรวจทุก endpoint · หน้า `/reports` ใช้ทำการ์ดจาง "ต้องมีสิทธิ์ดูเมนู …")
 * ตัวแรก = `@AlsoRequirePermission` ของ endpoint · ตัวที่เหลือ API ตรวจเพิ่มด้วย `assertPermission` (R3 = รายการบริจาค + ออเดอร์)
 */
export const REPORT_SOURCE_SUBJECTS: Readonly<Record<ReportKey, readonly PermissionSubject[]>> = {
  donations: [PermissionSubject.DONATIONS],
  donors: [PermissionSubject.DONORS],
  pending: [PermissionSubject.DONATIONS, PermissionSubject.ORDERS],
  shipping: [PermissionSubject.ORDERS],
  distribution: [PermissionSubject.ORDERS],
  stock: [PermissionSubject.SOUVENIRS],
};

/** ส่งออก Excel ได้สูงสุดกี่แถว (ตารางรายการ) — เกิน = 422 `REPORT_TOO_MANY_ROWS` `{ limit, total }` ให้กรองแคบลง */
export const REPORT_EXPORT_MAX_ROWS = 20_000;
/** หน้าพิมพ์ (PDF) แนบตารางรายการได้สูงสุดกี่แถว — เกิน = พิมพ์เฉพาะสรุป + ข้อความให้ใช้ Excel (API ไม่ดึงรายการ · `omitted`) */
export const REPORT_PRINT_MAX_ROWS = 2_000;
/** จำนวนแถวต่อหน้าของตารางบนจอ — ไม่ส่ง = 50 · รับ 1–100 (หน้าเว็บใช้ตัวเลือก 20/50/100 ของ `Pagination`) */
export const REPORT_PAGE_SIZE_DEFAULT = 50;
export const REPORT_PAGE_SIZE_MAX = 100;

export const ReportExportFormat = {
  XLSX: 'xlsx',
  PDF: 'pdf',
} as const;
export type ReportExportFormat = (typeof ReportExportFormat)[keyof typeof ReportExportFormat];

/** `details` ของ 422 `REPORT_TOO_MANY_ROWS` */
export interface ReportTooManyRowsDetails {
  limit: number;
  total: number;
}

/** แบ่งหน้าของตารางบนจอ — `total` = ทุกแถวที่ตรงตัวกรอง (ไม่ใช่แค่หน้านี้) */
export interface ReportPageMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** ตาราง 1 ชุดของรายงาน — บนจอ = 1 หน้า · export = ทุกแถว (`page` 1 · `pageSize` = `total`) */
export interface ReportTablePage<Row> {
  items: Row[];
  meta: ReportPageMeta;
}

/** ช่วงที่ API ใช้จริง (วันไทย · รวมปลายทาง) */
export interface ReportRangeView {
  from: string;
  to: string;
  days: number;
}

/**
 * envelope กลางของทุกรายงาน — `tables` = ตารางของรายงานนั้น (ชื่อ key ตามรายงาน)
 * รายงานที่มีหลายตาราง (R3 3 ส่วน · R6 3 แท็บ) ใช้ query `tab` เลือกตารางที่แบ่งหน้า — ตารางอื่นที่ไม่ได้ขอ = `null` (ไม่ query)
 */
export interface ReportEnvelope<K extends ReportKey, Filters, Kpis, Tables> {
  report: K;
  /** เวลาที่ API คำนวณ (ISO UTC) — หน้าเว็บแสดง "ข้อมูล ณ …" */
  generatedAt: string;
  /** `null` = รายงาน ณ ตอนนี้ไม่มีช่วงวันที่ (R3) */
  range: ReportRangeView | null;
  /** ตัวกรองที่ใช้จริงหลังตรวจ/เติมค่าเริ่มต้น (+ ชื่อของ id ที่เลือก) — ไฟล์ส่งออกเขียนเป็นข้อความได้ตรงกับข้อมูล */
  filters: Filters;
  kpis: Kpis;
  tables: Tables;
}

/** ส่วนเพิ่มของคำตอบ `/export` */
export interface ReportExportMeta {
  format: ReportExportFormat;
  /** ตารางที่ไม่ได้แนบเพราะยาวเกินเพดานของรูปแบบนี้ (PDF > `REPORT_PRINT_MAX_ROWS`) — ตารางนั้นใน `tables` = `null` */
  omitted: { table: string; total: number; limit: number }[];
}

/** query แบ่งหน้าร่วมของ `GET /reports/<slug>` */
export interface ReportPagingQuery {
  page?: number;
  pageSize?: number;
}

/**
 * % ของ `part` ต่อ `whole` เป็นข้อความทศนิยม 2 ตำแหน่ง ปัดครึ่งขึ้น (จำนวนเต็มล้วน · ค่าไม่ติดลบ) — `whole` = 0 → `"0.00"`
 * ใช้ทั้งสัดส่วนของยอดรวม (ผลรวมแต่ละแถวอาจไม่เท่า 100.00 พอดี) และ % ถึงเป้า (เกิน 100 ได้)
 */
export function percentText(part: number, whole: number): string {
  if (!Number.isSafeInteger(part) || !Number.isSafeInteger(whole) || part < 0 || whole < 0) throw new RangeError(`percentText: ${part}/${whole}`);
  if (whole === 0) return '0.00';
  // hundredths = round(part × 10000 / whole) — BigInt กันล้น safe integer (ยอดสตางค์ × 10000)
  const hundredths = (BigInt(part) * 20_000n + BigInt(whole)) / (2n * BigInt(whole));
  return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}`;
}

// ── R1 ยอดบริจาค (`/reports/donations` · `T-138`) ────────────────────────────────────────────

/** ตัวกรองสถานะ — `COUNTED` (ค่าเริ่มต้น) = `DONATION_COUNTED_STATUSES` นิยามเดียวกับรายรับของ Dashboard · `ALL` = ทุกสถานะ */
export const DonationReportStatus = {
  COUNTED: 'COUNTED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  ALL: 'ALL',
} as const;
export type DonationReportStatus = (typeof DonationReportStatus)[keyof typeof DonationReportStatus];

export const DONATION_REPORT_DEFAULT_STATUS = DonationReportStatus.COUNTED;

/** สถานะของรายการที่ตัวกรองแต่ละค่าครอบ (`null` = ไม่กรองสถานะ) */
export const DONATION_REPORT_STATUSES: Readonly<Record<DonationReportStatus, readonly DonationStatus[] | null>> = {
  COUNTED: DONATION_COUNTED_STATUSES,
  PENDING: [DonationStatus.PENDING],
  REJECTED: [DonationStatus.REJECTED],
  ALL: null,
};

/** การจัดกลุ่มของตารางสรุป — `PROGRAM` ใช้ได้เฉพาะชั้นโปรแกรมเปิด (ปิด = 422 `PROGRAM_LAYER_DISABLED`) */
export const DonationReportGroupBy = {
  DAY: 'DAY',
  MONTH: 'MONTH',
  PROGRAM: 'PROGRAM',
  FUND: 'FUND',
  CAMPAIGN: 'CAMPAIGN',
  SOURCE: 'SOURCE',
} as const;
export type DonationReportGroupBy = (typeof DonationReportGroupBy)[keyof typeof DonationReportGroupBy];

/** ไม่ส่ง `groupBy` = รายวันเมื่อช่วง ≤ 31 วัน (แบบกราฟ Dashboard) · ยาวกว่านั้น = รายเดือน — ใช้ทั้ง API และหน้าเว็บ */
export function donationReportDefaultGroupBy(days: number): DonationReportGroupBy {
  return days <= DASHBOARD_DAY_BUCKET_MAX_DAYS ? DonationReportGroupBy.DAY : DonationReportGroupBy.MONTH;
}

/** แท็บของหน้า R1 — `summary` ไม่ดึงรายการ (`tables.detail = null`) · `detail` = รายการแบ่งหน้า */
export const DonationReportTab = {
  SUMMARY: 'summary',
  DETAIL: 'detail',
} as const;
export type DonationReportTab = (typeof DonationReportTab)[keyof typeof DonationReportTab];

/** key ของแถว "ไม่ระบุ" ในสรุปตามโปรแกรม/กองทุน/แคมเปญ (= `DONATION_FUND_FILTER_NONE` ของตัวกรอง) */
export const DONATION_REPORT_NONE_KEY = 'none';

/**
 * query ของ `GET /reports/donations` — ตัวกรองกองทุน/แคมเปญ/โปรแกรมความหมายเดียวกับ `GET /donations` (`fundId=none` = ยังไม่ระบุกองทุน ·
 * `programId` = กองทุนในโปรแกรมนี้ตามโปรแกรมปัจจุบันของกองทุน) · ชั้นโปรแกรมปิด + ส่ง `programId` = 422 `PROGRAM_LAYER_DISABLED`
 */
export interface DonationReportQuery extends ReportPagingQuery {
  from?: string;
  to?: string;
  status?: DonationReportStatus;
  programId?: string;
  fundId?: string;
  campaignId?: string;
  source?: DonationSource;
  groupBy?: DonationReportGroupBy;
  tab?: DonationReportTab;
}

/** query ของ `GET /reports/donations/export` — ตัวกรองเดียวกับหน้าจอ (ไม่มี tab/page) */
export type DonationReportExportQuery = Omit<DonationReportQuery, 'tab' | 'page' | 'pageSize'> & { format: ReportExportFormat };

export interface DonationReportFilters {
  status: DonationReportStatus;
  programId: string | null;
  fundId: string | null;
  campaignId: string | null;
  source: DonationSource | null;
  groupBy: DonationReportGroupBy;
  /** ชื่อของ id ที่เลือก (รวมที่ปิดใช้งาน/ถูกลบ) — `null` = ไม่ได้เลือก / `none` / ไม่พบ */
  labels: { program: string | null; fund: string | null; campaign: string | null };
}

export interface DonationReportKpis {
  /** ยอดรวม · จำนวนรายการ · ผู้บริจาคไม่ซ้ำ (รวมผู้บริจาคที่ถูกลบ — ยอดยังนับ) · เฉลี่ย/รายการ (ปัดครึ่งขึ้นที่สตางค์) ของสถานะที่กรอง */
  amount: string;
  count: number;
  donors: number;
  average: string;
  /** Σ มูลค่าของที่ระลึก (`souvenir_total_value`) ของชุดเดียวกัน — แถวรวมของตารางรายการ */
  souvenirValue: string;
  /** รอยืนยัน (`PENDING`) ในช่วง/ตัวกรองเดียวกัน (ไม่ขึ้นกับตัวกรองสถานะ) — บริบทว่ามีเงินที่ยังไม่นับอีกเท่าไร */
  pending: { count: number; amount: string };
}

export interface DonationReportSummaryRow {
  /** DAY = `YYYY-MM-DD` · MONTH = `YYYY-MM` · PROGRAM/FUND/CAMPAIGN = id หรือ `none` · SOURCE = `DonationSource` */
  key: string;
  /** DAY/MONTH — ช่วงวันของแถว (เดือนแรก/สุดท้ายตัดตามช่วงที่เลือก) · กลุ่มอื่น = `null` */
  periodFrom: string | null;
  periodTo: string | null;
  /** PROGRAM/FUND/CAMPAIGN — ชื่อ/รหัส (`none` = `null` → หน้าเว็บแสดง "ไม่ระบุ") · DAY/MONTH/SOURCE = `null` */
  name: string | null;
  code: string | null;
  inactive: boolean;
  deleted: boolean;
  /** FUND = ชื่อโปรแกรมของกองทุน (ชั้นโปรแกรมปิด = `null`) · CAMPAIGN = ชื่อกองทุน · อื่น = `null` */
  parentName: string | null;
  count: number;
  amount: string;
  /** ผู้บริจาคไม่ซ้ำในแถว (แถวรวม = ไม่ซ้ำทั้งชุด ไม่ใช่ผลบวก) */
  donors: number;
  /** % ของยอดรวมของตาราง */
  sharePercent: string;
  /** CAMPAIGN เท่านั้น (แถว `none` = `null`) — เป้า · ยอดสะสมทั้งแคมเปญถึงวันปลายช่วง (นับยอด · ไม่ขึ้นกับวันเริ่ม/ตัวกรองอื่น) · % ถึงเป้า */
  campaign: { targetAmount: string | null; cumulativeAmount: string; targetPercent: string | null } | null;
}

export interface DonationReportSummary {
  groupBy: DonationReportGroupBy;
  rows: DonationReportSummaryRow[];
  /** แถวรวมจากยอดจริงของทั้งชุด (ไม่ใช่ผลบวกของ % ที่ปัดแล้ว) */
  total: { count: number; amount: string; donors: number; sharePercent: string };
}

export interface DonationReportDetailRow {
  id: string;
  donationNo: string;
  donationDate: string;
  donorId: string;
  donorCode: string;
  donorName: string | null;
  donorTaxId: string | null;
  /** ผู้บริจาคถูกลบแล้ว — ยอดยังนับ (เงินเข้าจริง) · หน้าเว็บแสดง "(ลบแล้ว)" */
  donorDeleted: boolean;
  amount: string;
  /** ชั้นโปรแกรมปิด = `null` เสมอ */
  programName: string | null;
  fundName: string | null;
  campaignName: string | null;
  status: DonationStatus;
  source: DonationSource;
  /** ผู้ยืนยัน/ปฏิเสธ + เวลา (`reviewed_by` · `reviewed_at` ISO UTC) */
  reviewedByName: string | null;
  reviewedAt: string | null;
  slipFileCount: number;
  souvenirTotalValue: string;
}

/** ตารางรายการ (เรียง `donation_date, id` ASC) + แถวรวมของทั้งชุดที่กรอง (ไม่ใช่แค่หน้านี้) */
export interface DonationReportDetail extends ReportTablePage<DonationReportDetailRow> {
  totals: { count: number; amount: string; souvenirTotalValue: string };
}

export type DonationReportView = ReportEnvelope<
  typeof ReportKey.DONATIONS,
  DonationReportFilters,
  DonationReportKpis,
  { summary: DonationReportSummary; detail: DonationReportDetail | null }
>;

/** `GET /reports/donations/export` — `detail` = ทุกแถว (PDF เกิน `REPORT_PRINT_MAX_ROWS` = `null` + `export.omitted`) */
export type DonationReportExportView = DonationReportView & { export: ReportExportMeta };

// ── R2 ผู้บริจาค (`/reports/donors` · `T-139`) ────────────────────────────────────────────────

/**
 * ฐานของตารางรายการ R2 — `ACTIVE` (ค่าเริ่มต้น) = มีรายการนับยอด (`DONATION_COUNTED_STATUSES`) ตาม `donation_date` ในช่วง (อันดับยอดในช่วง) ·
 * `NEW` = ลงทะเบียน (`created_at` ตามวันไทย) ในช่วง · `ALL` = ทุกคนที่ยังไม่ลบ — KPI/สรุปไม่ขึ้นกับฐาน
 */
export const DonorReportBasis = {
  ACTIVE: 'ACTIVE',
  NEW: 'NEW',
  ALL: 'ALL',
} as const;
export type DonorReportBasis = (typeof DonorReportBasis)[keyof typeof DonorReportBasis];

export const DONOR_REPORT_DEFAULT_BASIS = DonorReportBasis.ACTIVE;

/** การจัดกลุ่มของตารางสรุป "ผู้บริจาคใหม่" — ไม่ส่ง = รายวันเมื่อช่วง ≤ 31 วัน · ยาวกว่านั้น = รายเดือน (กติกาเดียวกับ R1) */
export const DonorReportGroupBy = {
  DAY: 'DAY',
  MONTH: 'MONTH',
} as const;
export type DonorReportGroupBy = (typeof DonorReportGroupBy)[keyof typeof DonorReportGroupBy];

export function donorReportDefaultGroupBy(days: number): DonorReportGroupBy {
  return days <= DASHBOARD_DAY_BUCKET_MAX_DAYS ? DonorReportGroupBy.DAY : DonorReportGroupBy.MONTH;
}

/** แท็บของหน้า R2 — ค่าเดียวกับ R1 (`summary` ไม่ดึงรายการ) */
export const DonorReportTab = DonationReportTab;
export type DonorReportTab = DonationReportTab;

/** คำค้นยาวสุด (รหัส · ชื่อ · เบอร์ · อีเมล) */
export const DONOR_REPORT_Q_MAX_LENGTH = 100;

/**
 * query ของ `GET /reports/donors` — `status` · `lineStatus` · `registrationChannel` · `q` ความหมายเดียวกับ `GET /donors`
 * (`q` = รหัส/ชื่อ/อีเมล บางส่วน + เบอร์แบบมีขีด/ไม่มีขีด/+66 ด้วย normalize ตัวเดียวกัน) · ไม่ส่ง = ทั้งหมด · ผู้บริจาคที่ลบแล้วไม่อยู่ใน R2
 */
export interface DonorReportQuery extends ReportPagingQuery {
  from?: string;
  to?: string;
  basis?: DonorReportBasis;
  status?: DonorStatus;
  lineStatus?: DonorLineStatus;
  registrationChannel?: DonorRegistrationChannel;
  q?: string;
  groupBy?: DonorReportGroupBy;
  tab?: DonorReportTab;
}

export type DonorReportExportQuery = Omit<DonorReportQuery, 'tab' | 'page' | 'pageSize'> & { format: ReportExportFormat };

export interface DonorReportFilters {
  basis: DonorReportBasis;
  status: DonorStatus | null;
  lineStatus: DonorLineStatus | null;
  registrationChannel: DonorRegistrationChannel | null;
  /** คำค้นหลัง trim (`null` = ไม่ค้น) */
  q: string | null;
  groupBy: DonorReportGroupBy;
}

/**
 * KPI ตามตัวกรองสถานะ/LINE/ช่องทาง/คำค้น (ไม่ขึ้นกับฐาน) — **ไม่กรองเลย = ตัวเลขเดียวกับ Dashboard ช่วงเดียวกัน**
 * (`donorTotals.total` · `donorNew.newCount` · `donorActive` · `donorTotals.withLine`) · นับเฉพาะผู้บริจาคที่ยังไม่ลบ
 */
export interface DonorReportKpis {
  /** ทั้งหมดตอนนี้ (ไม่ขึ้นกับช่วง) */
  total: number;
  /** ผูก LINE ตอนนี้ */
  withLine: number;
  /** ลงทะเบียนในช่วง (`created_at` วันไทย → `[startUtc, endUtc)`) + แยกตามช่องทางสมัคร */
  newCount: number;
  newStaff: number;
  newSelf: number;
  /** มีรายการนับยอดตาม `donation_date` ในช่วง (คนไม่ซ้ำ) */
  activeCount: number;
  /** จำนวนแถวของตารางรายการตามฐาน (= `detail.meta.total`) */
  count: number;
}

export interface DonorReportSummaryRow {
  /** DAY = `YYYY-MM-DD` · MONTH = `YYYY-MM` */
  key: string;
  /** ช่วงวันของแถว (เดือนแรก/สุดท้ายตัดตามช่วงที่เลือก) */
  periodFrom: string;
  periodTo: string;
  staff: number;
  self: number;
  total: number;
}

/** ผู้บริจาคใหม่ตามวัน/เดือน (เติม 0 ครบช่วง) × ช่องทางสมัคร + แถวรวม (= KPI ใหม่ในช่วง) */
export interface DonorReportSummary {
  groupBy: DonorReportGroupBy;
  rows: DonorReportSummaryRow[];
  total: { staff: number; self: number; total: number };
}

export interface DonorReportDetailRow {
  id: string;
  donorCode: string;
  /** `null` = สมัครเองทาง LINE แต่ยังไม่กรอกฟอร์ม (หน้าเว็บแสดงแบบหน้า `/donors`) */
  fullName: string | null;
  /** ตัวเลขล้วนตามที่เก็บ — หน้าเว็บจัดรูปด้วย `formatThaiPhone` */
  phone: string;
  email: string | null;
  lineStatus: DonorLineStatus;
  lineDisplayName: string | null;
  registrationChannel: DonorRegistrationChannel;
  status: DonorStatus;
  /** ลงทะเบียนเมื่อ (ISO UTC) */
  createdAt: string;
  /** รายการนับยอดในช่วง (ตาม `donation_date`) */
  rangeCount: number;
  rangeAmount: string;
  /** รายการนับยอดสะสมทุกช่วงเวลา — คำนวณจาก `donations` จริง (ไม่ใช้ cache `donors.donation_total`) */
  totalCount: number;
  totalAmount: string;
  /** วันที่บริจาคล่าสุดที่นับยอด (`YYYY-MM-DD`) · ไม่มี = `null` */
  lastDonationDate: string | null;
}

/** เรียง: ACTIVE = ยอดในช่วงมาก→น้อย, ครั้ง, id · NEW = ลงทะเบียนล่าสุดก่อน · ALL = รหัส — แถวรวมของทั้งชุดที่กรอง */
export interface DonorReportDetail extends ReportTablePage<DonorReportDetailRow> {
  totals: { count: number; rangeCount: number; rangeAmount: string; totalCount: number; totalAmount: string };
}

export type DonorReportView = ReportEnvelope<
  typeof ReportKey.DONORS,
  DonorReportFilters,
  DonorReportKpis,
  { summary: DonorReportSummary; detail: DonorReportDetail | null }
>;

export type DonorReportExportView = DonorReportView & { export: ReportExportMeta };

// ── R3 งานรออนุมัติ (`/reports/pending` · `T-139`) ─────────────────────────────────────────────

/**
 * ช่วงอายุงาน (วันปฏิทินไทย · วันนี้ = 0) — ≤ 2 วัน · 3–7 วัน · > 7 วัน · ลำดับ = จางไปเข้มในแถบอายุงาน
 * `maxDays` `null` = ไม่มีขอบบน
 */
export const ReportAgingBucket = {
  D0_2: 'D0_2',
  D3_7: 'D3_7',
  D8_PLUS: 'D8_PLUS',
} as const;
export type ReportAgingBucket = (typeof ReportAgingBucket)[keyof typeof ReportAgingBucket];

export const REPORT_AGING_BUCKETS: readonly { key: ReportAgingBucket; minDays: number; maxDays: number | null }[] = [
  { key: ReportAgingBucket.D0_2, minDays: 0, maxDays: 2 },
  { key: ReportAgingBucket.D3_7, minDays: 3, maxDays: 7 },
  { key: ReportAgingBucket.D8_PLUS, minDays: 8, maxDays: null },
];

export function reportAgingBucketOf(days: number): ReportAgingBucket {
  const found = REPORT_AGING_BUCKETS.find((bucket) => days >= bucket.minDays && (bucket.maxDays === null || days <= bucket.maxDays));
  return (found ?? REPORT_AGING_BUCKETS[0]).key;
}

/** วันไทย (`YYYY-MM-DD`) ของเวลา ISO UTC — ไทยไม่มี DST (+07:00 ตลอด) */
export function bangkokYmdOfIso(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) throw new RangeError(`bangkokYmdOfIso: ${iso}`);
  return new Date(time + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** อายุงาน = วันนี้ (วันไทย) − วันไทยของเวลาเริ่มนับ · วันเดียวกัน = 0 · เวลาในอนาคต (นาฬิกาเหลื่อม) = 0 */
export function reportAgeDays(startIso: string, todayYmd: string): number {
  return Math.max(0, ymdDiffDays(bangkokYmdOfIso(startIso), todayYmd));
}

/** ขอบล่างของวันไทย `ymd` เป็น UTC (`YYYY-MM-DD HH:MM:SS.mmm`) — แบบ `bangkokDayStartUtc` ของ API */
function bangkokDayStartUtcText(ymd: string): string {
  return `${ymdAddDays(ymd, -1)} 17:00:00.000`;
}

/**
 * ขอบเวลา (UTC) ของแต่ละช่วงอายุ ณ วันนี้ — SQL นับ `start >= fromUtc AND start < toUtc` (`null` = ไม่มีขอบด้านนั้น)
 * ช่วงแรกไม่มีขอบบน (เวลาในอนาคตนับเป็น 0 วัน) · ช่วงสุดท้ายไม่มีขอบล่าง → ทุกแถวอยู่ในช่วงเดียวพอดี
 */
export function reportAgingBounds(todayYmd: string): { key: ReportAgingBucket; fromUtc: string | null; toUtc: string | null }[] {
  return REPORT_AGING_BUCKETS.map((bucket, index) => ({
    key: bucket.key,
    fromUtc: bucket.maxDays === null ? null : bangkokDayStartUtcText(ymdAddDays(todayYmd, -bucket.maxDays)),
    toUtc: index === 0 ? null : bangkokDayStartUtcText(ymdAddDays(todayYmd, -bucket.minDays + 1)),
  }));
}

/**
 * 3 ส่วนของ R3 (ณ ตอนนี้ · ไม่มีช่วงวันที่ · ไม่รวมแถวที่ลบ) — ค่า = `tab` ของหน้าเว็บ/API
 * `pendingDonations` = รายการบริจาค `PENDING` (นับจาก `created_at` · จำนวน = แท็บรอยืนยันของ `/donations` = Dashboard `queue.pending`) ·
 * `awaitingOrder` = `CONFIRMED` ที่มีของที่ระลึก (`donation_items` ≥ 1 · นับจากเวลายืนยัน `reviewed_at`) ·
 * `draftOrders` = ออเดอร์ `DRAFT` (นับจาก `created_at` · จำนวน = แท็บรอยืนยันของ `/orders` = Dashboard `orders.byStatus.DRAFT`)
 */
export const PendingReportSection = {
  PENDING_DONATIONS: 'pendingDonations',
  AWAITING_ORDER: 'awaitingOrder',
  DRAFT_ORDERS: 'draftOrders',
} as const;
export type PendingReportSection = (typeof PendingReportSection)[keyof typeof PendingReportSection];

export const PENDING_REPORT_SECTIONS = Object.values(PendingReportSection) as readonly PendingReportSection[];
export const PENDING_REPORT_DEFAULT_SECTION = PendingReportSection.PENDING_DONATIONS;

/** query ของ `GET /reports/pending` — `tab` = ส่วนที่ดึงรายการ (แบ่งหน้า) · ส่วนอื่น = `null` */
export interface PendingReportQuery extends ReportPagingQuery {
  tab?: PendingReportSection;
}

/** `GET /reports/pending/export` — ทุกส่วนทุกแถว (Excel รวมทุกส่วน ≤ `REPORT_EXPORT_MAX_ROWS` · PDF แต่ละส่วน ≤ `REPORT_PRINT_MAX_ROWS`) */
export interface PendingReportExportQuery {
  format: ReportExportFormat;
}

/** ไม่มีตัวกรอง — `asOfDate` = วันนี้ตามวันไทยที่ใช้นับอายุงาน */
export interface PendingReportFilters {
  asOfDate: string;
}

export interface PendingReportSectionKpis {
  count: number;
  /** Σ ยอดบริจาค — ส่วนออเดอร์ = `null` */
  amount: string | null;
  /** Σ ชิ้นของที่ระลึก (`donation_items` / `order_items`) — ส่วนรายการรอยืนยัน = `null` */
  qty: number | null;
  /** Σ มูลค่าของที่ระลึก (`qty × unit_value`) — เฉพาะส่วนรอออกออเดอร์ */
  souvenirValue: string | null;
  /** เวลาเริ่มนับที่เก่าสุด (ISO UTC) + อายุ (วัน) · ไม่มีงาน = `null` */
  oldestAt: string | null;
  oldestDays: number | null;
  /** จำนวนต่อช่วงอายุ ตามลำดับ `REPORT_AGING_BUCKETS` (รวมกัน = `count`) */
  aging: { bucket: ReportAgingBucket; count: number }[];
}

export interface PendingReportKpis {
  /** รวมทุกส่วน (เพดานส่งออก Excel นับตัวนี้) */
  count: number;
  sections: Record<PendingReportSection, PendingReportSectionKpis>;
}

/** คอลัมน์ร่วมของทุกแถวใน R3 */
interface PendingReportAging {
  /** เวลาเริ่มนับ (ISO UTC) */
  startedAt: string;
  ageDays: number;
  agingBucket: ReportAgingBucket;
}

export interface PendingDonationRow extends PendingReportAging {
  id: string;
  donationNo: string;
  donationDate: string;
  /** บันทึกเมื่อ (= `startedAt`) + ผู้บันทึก */
  createdAt: string;
  createdByName: string | null;
  donorId: string;
  donorCode: string;
  donorName: string | null;
  donorDeleted: boolean;
  amount: string;
  /** ชั้นโปรแกรมปิด = `null` เสมอ */
  programName: string | null;
  fundName: string | null;
  campaignName: string | null;
  source: DonationSource;
  slipFileCount: number;
}

export interface AwaitingOrderRow extends PendingReportAging {
  id: string;
  donationNo: string;
  donationDate: string;
  /** ยืนยันเมื่อ (`reviewed_at` · = `startedAt` · ข้อมูลเก่าที่ไม่มีเวลายืนยันใช้ `created_at`) + ผู้ยืนยัน */
  confirmedAt: string | null;
  confirmedByName: string | null;
  donorId: string;
  donorCode: string;
  donorName: string | null;
  donorDeleted: boolean;
  amount: string;
  souvenirQty: number;
  souvenirValue: string;
}

export interface DraftOrderRow extends PendingReportAging {
  id: string;
  orderNo: string;
  /** สร้างเมื่อ (= `startedAt`) + ผู้สร้าง */
  createdAt: string;
  createdByName: string | null;
  recipientName: string;
  recipientPhone: string | null;
  donorCode: string;
  donorDeleted: boolean;
  /** รายการบริจาคอ้างอิง (`source_donation_id`) · ออเดอร์ที่สร้างตรง = `null` */
  sourceDonationId: string | null;
  sourceDonationNo: string | null;
  /** ใบที่ k จาก N ของชุด (ไม่แยก = 1/1 · ไม่มีต้นทาง = `null`) */
  splitNo: number | null;
  splitTotal: number | null;
  /** Σ `order_items.qty` */
  qty: number;
}

/** ตารางของแต่ละส่วน — เรียงค้างนานสุดก่อน (`startedAt`, id) · แถวรวมของทั้งส่วน */
export interface PendingReportTable<Row> extends ReportTablePage<Row> {
  totals: { count: number; amount: string | null; qty: number | null; souvenirValue: string | null };
}

export interface PendingReportTables {
  pendingDonations: PendingReportTable<PendingDonationRow> | null;
  awaitingOrder: PendingReportTable<AwaitingOrderRow> | null;
  draftOrders: PendingReportTable<DraftOrderRow> | null;
}

export type PendingReportView = ReportEnvelope<typeof ReportKey.PENDING, PendingReportFilters, PendingReportKpis, PendingReportTables>;

/** `GET /reports/pending/export` — ทุกส่วน (PDF ส่วนที่เกิน `REPORT_PRINT_MAX_ROWS` = `null` + `export.omitted` ของส่วนนั้น) */
export type PendingReportExportView = PendingReportView & { export: ReportExportMeta };

// ── ร่วม R4–R6 (`T-140`) ───────────────────────────────────────────────────────────────────────

/** ตัวเลือกของตัวกรองที่รายงานส่งมาเอง (ไม่พึ่ง endpoint ของเมนูอื่นที่อาจไม่มีสิทธิ์) — รวมที่ปิดใช้งาน · ไม่รวมที่ลบ */
export interface ReportFilterOption {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * ชั่วโมงเฉลี่ย/ชั่วโมงที่ใช้ จากวินาที — ทศนิยม 1 ตำแหน่ง **สูตรเดียวกับ Dashboard** (`avgLeadTimeHours` = `round(sec / 360) / 10`) · `null` คงเดิม
 */
export function reportLeadHours(seconds: number | null): number | null {
  if (seconds === null) return null;
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError(`reportLeadHours: ${seconds}`);
  return Math.round(seconds / 360) / 10;
}

/** ชั่วโมง → วัน + ชั่วโมงที่เหลือ (ทศนิยม 1 ตำแหน่ง) — แสดง "1 วัน 2.5 ชม." · ไม่ถึงวัน = `days` 0 */
export function reportDaysHours(hours: number): { days: number; hours: number } {
  if (!Number.isFinite(hours) || hours < 0) throw new RangeError(`reportDaysHours: ${hours}`);
  const tenths = Math.round(hours * 10);
  return { days: Math.floor(tenths / 240), hours: (tenths % 240) / 10 };
}

/** ค่า "ไม่ระบุ" ของตัวกรอง id (ขนส่ง · หมวดหมู่ · กองทุน) = `none` (ค่าเดียวกับ `DONATION_FUND_FILTER_NONE`) */
export const REPORT_NONE_FILTER = 'none';

// ── R4 การจัดส่ง (`/reports/shipping` · `T-140`) ──────────────────────────────────────────────

/**
 * ฐานวันที่ของ R4 — `CREATED` (ค่าเริ่มต้น) = ออเดอร์ที่**สร้าง** (`created_at` วันไทย) ในช่วง ทุกสถานะ ·
 * `SHIPPED` = ออเดอร์ที่ `shipped_at` อยู่ในช่วง **และไม่ยกเลิก** (นิยามเดียวกับ Dashboard `orderShipped`) — ไม่กรองอื่น = "ส่งแล้วในช่วง" + เวลาเฉลี่ยเท่า Dashboard
 */
export const ShippingReportBasis = {
  CREATED: 'CREATED',
  SHIPPED: 'SHIPPED',
} as const;
export type ShippingReportBasis = (typeof ShippingReportBasis)[keyof typeof ShippingReportBasis];
export const SHIPPING_REPORT_DEFAULT_BASIS = ShippingReportBasis.CREATED;

/** สถานะที่นับ "ยังไม่พิมพ์ใบแปะหน้า" (ต้องพิมพ์ก่อนส่ง) — ตัวเดียวกับ Dashboard `DASHBOARD_LABEL_PENDING_STATUSES` */
export const SHIPPING_REPORT_LABEL_STATUSES: readonly OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PREPARING];

/** แท็บของ R4/R5 — ค่าเดียวกับ R1 (`summary` ไม่ดึงรายการ) */
export const ShippingReportTab = DonationReportTab;
export type ShippingReportTab = DonationReportTab;

/**
 * query ของ `GET /reports/shipping` — `status` = 1 สถานะ (ไม่ส่ง = ทุกสถานะ) · `carrierId` = id ใน `shipping_carriers` หรือ `none` (ไม่ได้เลือกจากรายชื่อ) ·
 * `printed` = `YES`/`NO` (ความหมายเดียวกับ `GET /orders?printed=`) · ไม่รวมออเดอร์ที่ลบ
 */
export interface ShippingReportQuery extends ReportPagingQuery {
  from?: string;
  to?: string;
  basis?: ShippingReportBasis;
  status?: OrderStatus;
  carrierId?: string;
  printed?: OrderPrintedFilter;
  tab?: ShippingReportTab;
}

export type ShippingReportExportQuery = Omit<ShippingReportQuery, 'tab' | 'page' | 'pageSize'> & { format: ReportExportFormat };

export interface ShippingReportFilters {
  basis: ShippingReportBasis;
  status: OrderStatus | null;
  carrierId: string | null;
  printed: OrderPrintedFilter | null;
  labels: { carrier: string | null };
}

/**
 * KPI ของออเดอร์ในขอบเขต (ฐาน + ตัวกรอง) — "ส่งแล้ว/รับแล้วในช่วง" = `shipped_at`/`received_at` อยู่ในช่วงและไม่ยกเลิก (สูตร Dashboard) ·
 * เวลาเฉลี่ย = ยืนยัน → ส่ง ของที่ส่งในช่วง (ไม่ยกเลิก · `confirmed_at` ≤ `shipped_at`) ชั่วโมงทศนิยม 1 ตำแหน่ง (`reportLeadHours`) ·
 * ยังไม่พิมพ์ใบแปะหน้า = สถานะ `SHIPPING_REPORT_LABEL_STATUSES` ที่ `label_printed_at` ว่าง
 */
export interface ShippingReportKpis {
  /** ออเดอร์ในขอบเขต (= แถวของรายการ) */
  count: number;
  /** ทุกสถานะตามลำดับ `OrderStatus` (รวมกัน = `count`) */
  byStatus: { status: OrderStatus; count: number }[];
  shipped: number;
  received: number;
  avgLeadTimeHours: number | null;
  unprinted: number;
}

export interface ShippingStatusSummaryRow {
  status: OrderStatus;
  count: number;
  /** % ของจำนวนออเดอร์ในขอบเขต */
  sharePercent: string;
}

/** ตามขนส่ง (`shipping_carrier_id` · ไม่ระบุ/พิมพ์เองก่อนมีรายชื่อ = `key` `none`) — เรียงจำนวนมาก→น้อย · "ไม่ระบุ" ท้าย */
export interface ShippingCarrierSummaryRow {
  key: string;
  name: string | null;
  inactive: boolean;
  deleted: boolean;
  count: number;
  shipped: number;
  received: number;
  avgLeadTimeHours: number | null;
}

export interface ShippingReportSummary {
  byStatus: { rows: ShippingStatusSummaryRow[]; total: { count: number; sharePercent: string } };
  byCarrier: { rows: ShippingCarrierSummaryRow[]; total: { count: number; shipped: number; received: number; avgLeadTimeHours: number | null } };
}

export interface ShippingReportDetailRow {
  id: string;
  orderNo: string;
  /** รายการบริจาคอ้างอิง (`source_donation_id`) · สร้างตรง = `null` */
  sourceDonationId: string | null;
  sourceDonationNo: string | null;
  splitNo: number | null;
  splitTotal: number | null;
  recipientName: string;
  recipientPhone: string | null;
  /** ข้อความที่อยู่เต็ม (snapshot ที่ใบแปะหน้าใช้ — แบบฟอร์มสร้างด้วย `recipientAddressText`) · บรรทัดคั่นด้วย `\n` */
  recipientAddress: string | null;
  /** จังหวัด (เฉพาะที่อยู่แบบแบบฟอร์ม) */
  provinceName: string | null;
  totalQty: number;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  /** ชื่อขนส่ง snapshot (`shipping_carrier`) */
  carrierName: string | null;
  trackingNo: string | null;
  /** ยืนยัน → ส่ง (ชั่วโมง · `reportLeadHours`) — ยกเลิก/ไม่มีเวลา/ยืนยันหลังส่ง = `null` (แบบ Dashboard) */
  leadTimeHours: number | null;
  labelPrintedAt: string | null;
  labelPrintCount: number;
}

/** เรียงตามเวลาของฐาน (`created_at` / `shipped_at`) ASC, id · แถวรวม = ชิ้นรวม */
export interface ShippingReportDetail extends ReportTablePage<ShippingReportDetailRow> {
  totals: { count: number; totalQty: number };
}

export type ShippingReportView = ReportEnvelope<
  typeof ReportKey.SHIPPING,
  ShippingReportFilters,
  ShippingReportKpis,
  { summary: ShippingReportSummary; detail: ShippingReportDetail | null }
> & { options: { carriers: ReportFilterOption[] } };

export type ShippingReportExportView = ShippingReportView & { export: ReportExportMeta };

// ── R5 การแจกของที่ระลึก (`/reports/distribution` · `T-140`) ───────────────────────────────────

/**
 * ฐานของ R5: บรรทัด `order_items` ของออเดอร์สถานะ `SHIPPED`/`RECEIVED` ที่ `shipped_at` อยู่ในช่วง (แจกถึงมือ = ส่งออกไปแล้ว · ไม่ใช่ ISSUE ตอนยืนยัน — SV-ADR-095) ·
 * มูลค่า = `qty × order_items.unit_value` (snapshot ตอนสร้าง/แก้ร่าง) รวมใน DB · กองทุน/แคมเปญ = ของรายการบริจาคต้นทาง (`source_donation_id`) · ไม่มีต้นทาง = "ไม่ระบุ"
 */
export const DISTRIBUTION_REPORT_STATUSES: readonly OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.RECEIVED];

export const DistributionReportGroupBy = {
  SOUVENIR: 'SOUVENIR',
  CATEGORY: 'CATEGORY',
  PROGRAM: 'PROGRAM',
  FUND: 'FUND',
  CAMPAIGN: 'CAMPAIGN',
} as const;
export type DistributionReportGroupBy = (typeof DistributionReportGroupBy)[keyof typeof DistributionReportGroupBy];
export const DISTRIBUTION_REPORT_DEFAULT_GROUP_BY = DistributionReportGroupBy.SOUVENIR;

/** คำค้นของที่ระลึกยาวสุด (รหัส/ชื่อ) */
export const REPORT_SOUVENIR_Q_MAX_LENGTH = 100;

/**
 * query ของ `GET /reports/distribution` — `categoryId` = หมวดปัจจุบันของสินค้า (`none` = ไม่มีหมวด) · `q` = รหัส/ชื่อของ (snapshot ในบรรทัด หรือปัจจุบัน) ·
 * `programId`/`fundId` (`none` = ไม่ระบุ)/`campaignId` = ของรายการบริจาคต้นทาง (โปรแกรม = โปรแกรมปัจจุบันของกองทุน · ชั้นปิด = 422)
 */
export interface DistributionReportQuery extends ReportPagingQuery {
  from?: string;
  to?: string;
  categoryId?: string;
  q?: string;
  programId?: string;
  fundId?: string;
  campaignId?: string;
  groupBy?: DistributionReportGroupBy;
  tab?: ShippingReportTab;
}

export type DistributionReportExportQuery = Omit<DistributionReportQuery, 'tab' | 'page' | 'pageSize'> & { format: ReportExportFormat };

export interface DistributionReportFilters {
  categoryId: string | null;
  q: string | null;
  programId: string | null;
  fundId: string | null;
  campaignId: string | null;
  groupBy: DistributionReportGroupBy;
  labels: { category: string | null; program: string | null; fund: string | null; campaign: string | null };
}

/**
 * KPI — `qty` Σ ชิ้น · `value` Σ มูลค่า · `orders` ออเดอร์ไม่ซ้ำ · `souvenirs` ชนิดของไม่ซ้ำ ·
 * `recipients` = ผู้รับไม่ซ้ำ: นับ `donor_id` ของออเดอร์ (คอลัมน์ NOT NULL — DOM-04 §4.31) · ถ้าไม่มี (เผื่ออนาคต) นับต่อออเดอร์ ·
 * `count` = จำนวนบรรทัดของรายการ (เพดานส่งออกนับตัวนี้)
 */
export interface DistributionReportKpis {
  count: number;
  qty: number;
  value: string;
  orders: number;
  recipients: number;
  souvenirs: number;
}

/** แถวสรุปตามกลุ่ม — SOUVENIR: รหัส/ชื่อ/หน่วย = snapshot ในบรรทัดออเดอร์ล่าสุด (แบบ Dashboard `souvenirTop`) · กลุ่มอื่นไม่มีหน่วย · ไม่ระบุ = `key` `none` */
export interface DistributionReportSummaryRow {
  key: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  inactive: boolean;
  deleted: boolean;
  /** FUND = โปรแกรมของกองทุน (ชั้นเปิด) · CAMPAIGN = กองทุนของแคมเปญ · SOUVENIR = หมวดปัจจุบัน */
  parentName: string | null;
  qty: number;
  value: string;
  orders: number;
  /** % ของมูลค่ารวม (มูลค่ารวม 0 = `0.00`) */
  sharePercent: string;
}

/** เรียงมูลค่ามาก→น้อย, ชิ้น, ชื่อ · "ไม่ระบุ" ท้าย · แถวรวม: ออเดอร์ = ไม่ซ้ำทั้งชุด (ไม่ใช่ผลบวกแถว) */
export interface DistributionReportSummary {
  groupBy: DistributionReportGroupBy;
  rows: DistributionReportSummaryRow[];
  total: { qty: number; value: string; orders: number; sharePercent: string };
}

export interface DistributionReportDetailRow {
  /** `order_items.id` */
  id: string;
  orderId: string;
  orderNo: string;
  status: OrderStatus;
  shippedAt: string;
  sourceDonationId: string | null;
  sourceDonationNo: string | null;
  recipientName: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  unit: string | null;
  categoryName: string | null;
  qty: number;
  unitValue: string;
  /** `qty × unit_value` (DB) */
  value: string;
  /** ชั้นโปรแกรมปิด = `null` เสมอ */
  programName: string | null;
  fundName: string | null;
  campaignName: string | null;
}

/** เรียง `shipped_at`, order id, item id · แถวรวม = ชิ้น/มูลค่าทั้งชุด */
export interface DistributionReportDetail extends ReportTablePage<DistributionReportDetailRow> {
  totals: { count: number; qty: number; value: string };
}

export type DistributionReportView = ReportEnvelope<
  typeof ReportKey.DISTRIBUTION,
  DistributionReportFilters,
  DistributionReportKpis,
  { summary: DistributionReportSummary; detail: DistributionReportDetail | null }
> & { options: { categories: ReportFilterOption[] } };

export type DistributionReportExportView = DistributionReportView & { export: ReportExportMeta };

// ── R6 สต็อก (`/reports/stock` · `T-140`) ─────────────────────────────────────────────────────

/**
 * 3 แท็บของ R6 — `products` สรุปต่อสินค้าในงวด (ช่วง = งวดความเคลื่อนไหว `[startUtc, endUtc)`) · `lots` lot คงเหลือ **ณ ตอนนี้** (ไม่ขึ้นกับช่วง) ·
 * `movements` ความเคลื่อนไหวในงวด (เรียง `created_at`, id) — ทุกแท็บใช้ตัวกรองสินค้าเดียวกัน (ไม่รวมสินค้าที่ลบ)
 */
export const StockReportSection = {
  PRODUCTS: 'products',
  LOTS: 'lots',
  MOVEMENTS: 'movements',
} as const;
export type StockReportSection = (typeof StockReportSection)[keyof typeof StockReportSection];
export const STOCK_REPORT_SECTIONS = Object.values(StockReportSection) as readonly StockReportSection[];
export const STOCK_REPORT_DEFAULT_SECTION = StockReportSection.PRODUCTS;

/**
 * สถานะอายุของ lot (ณ วันนี้ตามวันไทย) — `EXPIRED` วันหมดอายุ < วันนี้ · `EXPIRING` วันนี้ ≤ วันหมดอายุ ≤ วันนี้ + `DASHBOARD_EXPIRING_WITHIN_DAYS` ·
 * `NORMAL` ไกลกว่านั้น · `NO_EXPIRY` ไม่มีวันหมดอายุ — ขอบเดียวกับ Dashboard `souvenirLots` (นับตรงกันเมื่อไม่กรอง)
 */
export const StockLotExpiry = {
  EXPIRED: 'EXPIRED',
  EXPIRING: 'EXPIRING',
  NORMAL: 'NORMAL',
  NO_EXPIRY: 'NO_EXPIRY',
} as const;
export type StockLotExpiry = (typeof StockLotExpiry)[keyof typeof StockLotExpiry];

export function stockLotExpiryOf(expiresAt: string | null, todayYmd: string, withinDays: number = DASHBOARD_EXPIRING_WITHIN_DAYS): StockLotExpiry {
  if (expiresAt === null) return StockLotExpiry.NO_EXPIRY;
  if (expiresAt < todayYmd) return StockLotExpiry.EXPIRED;
  if (expiresAt <= ymdAddDays(todayYmd, withinDays)) return StockLotExpiry.EXPIRING;
  return StockLotExpiry.NORMAL;
}

/**
 * query ของ `GET /reports/stock` — `categoryId` (`none` = ไม่มีหมวด) · `status` สถานะสินค้า (ไม่ส่ง = ทั้งหมด) ·
 * `level` = `LOW`/`OUT` ตาม `stockLevelOf` ของคงเหลือปัจจุบัน (= ตัวกรอง `stock` ของ `/souvenirs`) · `q` รหัส/ชื่อสินค้า · `tab` = แท็บที่ดึงรายการ (แบ่งหน้า)
 */
export interface StockReportQuery extends ReportPagingQuery {
  from?: string;
  to?: string;
  categoryId?: string;
  status?: SouvenirStatus;
  level?: StockFilter;
  q?: string;
  tab?: StockReportSection;
}

export type StockReportExportQuery = Omit<StockReportQuery, 'tab' | 'page' | 'pageSize'> & { format: ReportExportFormat };

export interface StockReportFilters {
  categoryId: string | null;
  status: SouvenirStatus | null;
  level: StockFilter | null;
  q: string | null;
  /** วันนี้ (ไทย) ที่ใช้คิดสถานะ lot */
  asOfDate: string;
  labels: { category: string | null };
}

/**
 * KPI — `count` = แถวรวมทั้ง 3 แท็บ (เพดานส่งออก) · `products` สินค้าในตัวกรอง ·
 * `outOfStock`/`lowStock` = เฉพาะสินค้า `ACTIVE` ในตัวกรอง (ไม่กรอง = Dashboard `souvenirStock`) · `closingValue` Σ คงเหลือปลายงวด × มูลค่า/หน่วยปัจจุบัน ·
 * `lots` = lot ที่ยังมีของ (ไม่กรอง = Dashboard `souvenirLots`) · `ledgerMismatch` = สินค้าที่ Σ movement ≠ `stock_on_hand` หรือ Σ lot ≠ `stock_on_hand` (0 = ✓)
 */
export interface StockReportKpis {
  count: number;
  products: number;
  outOfStock: number;
  lowStock: number;
  closingValue: string;
  lots: { count: number; expiring: number; expired: number; withinDays: number };
  movements: number;
  ledgerMismatch: number;
}

/**
 * ต่อสินค้า — ยกมา = Σ movement ก่อนงวด · รับเข้า/ปรับ (±)/คืน = Σ ในงวดตามชนิด · ตัดออก = Σ ISSUE ในงวด**แสดงเป็นบวก** ·
 * คงเหลือปลายงวด = ยกมา + Σ ทุก movement ในงวด (= ยกมา + รับ + ปรับ − ตัด + คืน) · ปลายงวด ≥ วันนี้ และสมุดตรง → = คงเหลือปัจจุบัน
 */
export interface StockReportProductRow {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  unit: string | null;
  status: SouvenirStatus;
  opening: number;
  received: number;
  adjusted: number;
  issued: number;
  returned: number;
  closing: number;
  /** `stock_on_hand` ตอนนี้ */
  onHand: number;
  lowStockThreshold: number | null;
  /** `stockLevelOf(onHand, lowStockThreshold)` */
  level: StockFilter | null;
  /** `souvenirs.value` ปัจจุบัน */
  unitValue: string;
  /** คงเหลือปลายงวด × มูลค่า/หน่วย (DB) */
  closingValue: string;
  /** ตรวจสมุดสต็อก: Σ movement ทั้งหมด · Σ `qty_remaining` ของ lot · ตรงกับ `onHand` ทั้งคู่ = `ok` */
  ledger: { movementTotal: number; lotTotal: number; ok: boolean };
}

export interface StockReportLotRow {
  id: string;
  lotNo: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  unit: string | null;
  receivedAt: string;
  qtyReceived: number;
  qtyRemaining: number;
  expiresAt: string | null;
  expiry: StockLotExpiry;
}

export interface StockReportMovementRow {
  id: string;
  createdAt: string;
  souvenirId: string;
  souvenirCode: string;
  souvenirName: string;
  lotId: string | null;
  lotNo: string | null;
  type: StockMovementType;
  /** มีเครื่องหมาย (ISSUE ติดลบ) */
  qty: number;
  refType: StockRefType | null;
  /** ออเดอร์อ้างอิง (ref เป็นออเดอร์ — รวมที่ลบแล้ว) */
  orderId: string | null;
  orderNo: string | null;
  note: string | null;
  actorName: string | null;
}

export interface StockReportTotals {
  products: { count: number; opening: number; received: number; adjusted: number; issued: number; returned: number; closing: number; onHand: number; closingValue: string };
  lots: { count: number; qtyReceived: number; qtyRemaining: number };
  movements: { count: number; qty: number };
}

export interface StockReportTable<Row> extends ReportTablePage<Row> {
  section: StockReportSection;
}

/** ตารางของแท็บที่ขอ (แบ่งหน้า) — แท็บอื่น = `null` · export = ทุกแท็บ (PDF แท็บที่เกิน `REPORT_PRINT_MAX_ROWS` = `null` + `omitted`) */
export interface StockReportTables {
  products: StockReportTable<StockReportProductRow> | null;
  lots: StockReportTable<StockReportLotRow> | null;
  movements: StockReportTable<StockReportMovementRow> | null;
  /** แถวรวมของทุกแท็บ (ตัวกรองเดียวกัน · ไม่ขึ้นกับหน้า) */
  totals: StockReportTotals;
}

export type StockReportView = ReportEnvelope<typeof ReportKey.STOCK, StockReportFilters, StockReportKpis, StockReportTables> & {
  options: { categories: ReportFilterOption[] };
};

export type StockReportExportView = StockReportView & { export: ReportExportMeta };
