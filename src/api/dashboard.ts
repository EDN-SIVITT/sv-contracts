import type { DonationStatus } from './donations';
import { OrderStatus } from './orders';
import type { StockFilter } from './souvenirs';

/**
 * Dashboard ของ e-Donation (`T-121` API · `T-122` เว็บ · FT-12 · SV-ADR-083) — `GET /dashboard/summary?from&to`
 * วันที่ทุกตัว = `YYYY-MM-DD` **ตามวันไทย** (Asia/Bangkok) · ช่วงรวมปลายทาง · ฟังก์ชันวันที่ในไฟล์นี้คิดจากตัวเลขปฏิทินล้วน (ไม่พึ่ง timezone ของเครื่อง)
 * เงินทุกช่อง = ข้อความ DECIMAL `"1234.50"` (รวมใน SQL · ไม่ผ่าน float — `parseMoneyToSatang` / `formatSatang`)
 * แต่ละส่วน (`donations` · `donors` · `orders` · `souvenirs` · `chat`) = `null` เมื่อผู้ใช้ไม่มีสิทธิ์อ่านเมนูนั้น (ไม่ใช่ 403 · API ไม่ query ส่วนนั้นเลย)
 */

/** ช่วงยาวสุดที่ขอได้ (วัน · รวมปลายทาง) — 1 ปีอธิกสุรทิน · เกิน → 422 `{ field: 'to', reason: 'TOO_LONG', max }` */
export const DASHBOARD_RANGE_MAX_DAYS = 366;
/** วันที่เก่าสุด/ไกลสุดที่รับ — กันพิมพ์ปีผิด (พ.ศ. · ปีหลักร้อย) · นอกช่วง → 422 `{ field, reason: 'OUT_OF_RANGE', min, max }` */
export const DASHBOARD_DATE_MIN = '1900-01-01';
export const DASHBOARD_DATE_MAX = '2999-12-31';
/** จำนวนแถวสูงสุดของรายการอันดับ (ผู้บริจาค · ของที่ระลึกที่แจก · ของใกล้หมด) */
export const DASHBOARD_TOP_LIMIT = 5;
/** lot ที่หมดอายุภายในกี่วันนับจากวันนี้ (วันไทย) ถึงนับเป็น "ใกล้หมดอายุ" */
export const DASHBOARD_EXPIRING_WITHIN_DAYS = 30;
/** bucket ของกราฟแนวโน้ม: ≤ 31 วัน = รายวัน · ≤ 120 วัน = รายสัปดาห์ (เริ่มวันจันทร์) · มากกว่านั้น = รายเดือน */
export const DASHBOARD_DAY_BUCKET_MAX_DAYS = 31;
export const DASHBOARD_WEEK_BUCKET_MAX_DAYS = 120;

export const DashboardBucket = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;
export type DashboardBucket = (typeof DashboardBucket)[keyof typeof DashboardBucket];

/** ปุ่มช่วงเวลาสำเร็จรูปของหน้าเว็บ — `CUSTOM` = เลือกวันเอง (`dashboardPresetRange` คืน `null`) */
export const DashboardRangePreset = {
  TODAY: 'TODAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  CUSTOM: 'CUSTOM',
} as const;
export type DashboardRangePreset = (typeof DashboardRangePreset)[keyof typeof DashboardRangePreset];

/** ไม่ส่ง `from`/`to` ทั้งคู่ = ช่วงนี้ (ต้นเดือนนี้ถึงวันนี้ ตามวันไทย) */
export const DASHBOARD_DEFAULT_PRESET = DashboardRangePreset.THIS_MONTH;

/**
 * สถานะออเดอร์ที่ "ควรพิมพ์ใบแปะหน้าแล้ว" — `orders.labelsPending` นับเฉพาะสถานะเหล่านี้ที่ `labelPrintedAt = null`
 * ลิงก์ให้เลขตรง: `/orders?printed=NO&status=<สถานะ>` (แท็บของหน้า list นับตามตัวกรอง `printed` เดียวกัน)
 */
export const DASHBOARD_LABEL_PENDING_STATUSES: readonly OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PREPARING];

// ── วันที่แบบ YYYY-MM-DD ล้วน ───────────────────────────────────────────────────────────────

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** เลขวันนับจาก 1970-01-01 (ปฏิทินล้วน · ไม่มีเวลา/timezone) */
function dayNumber(ymd: string): number {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS;
}

function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** `'2024-02-29'` → `true` · `'2026-02-29'` / `'2026-2-1'` / `'2026-13-01'` / `''` → `false` (รูปแบบ + วันมีจริงในปฏิทิน) */
export function isYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !YMD_PATTERN.test(value)) return false;
  const day = dayNumber(value);
  return Number.isFinite(day) && fromDayNumber(day) === value;
}

/** `ymdAddDays('2024-02-28', 1)` → `'2024-02-29'` · ติดลบได้ */
export function ymdAddDays(ymd: string, days: number): string {
  return fromDayNumber(dayNumber(ymd) + days);
}

/** จำนวนวันจาก `from` ถึง `to` (`to - from` · วันเดียวกัน = 0) */
export function ymdDiffDays(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** วันจันทร์ของสัปดาห์ที่ `ymd` อยู่ (สัปดาห์เริ่มจันทร์) */
function mondayOf(ymd: string): string {
  const day = dayNumber(ymd);
  // 1970-01-01 = วันพฤหัส → (day + 3) mod 7 = 0 คือวันจันทร์
  return fromDayNumber(day - (((day + 3) % 7) + 7) % 7);
}

function firstOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function nextMonthFirst(ymd: string): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  return month === 12 ? `${String(year + 1).padStart(4, '0')}-01-01` : `${ymd.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-01`;
}

/** bucket ของกราฟจากความยาวช่วง (วัน · รวมปลายทาง) */
export function dashboardBucketOf(days: number): DashboardBucket {
  if (days <= DASHBOARD_DAY_BUCKET_MAX_DAYS) return DashboardBucket.DAY;
  if (days <= DASHBOARD_WEEK_BUCKET_MAX_DAYS) return DashboardBucket.WEEK;
  return DashboardBucket.MONTH;
}

function calendarBucketStart(ymd: string, bucket: DashboardBucket): string {
  return bucket === DashboardBucket.DAY ? ymd : bucket === DashboardBucket.WEEK ? mondayOf(ymd) : firstOfMonth(ymd);
}

/** วันแรกของ bucket ที่ `ymd` อยู่ — ไม่ก่อน `from` (bucket แรกของช่วงถูกตัดให้เริ่มที่ `from`) */
export function dashboardBucketStartOf(ymd: string, bucket: DashboardBucket, from: string): string {
  const start = calendarBucketStart(ymd, bucket);
  return start < from ? from : start;
}

/** วันแรกของทุก bucket ในช่วง เรียงต่อเนื่องไม่ขาดไม่ซ้ำ — ตัวแรก = `from` เสมอ */
export function dashboardBucketStarts(from: string, to: string, bucket: DashboardBucket): string[] {
  const starts: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    starts.push(cursor);
    const base = calendarBucketStart(cursor, bucket);
    cursor = bucket === DashboardBucket.DAY ? ymdAddDays(base, 1) : bucket === DashboardBucket.WEEK ? ymdAddDays(base, 7) : nextMonthFirst(base);
  }
  return starts;
}

export interface DashboardDateRange {
  from: string;
  to: string;
}

/** ช่วงก่อนหน้า = ยาวเท่ากัน ติดกันก่อน `from` (`2026-10-01..2026-10-21` → `2026-09-10..2026-09-30`) */
export function dashboardPreviousRange(from: string, to: string): DashboardDateRange {
  const days = ymdDiffDays(from, to) + 1;
  return { from: ymdAddDays(from, -days), to: ymdAddDays(from, -1) };
}

/** ช่วงของปุ่มสำเร็จรูป (ปลายทาง = วันนี้เสมอ) · `CUSTOM` → `null` */
export function dashboardPresetRange(preset: DashboardRangePreset, todayYmd: string): DashboardDateRange | null {
  switch (preset) {
    case DashboardRangePreset.TODAY:
      return { from: todayYmd, to: todayYmd };
    case DashboardRangePreset.LAST_7_DAYS:
      return { from: ymdAddDays(todayYmd, -6), to: todayYmd };
    case DashboardRangePreset.LAST_30_DAYS:
      return { from: ymdAddDays(todayYmd, -29), to: todayYmd };
    case DashboardRangePreset.THIS_MONTH:
      return { from: firstOfMonth(todayYmd), to: todayYmd };
    case DashboardRangePreset.THIS_YEAR:
      return { from: `${todayYmd.slice(0, 4)}-01-01`, to: todayYmd };
    default:
      return null;
  }
}

/** ปุ่มที่ตรงกับช่วงนี้ (ไล่ตามลำดับ key — วันที่ 1 ของเดือน `TODAY` มาก่อน `THIS_MONTH`) · ไม่ตรงปุ่มใด = `CUSTOM` */
export function dashboardPresetOf(from: string, to: string, todayYmd: string): DashboardRangePreset {
  for (const preset of Object.values(DashboardRangePreset)) {
    const range = dashboardPresetRange(preset, todayYmd);
    if (range && range.from === from && range.to === to) return preset;
  }
  return DashboardRangePreset.CUSTOM;
}

/** เหตุผลของ 422 `VALIDATION_FAILED` ของ query `from`/`to` — หน้าเว็บใช้ตรวจก่อนยิงด้วยตัวเดียวกัน */
export type DashboardRangeReason = 'REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'DATE_RANGE' | 'TOO_LONG';

export interface DashboardRangeProblem {
  field: 'from' | 'to';
  reason: DashboardRangeReason;
}

/**
 * ตรวจ query ช่วงวันที่ (ค่าว่าง = ไม่ส่ง) — ไม่ส่งทั้งคู่ = ผ่าน (ใช้ `DASHBOARD_DEFAULT_PRESET`) · ส่งตัวเดียว → อีกตัว `REQUIRED` ·
 * รูปแบบผิด/วันไม่มีจริง `INVALID_FORMAT` · นอก `DASHBOARD_DATE_MIN..MAX` `OUT_OF_RANGE` · `from > to` → `to` `DATE_RANGE` ·
 * ยาวเกิน `DASHBOARD_RANGE_MAX_DAYS` → `to` `TOO_LONG` (366 วันพอดีผ่าน)
 */
export function dashboardRangeProblem(from: string | null | undefined, to: string | null | undefined): DashboardRangeProblem | null {
  const start = from ?? '';
  const end = to ?? '';
  if (start === '' && end === '') return null;
  if (start === '') return { field: 'from', reason: 'REQUIRED' };
  if (end === '') return { field: 'to', reason: 'REQUIRED' };
  for (const [field, value] of [['from', start], ['to', end]] as const) {
    if (!isYmd(value)) return { field, reason: 'INVALID_FORMAT' };
    if (value < DASHBOARD_DATE_MIN || value > DASHBOARD_DATE_MAX) return { field, reason: 'OUT_OF_RANGE' };
  }
  if (start > end) return { field: 'to', reason: 'DATE_RANGE' };
  if (ymdDiffDays(start, end) + 1 > DASHBOARD_RANGE_MAX_DAYS) return { field: 'to', reason: 'TOO_LONG' };
  return null;
}

// ── response ของ `GET /dashboard/summary` ─────────────────────────────────────────────────

/** query — ส่งคู่กันหรือไม่ส่งเลย (ดู `dashboardRangeProblem`) */
export interface DashboardSummaryQuery {
  from?: string;
  to?: string;
}

export interface DashboardRangeView {
  from: string;
  to: string;
  /** จำนวนวัน (รวมปลายทาง) */
  days: number;
  /** ช่วงก่อนหน้ายาวเท่ากัน (`dashboardPreviousRange`) — ใช้เทียบ % */
  prevFrom: string;
  prevTo: string;
  bucket: DashboardBucket;
}

export interface DashboardCountAmount {
  count: number;
  /** DECIMAL ข้อความ */
  amount: string;
}

/** รายรับ = รายการที่สถานะ ∈ `DONATION_COUNTED_STATUSES` (CONFIRMED + ORDERED) ตาม `donationDate` ในช่วง (SV-ADR-081) */
export interface DashboardRevenueView {
  amount: string;
  count: number;
  /** `amount / count` ปัดครึ่งขึ้นที่สตางค์ · `count = 0` → `"0.00"` */
  average: string;
  prevAmount: string;
  prevCount: number;
}

export interface DashboardDonationStatusRow extends DashboardCountAmount {
  status: DonationStatus;
}

export interface DashboardTrendPoint extends DashboardCountAmount {
  /** วันแรกของ bucket (`dashboardBucketStarts`) */
  bucketStart: string;
}

export interface DashboardTopSouvenir {
  souvenirId: string;
  /** snapshot จากแถวรายการล่าสุดของสินค้านั้น (ชื่อตอนแจก — สินค้าที่ถูกลบภายหลังยังมีชื่อ) */
  code: string;
  name: string;
  qty: number;
}

export interface DashboardDonationsSection {
  revenue: DashboardRevenueView;
  /** ทุกสถานะของ `DonationStatus` เสมอ (ตามลำดับ key) — รายการในช่วงตาม `donationDate` */
  byStatus: DashboardDonationStatusRow[];
  /** รายรับต่อ bucket ต่อเนื่องครบทุก bucket (ไม่มีรายการ = 0) */
  trend: DashboardTrendPoint[];
  /** งานค้างทั้งหมดตอนนี้ (ไม่ขึ้นกับช่วง) — ลิงก์ `/donations?status=PENDING` · `/donations?status=CONFIRMED` */
  queue: { pending: DashboardCountAmount; confirmedNotOrdered: DashboardCountAmount };
  /** ของที่ระลึกที่แจกมากสุด ≤ `DASHBOARD_TOP_LIMIT` — จากรายการที่นับรายรับในช่วง */
  topSouvenirs: DashboardTopSouvenir[];
  /** ชิ้นของที่ระลึกรวมของรายการที่นับรายรับในช่วง */
  souvenirQty: number;
}

export interface DashboardTopDonor {
  id: string;
  donorCode: string;
  /** `null` = ผู้บริจาคที่สมัครเองแต่ยังไม่กรอกชื่อ */
  fullName: string | null;
  amount: string;
  count: number;
}

export interface DashboardDonorsSection {
  /** ผู้บริจาคที่สร้างในช่วง (`createdAt` ตามวันไทย · ไม่นับที่ลบ) */
  newCount: number;
  prevNewCount: number;
  /** ทั้งหมดตอนนี้ (ไม่นับที่ลบ) — ลิงก์ `/donors` · `/donors?lineStatus=LINKED` */
  total: number;
  withLine: number;
  /** ผู้บริจาค (ที่ยังไม่ถูกลบ) ที่มีรายการนับรายรับในช่วง — ต้องมีสิทธิ์ `donations` ด้วย ไม่มี = `null` */
  activeCount: number | null;
  /** อันดับยอดรายรับในช่วง ≤ `DASHBOARD_TOP_LIMIT` (ไม่รวมผู้บริจาคที่ถูกลบ) — ต้องมีสิทธิ์ `donations` ด้วย ไม่มี = `null` */
  top: DashboardTopDonor[] | null;
}

export interface DashboardOrderStatusRow {
  status: OrderStatus;
  count: number;
}

export interface DashboardOrdersSection {
  /** ทุกสถานะของ `OrderStatus` เสมอ — ทั้งหมดตอนนี้ (ไม่นับที่ลบ) = ตัวเลขแท็บของ `/orders` */
  byStatus: DashboardOrderStatusRow[];
  /** ออเดอร์ที่ `shippedAt` / `receivedAt` อยู่ในช่วง (วันไทย) และไม่ถูกยกเลิก */
  shipped: { count: number; prevCount: number };
  received: { count: number; prevCount: number };
  /** ยังไม่พิมพ์ใบแปะหน้า ในสถานะ `DASHBOARD_LABEL_PENDING_STATUSES` — `byStatus` ครบทุกสถานะในรายการนั้น */
  labelsPending: { count: number; byStatus: DashboardOrderStatusRow[] };
  /** ชั่วโมงเฉลี่ย `confirmedAt` → `shippedAt` ของที่ส่งในช่วง (ทศนิยม 1 ตำแหน่ง) · ไม่มี = `null` */
  avgLeadTimeHours: number | null;
}

export interface DashboardLowStockItem {
  id: string;
  code: string;
  name: string;
  stockOnHand: number;
  lowStockThreshold: number | null;
  /** `stockLevelOf` — `OUT` | `LOW` */
  stockLevel: StockFilter;
}

export interface DashboardSouvenirsSection {
  /** สินค้า ACTIVE ที่ยังไม่ลบ ตามกติกา `stockLevelOf` — ลิงก์ `/souvenirs?stock=OUT&status=ACTIVE` · `/souvenirs?stock=LOW&status=ACTIVE` */
  outOfStockCount: number;
  lowStockCount: number;
  /** `OUT` ก่อน แล้วคงเหลือน้อยสุด ≤ `DASHBOARD_TOP_LIMIT` */
  lowStock: DashboardLowStockItem[];
  /** lot ที่ยังมีของ (`qtyRemaining > 0`) ของสินค้าที่ยังไม่ลบ — `count` หมดอายุวันนี้ถึง +`withinDays` วัน · `expiredCount` เลยวันหมดอายุแล้ว */
  expiringLots: { count: number; expiredCount: number; withinDays: number };
}

/** นิยามเดียวกับ `GET /chat/unread` (`threads` · `messages`) */
export interface DashboardChatSection {
  unreadThreads: number;
  unreadMessages: number;
}

export interface DashboardSummaryView {
  range: DashboardRangeView;
  /** ISO เวลาที่คำนวณ (ตัวเลขสด ไม่ cache) */
  generatedAt: string;
  donations: DashboardDonationsSection | null;
  donors: DashboardDonorsSection | null;
  orders: DashboardOrdersSection | null;
  souvenirs: DashboardSouvenirsSection | null;
  chat: DashboardChatSection | null;
}
