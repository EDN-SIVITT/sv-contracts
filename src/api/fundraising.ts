import type { DonationActorView } from './donations';
import type { CampaignSouvenirRuleMode, CampaignStockPolicy } from './fundraising-souvenirs';

/**
 * โครงสร้างการรับบริจาค โปรแกรม (ภารกิจ) 1→N กองทุน (ตัวรับเงิน) 1→N แคมเปญ (รอบ/กิจกรรม) — `SV-CR-006` · FT-18 · SV-ADR-086/087 · `T-125`
 * schema: `sv-api/migrations/0029_fundraising.sql` · สิทธิ์ 3 เมนู `programs` `funds` `campaigns` (READ_ONLY ดู/ประวัติ · MAINTAIN เพิ่ม/แก้/เปิด-ปิดใช้งาน · FULL ลบ)
 *
 * - `GET /programs|funds|campaigns` (list · ค้นหา/ตัวกรอง/เรียง/หน้า) · `GET /:id` (view + ยอด) · `POST` · `PATCH /:id` (เปิด/ปิดใช้งาน = `isActive`) · `DELETE /:id` (soft)
 * - `GET /<เมนู>/history` · `GET /<เมนู>/:id/history` — ประวัติการแก้ไข (`RecordHistoryResponse` · `history.ts`)
 * - `GET /programs/options` — **ทุกคนที่ login** · ต้นไม้ โปรแกรม → กองทุน → แคมเปญ (ตัวเลือกของฟอร์มรายการบริจาค · ตัวกรอง) · `?all=1` รวมที่ปิดใช้งาน
 * - ลบแม่ที่มีลูก/รายการบริจาคอ้าง (นับเฉพาะที่ยังไม่ลบ) → 409 `PROGRAM_IN_USE` / `FUND_IN_USE` / `CAMPAIGN_IN_USE` — ให้ปิดใช้งานแทน
 * - ปิดใช้งานไม่ cascade — ตัวเลือกใหม่ต้องเปิดทั้งสาย (แคมเปญ + กองทุน + โปรแกรม) · ของเดิมที่ผูกไว้แสดงต่อ
 * - รายการบริจาคเก็บ `fund_id` + `campaign_id` (ไม่เก็บโปรแกรม — derive จากกองทุน) → กองทุนย้ายโปรแกรมได้ · แคมเปญย้ายกองทุนไม่ได้เมื่อมีรายการอ้าง (409 `CAMPAIGN_HAS_DONATIONS`)
 */

/** รหัส (ไม่บังคับ · ไม่ซ้ำในแถวที่ยังไม่ลบ ทั้งระบบต่อชนิด) — `VARCHAR(30)` */
export const FUNDRAISING_CODE_MAX_LENGTH = 30;
/** A–Z a–z 0–9 . _ - / · ขึ้นต้นด้วยตัวอักษรหรือตัวเลข */
export const FUNDRAISING_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
export const FUNDRAISING_NAME_MAX_LENGTH = 200;
export const FUNDRAISING_DESCRIPTION_MAX_LENGTH = 1000;
/** เป้ายอดของแคมเปญ `DECIMAL(14,2)` (บาท) — ต้อง > 0 */
export const CAMPAIGN_TARGET_AMOUNT_MAX = '999999999999.99';
/** ปีของแคมเปญเป็น **ค.ศ.** (หน้าเว็บภาษาไทยแสดง/กรอก พ.ศ. แล้วแปลงเอง) — ข้อมูลประกอบ ไม่มี logic ผูกปี */
export const CAMPAIGN_YEAR_MIN = 2000;
export const CAMPAIGN_YEAR_MAX = 2200;

/**
 * เปิด/ปิดใช้งาน — ตัวกรอง `status` ของ list และค่าของช่อง `status` ใน "ประวัติการแก้ไข" (แปลงจาก `isActive`)
 * หน้าเว็บแปลด้วย `fundraising.status.<value>`
 */
export const FundraisingStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type FundraisingStatus = (typeof FundraisingStatus)[keyof typeof FundraisingStatus];

/** ลำดับของ list โปรแกรม/กองทุน (`?sort=`) — ไม่ส่ง = `name_asc` · ค่าเท่ากันเรียง `name, id` ต่อ */
export const FundraisingSort = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  CODE_ASC: 'code_asc',
  CODE_DESC: 'code_desc',
  UPDATED_DESC: 'updated_desc',
} as const;
export type FundraisingSort = (typeof FundraisingSort)[keyof typeof FundraisingSort];

/** ลำดับของ list แคมเปญ — เพิ่มเรียงตามปี (ไม่มีปีอยู่ท้ายเสมอ) */
export const CampaignSort = {
  ...FundraisingSort,
  YEAR_ASC: 'year_asc',
  YEAR_DESC: 'year_desc',
} as const;
export type CampaignSort = (typeof CampaignSort)[keyof typeof CampaignSort];

// ── โมเดลร่วม ────────────────────────────────────────────────────────────────────────────────

/** อ้างถึงโปรแกรม/กองทุน/แคมเปญ (แม่ใน list/view · ช่องในรายการบริจาค) — `deleted` = ถูกลบ (soft) แล้ว (ข้อมูลเดิมยังอ่านออก) */
export interface FundraisingRef {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  deleted: boolean;
}

/**
 * ยอดของรายการบริจาค (ที่ยังไม่ลบ) ที่ผูกกับโปรแกรม/กองทุน/แคมเปญนี้ — `donationCount` / `donationTotal` = สถานะใน `DONATION_COUNTED_STATUSES` ·
 * `pendingCount` = รอการยืนยัน · `donationTotal` = ทศนิยม 2 ตำแหน่งเป็นข้อความ (`"1500.00"`) · โปรแกรม = รวมทุกกองทุนในโปรแกรม (ตามโปรแกรมปัจจุบันของกองทุน)
 */
export interface FundraisingStats {
  donationCount: number;
  donationTotal: string;
  pendingCount: number;
}

/** ช่องร่วมของ list item ทั้ง 3 ชนิด */
interface FundraisingListItemBase {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  /** ปิด = ไม่ขึ้นในตัวเลือกใหม่ (`/programs/options`) แต่รายการเดิมที่ผูกไว้ยังแสดง */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** ช่องร่วมของหน้า view — ผู้สร้าง/แก้ล่าสุด (`null` = ไม่ทราบ · `name: null` = ผู้ใช้ถูกลบ) + ยอด */
interface FundraisingViewBase {
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
  stats: FundraisingStats;
}

/** query ร่วมของ list — `q` ค้นรหัส/ชื่อ (LIKE escape) · pagination กลาง (`perPage` ไม่ส่ง = ค่าจากเมนูตั้งค่า) */
export interface FundraisingListQuery {
  q?: string;
  status?: FundraisingStatus;
  sort?: FundraisingSort;
  page?: number;
  perPage?: number;
}

// ── โปรแกรม (`programs`) ─────────────────────────────────────────────────────────────────────────

/** แถวของ `GET /programs` */
export interface ProgramListItemView extends FundraisingListItemBase {
  /** จำนวนกองทุน (ที่ยังไม่ลบ) */
  fundCount: number;
}

/** กองทุน 1 แถวในหน้า view ของโปรแกรม (ที่ยังไม่ลบ · เรียงชื่อ) */
export interface ProgramFundItem extends FundraisingRef {
  /** จำนวนแคมเปญ (ที่ยังไม่ลบ) */
  campaignCount: number;
}

/** `GET /programs/:id` — snapshot ของ audit ด้วย */
export interface ProgramView extends ProgramListItemView, FundraisingViewBase {
  /** จำนวนแคมเปญ (ที่ยังไม่ลบ) ของทุกกองทุนในโปรแกรม */
  campaignCount: number;
  funds: ProgramFundItem[];
}

/** body ของ `POST /programs` — `PATCH /programs/:id` = `Partial` (ส่งเฉพาะช่องที่แก้ · `''`/`null` = ล้างช่องที่ไม่บังคับ) */
export interface ProgramInput {
  /** ไม่บังคับ · `FUNDRAISING_CODE_PATTERN` ≤ 30 · ซ้ำ → 422 `PROGRAM_CODE_TAKEN` */
  code?: string | null;
  /** ≤ 200 · ซ้ำ (ทั้งระบบ · ไม่สนตัวพิมพ์) → 422 `PROGRAM_NAME_TAKEN` */
  name: string;
  description?: string | null;
  /** ไม่ส่งตอนสร้าง = เปิดใช้งาน */
  isActive?: boolean;
}

export type ProgramListQuery = FundraisingListQuery;

// ── กองทุน (`funds`) ────────────────────────────────────────────────────────────────────────────

/** แถวของ `GET /funds` */
export interface FundListItemView extends FundraisingListItemBase {
  /** `null` = ยังไม่จัดโปรแกรม (`T-131` · SV-ADR-090 — โหมด 3 ชั้น หรือกองทุนเดิมที่ยังไม่จัด) */
  program: FundraisingRef | null;
  /** จำนวนแคมเปญ (ที่ยังไม่ลบ) */
  campaignCount: number;
}

/** แคมเปญ 1 แถวในหน้า view ของกองทุน (ที่ยังไม่ลบ · เรียงชื่อ) + ยอดของแคมเปญนั้น */
export interface FundCampaignItem extends FundraisingRef {
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  targetAmount: string | null;
  stats: FundraisingStats;
}

/** `GET /funds/:id` */
export interface FundView extends FundListItemView, FundraisingViewBase {
  campaigns: FundCampaignItem[];
}

/** body ของ `POST /funds` — `PATCH` = `Partial` · ย้ายโปรแกรมได้ (รายการบริจาคไม่เก็บโปรแกรม) */
export interface FundInput extends ProgramInput {
  /**
   * ต้องมีอยู่และไม่ถูกลบ (ปิดใช้งานเลือกได้) → ไม่งั้น 422 `FUND_PROGRAM_NOT_FOUND` · ชื่อซ้ำในขอบเขตโปรแกรมเดียวกัน → 422 `FUND_NAME_TAKEN` (ไม่มีโปรแกรม = ขอบเขตเดียวกัน) ·
   * ชั้นโปรแกรม**เปิด**: สร้างต้องส่ง (ไม่ส่ง → 422 `FUND_PROGRAM_REQUIRED`) · แก้ไข `null` = ล้างโปรแกรม · ชั้นโปรแกรม**ปิด**: ช่องนี้ถูกเมิน (สร้าง = ไม่มีโปรแกรม · แก้ = คงเดิม) — SV-ADR-090
   */
  programId?: string | null;
}

export interface FundListQuery extends FundraisingListQuery {
  /** id ของโปรแกรม หรือ `FUNDRAISING_PROGRAM_FILTER_NONE` = ยังไม่จัดโปรแกรม (`T-131`) */
  programId?: string;
}

/** ค่าตัวกรอง `programId` ของ list กองทุน/แคมเปญ = กองทุนที่ยังไม่จัดโปรแกรม (`T-131` · SV-ADR-090 · แบบ `DONATION_FUND_FILTER_NONE`) */
export const FUNDRAISING_PROGRAM_FILTER_NONE = 'none';

// ── แคมเปญ (`campaigns`) ────────────────────────────────────────────────────────────────────────

/** แถวของ `GET /campaigns` */
export interface CampaignListItemView extends FundraisingListItemBase {
  fund: FundraisingRef;
  /** โปรแกรมปัจจุบันของกองทุน · `null` = กองทุนยังไม่จัดโปรแกรม (`T-131`) */
  program: FundraisingRef | null;
  /** ค.ศ. · `null` = ไม่ระบุ */
  year: number | null;
  /** `YYYY-MM-DD` · `null` = ไม่ระบุ */
  startDate: string | null;
  endDate: string | null;
  /** เป้ายอด DECIMAL(14,2) เป็นข้อความ (`"500000.00"`) · `null` = ไม่ตั้งเป้า */
  targetAmount: string | null;
}

/** `GET /campaigns/:id` */
export interface CampaignView extends CampaignListItemView, FundraisingViewBase {
  /** โหมดของที่ระลึก (`SV-CR-008` · `T-132`) — แก้ผ่าน `PUT /campaigns/:id/souvenir-rules` เท่านั้น */
  souvenirRuleMode: CampaignSouvenirRuleMode;
  /** นโยบายสต็อก (`T-133`) — แก้ผ่าน `PATCH /campaigns/:id/stock-policy` เท่านั้น */
  stockPolicy: CampaignStockPolicy;
}

/** body ของ `POST /campaigns` — `PATCH` = `Partial` */
export interface CampaignInput extends ProgramInput {
  /** ต้องมีอยู่และไม่ถูกลบ → ไม่งั้น 422 `CAMPAIGN_FUND_NOT_FOUND` · ย้ายกองทุนขณะมีรายการบริจาคอ้าง → 409 `CAMPAIGN_HAS_DONATIONS` · ชื่อซ้ำในกองทุนเดียวกัน → 422 `CAMPAIGN_NAME_TAKEN` */
  fundId: string;
  /** ค.ศ. `CAMPAIGN_YEAR_MIN`–`CAMPAIGN_YEAR_MAX` */
  year?: number | null;
  /** `YYYY-MM-DD` · `endDate` < `startDate` → 422 `CAMPAIGN_DATE_RANGE_INVALID` */
  startDate?: string | null;
  endDate?: string | null;
  /** > 0 และ ≤ `CAMPAIGN_TARGET_AMOUNT_MAX` · ทศนิยม ≤ 2 ตำแหน่ง · รับข้อความหรือตัวเลข (แบบ `SouvenirInput.value`) · `''`/`null` = ไม่ตั้งเป้า */
  targetAmount?: string | number | null;
}

export interface CampaignListQuery extends Omit<FundraisingListQuery, 'sort'> {
  programId?: string;
  fundId?: string;
  sort?: CampaignSort;
}

// ── ตัวเลือก (`GET /programs/options`) ───────────────────────────────────────────────────────────

export interface FundraisingCampaignOption {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  year: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface FundraisingFundOption {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  campaigns: FundraisingCampaignOption[];
}

export interface FundraisingProgramOption {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  funds: FundraisingFundOption[];
}

/**
 * ต้นไม้ตัวเลือก — ไม่รวมที่ลบ · ปกติเฉพาะที่เปิดใช้งาน**ทั้งสาย** (กองทุนของโปรแกรมที่ปิด = ไม่ขึ้น) · `?all=1` รวมที่ปิดใช้งาน (ตัวกรอง)
 * ทุกชั้นเรียง `name, id` · โปรแกรมที่ยังไม่มีกองทุนก็ขึ้น (`funds: []`)
 */
export interface FundraisingOptionsResponse {
  programs: FundraisingProgramOption[];
  /** กองทุนที่ยังไม่จัดโปรแกรม (`program_id` NULL · `T-131`) — เกณฑ์เปิดใช้งาน/เรียงเหมือนกองทุนในต้นไม้ */
  unassignedFunds: FundraisingFundOption[];
  /**
   * ชั้นโปรแกรม (`fundraising.programEnabled` · SV-ADR-090) — `false` = หน้าเว็บรวมกองทุนทุกตัวเป็นรายการเดียว (ไม่แสดงโปรแกรม) และ
   * ตัวเลือกปกติ (ไม่ใช่ `all`) **ไม่ตัดกองทุนของโปรแกรมที่ปิด** (สถานะโปรแกรมไม่มีผลเมื่อปิดชั้น)
   */
  programEnabled: boolean;
}
