import type { DonationActorView } from './donations';
import type { FundraisingCellInput, FundraisingCellView } from './fundraising-content';
import type { CampaignSouvenirRuleMode } from './fundraising-souvenirs';

/**
 * โครงสร้างการรับบริจาค โปรแกรม (ภารกิจ) 1→N กองทุน (ตัวรับเงิน) 1→N แคมเปญ (รอบ/กิจกรรม) — `SV-CR-006` · FT-18 · SV-ADR-086/087 · `T-125`
 * schema: `sv-api/migrations/0029_fundraising.sql` · สิทธิ์ 3 เมนู `programs` `funds` `campaigns` (READ_ONLY ดู/ประวัติ · MAINTAIN เพิ่ม/แก้/เปิด-ปิดใช้งาน · FULL ลบ)
 *
 * - `GET /programs|funds|campaigns` (list · ค้นหา/ตัวกรอง/เรียง/หน้า) · `GET /:id` (view + ยอด) · `POST` · `PATCH /:id` (เปิด/ปิดใช้งาน = `isActive`) · `DELETE /:id` (soft)
 * - `GET /<เมนู>/history` · `GET /<เมนู>/:id/history` — ประวัติการแก้ไข (`RecordHistoryResponse` · `history.ts`)
 * - ไอคอนกองทุน/แคมเปญ (`T-188` · SV-ADR-136): `POST|DELETE /funds|campaigns/:id/icon` (MAINTAIN) · `GET …/:id/icon?v=` (READ_ONLY) · `GET …/:id/icon/public` (@Public · เปิดรับเท่านั้น) — ดูหัวข้อ "ไอคอน" ท้ายไฟล์
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
  /** ไอคอนที่อัปโหลด (`fundIconUrl` · PNG 256×256) · `null` = ไม่มี (หน้าเว็บแสดงไอคอนพื้นฐานของเมนู) — `T-188` */
  iconUrl: string | null;
}

/** แคมเปญ 1 แถวในหน้า view ของกองทุน (ที่ยังไม่ลบ · เรียงชื่อ) + ยอดของแคมเปญนั้น */
export interface FundCampaignItem extends FundraisingRef {
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  targetAmount: string | null;
  stats: FundraisingStats;
  /** ไอคอนของแคมเปญ (`campaignIconUrl`) · `null` = ไม่มี — `T-188` */
  iconUrl: string | null;
}

/** `GET /funds/:id` */
export interface FundView extends FundListItemView, FundraisingViewBase {
  campaigns: FundCampaignItem[];
  /** เนื้อหา post cell ตามลำดับ (`SV-CR-027` · SV-ADR-166 · `fundraising-content.ts`) · ว่าง = ไม่มีเนื้อหา */
  cells: FundraisingCellView[];
}

/** body ของ `POST /funds` — `PATCH` = `Partial` · ย้ายโปรแกรมได้ (รายการบริจาคไม่เก็บโปรแกรม) */
export interface FundInput extends ProgramInput {
  /**
   * ต้องมีอยู่และไม่ถูกลบ (ปิดใช้งานเลือกได้) → ไม่งั้น 422 `FUND_PROGRAM_NOT_FOUND` · ชื่อซ้ำในขอบเขตโปรแกรมเดียวกัน → 422 `FUND_NAME_TAKEN` (ไม่มีโปรแกรม = ขอบเขตเดียวกัน) ·
   * ชั้นโปรแกรม**เปิด**: สร้างต้องส่ง (ไม่ส่ง → 422 `FUND_PROGRAM_REQUIRED`) · แก้ไข `null` = ล้างโปรแกรม · ชั้นโปรแกรม**ปิด**: ช่องนี้ถูกเมิน (สร้าง = ไม่มีโปรแกรม · แก้ = คงเดิม) — SV-ADR-090
   */
  programId?: string | null;
  /** เนื้อหา post cell ทั้งชุดตามลำดับ (SV-ADR-166) — id เดิม = แก้ · ไม่มี id = เพิ่ม · cell เดิมที่ไม่อยู่ = ลบ · ไม่ส่ง = ไม่แตะ */
  cells?: FundraisingCellInput[];
}

// ── รหัสกองทุนอัตโนมัติ + ตรวจรหัสซ้ำ (`SV-CR-018` §4 · `T-189` · FT-18 `REQ-FND-020` · SV-ADR-137) ─────────────────

/**
 * รหัสอัตโนมัติ = `fundraising.fundCodePrefix` + เลขลำดับเติม 0 ให้ครบ `fundraising.fundCodeDigits` หลัก (`formatSequenceCode`) · เลขจาก `running_numbers('fund')` ·
 * ค่าด้านล่างเป็นค่าสำรองเมื่อ DB ยังไม่มีแถว (ยังไม่รัน `0050`) / ค่าเพี้ยน — กฎของค่าตั้งค่าอยู่ที่ `SETTING_STRING_RULES` / `SETTING_NUMBER_BOUNDS` (`./settings.ts`)
 * เฉพาะ**กองทุน** (โปรแกรม/แคมเปญยังกรอกเองตามเดิม · CR-018 §10)
 */
export const FUND_CODE_PREFIX_DEFAULT = 'FND';
export const FUND_CODE_DIGITS_DEFAULT = 4;
export const FUND_RUNNING_NUMBER_KEY = 'fund';

/** body ของ `POST /funds` — `autoCode: true` = ระบบออกรหัสให้ใน transaction (ส่งคู่กับ `code` ที่ไม่ว่าง = 422 `VALIDATION_FAILED { field: 'code', reason: 'AUTO_CODE_WITH_CODE' }`) · ชน 10 ครั้ง = 409 `FUND_CODE_CONFLICT` */
export interface FundCreateInput extends FundInput {
  autoCode?: boolean;
}

/** ผลตรวจรหัสที่ใช้ไม่ได้ — `TAKEN` = กองทุนอื่น (ที่ยังไม่ลบ · ไม่สนตัวพิมพ์ ตาม unique `uq_funds_code_active`) ใช้อยู่ · `INVALID` = ว่าง/ยาวเกิน/ไม่ตรง `FUNDRAISING_CODE_PATTERN` */
export const FundCodeCheckReason = {
  TAKEN: 'TAKEN',
  INVALID: 'INVALID',
} as const;
export type FundCodeCheckReason = (typeof FundCodeCheckReason)[keyof typeof FundCodeCheckReason];

/** `GET /funds/code-check?code=&excludeId=` (funds READ_ONLY · ไม่มี audit) — `excludeId` = กองทุนที่กำลังแก้ (รหัสเดิมของตัวเอง = ใช้ได้) */
export interface FundCodeCheckQuery {
  code: string;
  excludeId?: string;
}

export interface FundCodeCheckResponse {
  available: boolean;
  reason?: FundCodeCheckReason;
  /** กองทุนที่ใช้รหัสนี้อยู่ (เฉพาะ `TAKEN`) */
  takenBy?: { id: string; name: string };
}

/** `GET /funds/code-format` (funds MAINTAIN — ผู้กรอกฟอร์มอาจไม่มีสิทธิ์เมนูตั้งค่า) — `example` = รหัสถัดไปโดยประมาณ (เลขล่าสุด + 1 · ชนรหัสที่กรอกเองจะข้ามไปเลขถัดไป) */
export interface FundCodeFormatResponse {
  prefix: string;
  digits: number;
  example: string;
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
  /** ไอคอนที่อัปโหลด (`campaignIconUrl` · PNG 256×256) · `null` = ไม่มี (หน้าเว็บแสดงไอคอนพื้นฐานของเมนู) — `T-188` */
  iconUrl: string | null;
}

/** `GET /campaigns/:id` */
export interface CampaignView extends CampaignListItemView, FundraisingViewBase {
  /** โหมดของที่ระลึก (`SV-CR-008` · `T-132`) — แก้ผ่าน `PATCH /campaigns/:id/souvenir-mode` (หรือ `PUT …/souvenir-rules` เดิม) · ชนิดสต็อกอยู่ต่อของ (`GET …/souvenirs` · `T-194`) */
  souvenirRuleMode: CampaignSouvenirRuleMode;
  /** สัดส่วนรูปแคมเปญ กว้าง/สูง ปัด 3 ตำแหน่ง (`SV-CR-027` §3 · SV-ADR-167) · `null` = ไม่มีรูป หรือรูปเดิมก่อน `0060` (จัตุรัส — แสดง 1:1) */
  iconRatio: number | null;
  /** เนื้อหา post cell ตามลำดับ (SV-ADR-166) · ว่าง = ไม่มีเนื้อหา */
  cells: FundraisingCellView[];
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
  /** เนื้อหา post cell ทั้งชุดตามลำดับ (SV-ADR-166) — กติกาเดียวกับ `FundInput.cells` · ไม่ส่ง = ไม่แตะ */
  cells?: FundraisingCellInput[];
}

export interface CampaignListQuery extends Omit<FundraisingListQuery, 'sort'> {
  programId?: string;
  fundId?: string;
  sort?: CampaignSort;
  /**
   * ปี ค.ศ. `CAMPAIGN_YEAR_MIN`–`CAMPAIGN_YEAR_MAX` (`T-200` · SV-ADR-147) — แคมเปญที่ช่อง "ปี" = ปีนั้น หรือช่วงแคมเปญคาบเกี่ยวปีนั้น:
   * ปีเริ่ม = วันเริ่ม → ช่อง "ปี" → ปีที่สร้าง (เวลาไทย) · ปีสิ้นสุด = วันสิ้นสุด → (ไม่มีวันเริ่ม + มีช่อง "ปี" = ปีนั้น) → ยังดำเนินอยู่ ถึงปีปัจจุบัน (ไม่ลามปีอนาคต)
   */
  year?: number;
}

/** `GET /campaigns/years` (campaigns READ_ONLY · `T-200`) — ตัวเลือกของตัวกรองปี: ทุกปี ค.ศ. ที่มีแคมเปญ (ที่ยังไม่ลบ) ตามกติกาของ `year=` · ใหม่ → เก่า */
export interface CampaignYearsResponse {
  years: number[];
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

// ── ไอคอนกองทุน/แคมเปญ (`SV-CR-018` §3 · FT-18 `REQ-FND-019` · SV-ADR-136 · `T-188`) ─────────────────────

/**
 * ด้านของจัตุรัสที่เก็บ — sharp **cover (กลางภาพ) ≤ 512 px WebP** (`SV-CR-026` §1 · SV-ADR-164: รูปเต็มกรอบ คมบนหน้า LINE OA ที่แสดงใหญ่ขึ้น · เดิม 256 contain PNG พื้นโปร่ง) ·
 * ตัวตรวจเดียวกับไอคอนช่องทางติดต่อ (ไอคอนช่องทาง/กลุ่มยัง 128 contain PNG) · **ไม่รับ SVG** (ตรวจชนิดจากเนื้อไฟล์) · ไม่มีไอคอนของโปรแกรม (ผู้บริจาคไม่เห็นชั้นโปรแกรม)
 */
export const FUNDRAISING_ICON_PX = 512;
/** popup ตัดรูปของเว็บ: ผลที่ 512 px เกิน `FUNDRAISING_ICON_MAX_BYTES` → ตัดใหม่ที่ขนาดนี้ (`T-201` · SV-ADR-148) */
export const FUNDRAISING_ICON_FALLBACK_PX = 256;
/** ขนาดที่แนะนำให้ผู้ใช้เตรียม (คำแนะนำในฟอร์ม — คมบนจอ 2–3x ของหน้า LINE OA) */
export const FUNDRAISING_ICON_RECOMMENDED_PX = 512;
export const FUNDRAISING_ICON_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** ขนาดไฟล์สูงสุด — เกิน = 413 `FILE_TOO_LARGE { maxMb }` (และไม่เกิน `s3.maxUploadSizeMb` ของเมนูตั้งค่า) */
export const FUNDRAISING_ICON_MAX_BYTES = 1024 * 1024;
/** ขนาดภาพต้นฉบับต่อด้านที่รับ — นอกช่วง = 422 `IMAGE_DIMENSIONS_INVALID` (เท่าไอคอนช่องทางติดต่อ) */
export const FUNDRAISING_ICON_SOURCE_MIN_PX = 16;
export const FUNDRAISING_ICON_SOURCE_MAX_PX = 8000;
/** `icon_version` = hex 8 ตัว สุ่มใหม่ทุกครั้งที่อัปโหลด → URL `?v=` เปลี่ยน */
export const FUNDRAISING_ICON_VERSION_LENGTH = 8;

// ── รูปแคมเปญแบบประชาสัมพันธ์ (`SV-CR-027` §3 · SV-ADR-167 · `T-231`) ──────────────────────────────────

/**
 * แคมเปญใช้ endpoint/ช่องรูปเดิม (`POST /campaigns/:id/icon`) แต่**ไม่บังคับจัตุรัส** — API เก็บ WebP q82 คงสัดส่วน (`fit: inside`) ด้านยาว ≤ `CAMPAIGN_IMAGE_MAX_PX`
 * (ไม่ขยายรูปเล็ก) · สัดส่วนกว้าง/สูง (หลังหมุน EXIF) นอก `CAMPAIGN_IMAGE_RATIO_MIN`…`MAX` = 422 `IMAGE_DIMENSIONS_INVALID { reason: 'RATIO' }` ·
 * เก็บ `campaigns.icon_width/icon_height` (`0060`) → `iconRatio` · กองทุนคงจัตุรัส `FUNDRAISING_ICON_PX` เดิม
 */
export const CAMPAIGN_IMAGE_MAX_PX = 1280;
/** popup ตัดรูปของเว็บ: ผล JPEG ที่ 1280 เกิน `FUNDRAISING_ICON_MAX_BYTES` → ตัดใหม่ที่ด้านยาวนี้ */
export const CAMPAIGN_IMAGE_FALLBACK_PX = 960;
/** สัดส่วนกว้าง/สูงที่รับ — 1:2 … 3:1 */
export const CAMPAIGN_IMAGE_RATIO_MIN = 0.5;
export const CAMPAIGN_IMAGE_RATIO_MAX = 3;
/** สัดส่วนให้เลือกใน popup ตัดรูป — ตัวแรก = ค่าเริ่มต้น */
export const CAMPAIGN_IMAGE_ASPECTS = [
  { key: '16:9', w: 16, h: 9 },
  { key: '4:3', w: 4, h: 3 },
  { key: '1:1', w: 1, h: 1 },
  { key: '4:5', w: 4, h: 5 },
] as const;

/** ช่วงสัดส่วน (กว้าง/สูง) ที่หน้าเว็บใช้แสดงรูปแคมเปญ (`object-cover`) */
export interface CampaignImageRatioRange {
  min: number;
  max: number;
}
/** การ์ดรายการแคมเปญ + หน้าเลือกแคมเปญของแจ้งบริจาค — บีบช่วง 1:1 … 2:1 */
export const CAMPAIGN_IMAGE_CARD_RATIO: CampaignImageRatioRange = { min: 1, max: 2 };
/** hero หน้ารายละเอียดแคมเปญ — 4:5 … 2:1 */
export const CAMPAIGN_IMAGE_HERO_RATIO: CampaignImageRatioRange = { min: 0.8, max: 2 };

/** สัดส่วนที่ใช้แสดง — `null` (ไม่มีรูป/รูปเดิมจัตุรัส) = 1 แล้วบีบเข้าช่วง `range` */
export function campaignImageRatio(ratio: number | null, range: CampaignImageRatioRange): number {
  const value = ratio !== null && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.min(range.max, Math.max(range.min, value));
}

/** entity ที่ประทับลง audit (`@Audit({ entity })`) — subject = `funds` / `campaigns` · before/after = สรุป (ไม่มี object key) */
export const FundraisingIconAuditEntity = {
  FUND_ICON: 'fund_icon',
  CAMPAIGN_ICON: 'campaign_icon',
} as const;
export type FundraisingIconAuditEntity = (typeof FundraisingIconAuditEntity)[keyof typeof FundraisingIconAuditEntity];

/**
 * path ของ route proxy บน origin ของเว็บ (`sv-web/src/app/fund-icon/[file]/route.ts` · `campaign-icon/[file]`) — `[file]` = id ·
 * มี cookie → `GET /funds|campaigns/:id/icon?v=` (login + READ_ONLY ของเมนู · เห็นแถวที่ปิด) · ไม่มี cookie / 401 / 403 → `GET …/:id/icon/public`
 * (เฉพาะกองทุน/แคมเปญที่เปิดรับ — เกณฑ์ `OPEN_FUNDS` / `OPEN_CAMPAIGNS` ไม่กรองวันที่ · `<img>` ของหน้า LINE OA)
 */
export const FUND_ICON_PATH = '/fund-icon/';
export const CAMPAIGN_ICON_PATH = '/campaign-icon/';

/** URL ไอคอนกองทุนบน origin ของเว็บ (`<img src>` ทั้ง CMS และหน้า LIFF) */
export function fundIconUrl(id: string, version: string): string {
  return `${FUND_ICON_PATH}${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`;
}

/** URL ไอคอนแคมเปญบน origin ของเว็บ (`<img src>` ทั้ง CMS และหน้า LIFF — หน้าเลือกแคมเปญ `T-192`) */
export function campaignIconUrl(id: string, version: string): string {
  return `${CAMPAIGN_ICON_PATH}${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`;
}
