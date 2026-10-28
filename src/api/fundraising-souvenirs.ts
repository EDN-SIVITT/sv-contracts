import type { DonationActorView } from './donations';
import type { SouvenirStatus } from './souvenirs';

/**
 * ของที่ระลึก × กองทุน/แคมเปญ (`SV-CR-008`) — เงื่อนไขของที่ระลึก (`T-132` · SV-ADR-091) + จัดสรรสต็อกให้แคมเปญ (`T-133` · SV-ADR-092)
 * schema: `sv-api/migrations/0031_campaign_souvenir_stock.sql` · ใช้ของที่ระลึก/สต็อก/lot/ออเดอร์**เดิม** · ไม่เพิ่ม permission subject
 *
 * - `GET|PUT /funds/:id/souvenir-rules` (funds READ_ONLY / MAINTAIN · audit `fund_souvenir_rule` `{ rules }`) — `PUT` = แทนทั้งชุด
 * - `GET|PUT /campaigns/:id/souvenir-rules` (campaigns READ_ONLY / MAINTAIN · audit `campaign_souvenir_rule` `{ mode, rules }`)
 * - `GET /souvenirs?eligibleFundId=&eligibleCampaignId=&eligibleDate=` — picker ของรายการบริจาค (ไม่ส่งทั้ง 3 = เดิม)
 * - กฎ = **รายชื่อของที่เลือกได้ + เกณฑ์ยอดบริจาค/ชิ้นที่ใช้แทน `souvenirs.donation_threshold`** → snapshot `unit_donation_threshold` + งบเดิม (Σ qty × เกณฑ์ ≤ ยอด)
 * - ไม่มีกฎ + ไม่มีจัดสรร = พฤติกรรมเดิมทุกอย่าง (`LEGACY`)
 */

/** กฎต่อเจ้าของ (กองทุน 1 ตัว หรือแคมเปญ 1 ตัว) ไม่เกินนี้ — เกิน → 400 (DTO แบบ `items` ของรายการบริจาค · service ตรวจซ้ำ 422 `{ field: 'rules', reason: 'TOO_MANY', max }`) */
export const SOUVENIR_RULES_MAX = 50;

/**
 * โหมดของที่ระลึกของแคมเปญ (`campaigns.souvenir_rule_mode`) — `FUND` (ค่าเริ่มต้น) ใช้กฎของกองทุนแม่ · `CUSTOM` ใช้กฎของแคมเปญเอง · `NONE` ไม่แจกของ
 * กฎของแคมเปญเก็บไว้แม้สลับโหมด (สลับกลับไม่หาย)
 */
export const CampaignSouvenirRuleMode = {
  FUND: 'FUND',
  CUSTOM: 'CUSTOM',
  NONE: 'NONE',
} as const;
export type CampaignSouvenirRuleMode = (typeof CampaignSouvenirRuleMode)[keyof typeof CampaignSouvenirRuleMode];

/** นโยบายสต็อกของแคมเปญ (`campaigns.stock_policy` · `T-133`) — `SHARED` (ค่าเริ่มต้น = เดิม) ใช้ที่จัดสรร + สต็อกส่วนกลาง · `ALLOCATED` ใช้เฉพาะที่จัดสรร */
export const CampaignStockPolicy = {
  SHARED: 'SHARED',
  ALLOCATED: 'ALLOCATED',
} as const;
export type CampaignStockPolicy = (typeof CampaignStockPolicy)[keyof typeof CampaignStockPolicy];

/**
 * ผลของการ resolve กฎ ณ บริบท (กองทุน · แคมเปญ · วันที่บริจาค):
 * `LEGACY` = ไม่มีกฎ/ไม่มีกองทุน → แบบเดิม (ทุกสินค้า ACTIVE · เกณฑ์ของสินค้า) · `RULES` = เฉพาะของในกฎที่มีผลวันนั้น · เกณฑ์ = `minAmount` · `NONE` = แคมเปญไม่แจกของ
 */
export const SouvenirEligibilityMode = {
  LEGACY: 'LEGACY',
  RULES: 'RULES',
  NONE: 'NONE',
} as const;
export type SouvenirEligibilityMode = (typeof SouvenirEligibilityMode)[keyof typeof SouvenirEligibilityMode];

/** กฎที่ใช้มาจากไหน — `FUND` กองทุน (แคมเปญโหมด FUND หรือไม่มีแคมเปญ) · `CAMPAIGN` แคมเปญ (CUSTOM · และ NONE) */
export const SouvenirRuleSource = {
  FUND: 'FUND',
  CAMPAIGN: 'CAMPAIGN',
} as const;
export type SouvenirRuleSource = (typeof SouvenirRuleSource)[keyof typeof SouvenirRuleSource];

/** ชนิดของ ledger จัดสรร (`campaign_stock_allocation_movements.type` · `T-133`) — `qty` มีเครื่องหมาย (`DECREASE`/`RELEASE` ติดลบ) */
export const CampaignAllocationMovementType = {
  ALLOCATE: 'ALLOCATE',
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  RELEASE: 'RELEASE',
} as const;
export type CampaignAllocationMovementType = (typeof CampaignAllocationMovementType)[keyof typeof CampaignAllocationMovementType];

/** ชื่อ entity ที่ประทับลง audit (`@Audit({ entity })`) ของ `SV-CR-008` — subject = `funds` / `campaigns` ตามเมนูที่สั่ง */
export const FundraisingSouvenirAuditEntity = {
  /** `PUT /funds/:id/souvenir-rules` — UPDATE `{ rules }` */
  FUND_SOUVENIR_RULE: 'fund_souvenir_rule',
  /** `PUT /campaigns/:id/souvenir-rules` — UPDATE `{ mode, rules }` */
  CAMPAIGN_SOUVENIR_RULE: 'campaign_souvenir_rule',
  /** นโยบายสต็อกของแคมเปญ (`T-133`) — UPDATE `{ policy }` */
  CAMPAIGN_STOCK_POLICY: 'campaign_stock_policy',
  /** จัดสรร/ปรับ/คืน (`T-133`) — CREATE/UPDATE `{ campaign, souvenir, allocated, type, qty, note }` */
  CAMPAIGN_ALLOCATION: 'campaign_allocation',
} as const;
export type FundraisingSouvenirAuditEntity = (typeof FundraisingSouvenirAuditEntity)[keyof typeof FundraisingSouvenirAuditEntity];

// ── กฎ (`fundraising_souvenir_rules`) ────────────────────────────────────────────────────────────

/**
 * กฎ 1 แถวใน body — ลำดับใน array = `sortOrder` · ของชิ้นเดียวกันซ้ำได้ถ้าช่วงวันไม่ซ้อนกัน (ซ้อน → 422 `rules.N.startDate` `OVERLAP`)
 * `souvenirId` ไม่พบ/ถูกลบ → 422 `rules.N.souvenirId` `NOT_FOUND` (ระงับใส่ได้ — แต่รายการบริจาคยังเลือกของที่ระงับไม่ได้เหมือนเดิม)
 */
export interface SouvenirRuleInput {
  souvenirId: string;
  /** เกณฑ์ยอดบริจาค/ชิ้น (บาท) ข้อความหรือตัวเลข · ทศนิยม ≤ 2 · 0 – `SOUVENIR_VALUE_MAX` (0 = ของแจก) → ไม่งั้น 422 `rules.N.minAmount` */
  minAmount: string | number;
  /** `YYYY-MM-DD` · `null`/ไม่ส่ง = ไม่จำกัด · รวมวันปลาย · `endDate` < `startDate` → 422 `rules.N.endDate` `DATE_RANGE` */
  startDate?: string | null;
  endDate?: string | null;
}

/** กฎ 1 แถวใน view — เรียง `sortOrder, id` */
export interface SouvenirRuleView {
  id: string;
  /** ของที่ระลึก ณ ปัจจุบัน — `deleted` = ถูกลบ (soft) หลังตั้งกฎ (ไม่มีผลกับรายการบริจาคใหม่) */
  souvenir: { id: string; code: string; name: string; unit: string | null; status: SouvenirStatus; deleted: boolean };
  /** DECIMAL(12,2) เป็นข้อความ (`"1000.00"`) */
  minAmount: string;
  startDate: string | null;
  endDate: string | null;
  /** มีผล ณ วันนี้ (เวลาไทย) ตามช่วงวันที่ */
  effectiveToday: boolean;
  sortOrder: number;
}

/** body ของ `PUT /funds/:id/souvenir-rules` — แทนทั้งชุด · `[]` = ล้างกฎ (กองทุนกลับเป็น `LEGACY`) */
export interface FundSouvenirRulesInput {
  rules: SouvenirRuleInput[];
}

/** `GET|PUT /funds/:id/souvenir-rules` — กองทุนไม่พบ/ถูกลบ = 404 */
export interface FundSouvenirRulesView {
  fundId: string;
  rules: SouvenirRuleView[];
}

/** body ของ `PUT /campaigns/:id/souvenir-rules` — `rules` ไม่ส่ง = คงกฎเดิมของแคมเปญ (กฎเก็บไว้แม้สลับโหมด) */
export interface CampaignSouvenirRulesInput {
  mode: CampaignSouvenirRuleMode;
  rules?: SouvenirRuleInput[];
}

/** กฎที่มีผล ณ บริบทหนึ่ง (`resolve`) — `LEGACY` = `source: null` + `rules: []` · `NONE` = `source: CAMPAIGN` + `rules: []` */
export interface SouvenirEffectiveRulesView {
  mode: SouvenirEligibilityMode;
  source: SouvenirRuleSource | null;
  rules: SouvenirRuleView[];
}

/** `GET|PUT /campaigns/:id/souvenir-rules` — แคมเปญไม่พบ/ถูกลบ = 404 */
export interface CampaignSouvenirRulesView {
  campaignId: string;
  mode: CampaignSouvenirRuleMode;
  /** กฎของแคมเปญเอง (ใช้เมื่อ `CUSTOM` · เก็บไว้แม้โหมดอื่น) */
  rules: SouvenirRuleView[];
  /** กฎของกองทุนแม่ (ค่าเริ่มต้นเมื่อ `FUND`) */
  fundRules: SouvenirRuleView[];
  /** ที่มีผล ณ วันนี้ (เวลาไทย) ตามโหมด — กองทุนไม่มีกฎ + `FUND` = `LEGACY` */
  effective: SouvenirEffectiveRulesView;
}

// ── picker (`GET /souvenirs` + `eligible*`) ───────────────────────────────────────────────────────

/** meta เพิ่มของ `GET /souvenirs` เมื่อส่ง `eligibleFundId` / `eligibleCampaignId` / `eligibleDate` มาอย่างน้อย 1 ช่อง */
export interface SouvenirEligibilityMeta {
  mode: SouvenirEligibilityMode;
  source: SouvenirRuleSource | null;
  /** นโยบายสต็อกของแคมเปญ · ไม่มีแคมเปญ = `null` */
  stockPolicy: CampaignStockPolicy | null;
}

// ── จัดสรรสต็อกให้แคมเปญ (`T-133` · SV-ADR-092) ────────────────────────────────────────────────────
//
// ต่อสินค้า s: `used(c)` = Σ qty ในออเดอร์สถานะถือของ (`ORDER_STOCK_HELD_STATUSES`) ที่ `source_donation → campaign_id = c` (คำนวณจากออเดอร์เสมอ · ไม่เก็บตัวนับ) ·
// `draft(c)` = Σ ในออเดอร์ `DRAFT` (แสดง/เตือน · ไม่กินโควตา) · `remaining(c)` = max(0, allocated − used) · `free` = `stock_on_hand` − Σc remaining(c) (ติดลบ = จัดสรรเกินคงเหลือจริง) ·
// จัดสรร**ไม่**แตะ `stock_on_hand`/lot/movement สต็อก · ตัดสต็อก (`issueForOrder`) ตรวจ: ALLOCATED ≤ remaining(c) · SHARED ≤ remaining(c) + max(0, free) · ไม่มีแคมเปญ ≤ max(0, free)

/** `|qty|` ของการปรับ 1 ครั้ง (`POST /campaigns/:id/allocations`) ไม่เกินนี้ — เกิน/0/ไม่ใช่จำนวนเต็ม → 400 */
export const CAMPAIGN_ALLOCATION_QTY_MAX = 9_999_999;
/** หมายเหตุของการจัดสรร/คืน (`campaign_stock_allocation_movements.note`) */
export const CAMPAIGN_ALLOCATION_NOTE_MAX_LENGTH = 500;

/** ของที่ระลึก ณ ปัจจุบันในแถวจัดสรร/ประวัติ — `deleted` = ถูกลบ (soft) หลังจัดสรร */
export interface CampaignAllocationSouvenirRef {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  status: SouvenirStatus;
  deleted: boolean;
}

/** 1 แถวของ `GET /campaigns/:id/allocations` (และผลของจัดสรร/ปรับ/คืน) — จำนวนเป็นชิ้นทั้งหมด */
export interface CampaignAllocationView {
  souvenir: CampaignAllocationSouvenirRef;
  /** คงเหลือจริงของสินค้า (`stock_on_hand`) */
  onHand: number;
  /** โควตารวม (รวมที่ใช้แล้ว) · ไม่มีแถวจัดสรร = 0 */
  allocated: number;
  /** = `usedPending` + `usedShipped` (ตัดสต็อกไปแล้วจริง) */
  used: number;
  /** ออเดอร์ `CONFIRMED` + `PREPARING` (รอจัดส่ง) */
  usedPending: number;
  /** ออเดอร์ `SHIPPED` + `RECEIVED` (จัดส่งแล้ว) */
  usedShipped: number;
  /** ในออเดอร์ `DRAFT` ของแคมเปญ (จองอยู่ · ยังไม่ตัด · ไม่กินโควตา) */
  draft: number;
  /** max(0, allocated − used) */
  remaining: number;
  /** ที่แคมเปญยังใช้ได้หลังหักของในออเดอร์ `DRAFT` — ALLOCATED: max(0, remaining − draft) · SHARED: max(0, remaining + max(0, free) − draft) */
  available: number;
  /** สต็อกที่ยังไม่จัดสรรของสินค้านี้ (ทุกแคมเปญ) — ติดลบ = จัดสรรเกินคงเหลือจริง */
  free: number;
  /** แก้แถวจัดสรรล่าสุด (ISO) · ไม่มีแถว (มีแค่ออเดอร์) = `null` */
  updatedAt: string | null;
}

/** `GET /campaigns/:id/allocations` (campaigns READ_ONLY) — rows = แถวจัดสรร ∪ ของที่แคมเปญมีในออเดอร์ (ถือของ/`DRAFT`) เรียงรหัสสินค้า · แคมเปญไม่พบ/ถูกลบ = 404 */
export interface CampaignAllocationsView {
  campaignId: string;
  stockPolicy: CampaignStockPolicy;
  rows: CampaignAllocationView[];
}

/**
 * body ของ `POST /campaigns/:id/allocations` (campaigns MAINTAIN + souvenirs MAINTAIN) — `qty` จำนวนเต็ม ≠ 0 · |qty| ≤ `CAMPAIGN_ALLOCATION_QTY_MAX` (+ เพิ่ม · − ลด)
 * เพิ่ม: Δremaining ≤ max(0, free) ไม่งั้น 422 `CAMPAIGN_ALLOCATION_EXCEEDS_FREE { souvenirId, requested, free }` ·
 * ลด: ผล ≥ used และ ≥ 0 ไม่งั้น 422 `CAMPAIGN_ALLOCATION_BELOW_USED { souvenirId, allocated, used, requested }` ·
 * สินค้าไม่พบ/ถูกลบ → 422 `{ field: 'souvenirId', reason: 'NOT_FOUND' }` · ระงับ/แคมเปญปิดใช้งาน = ทำได้ · audit `campaign_allocation` CREATE (ครั้งแรก) / UPDATE
 */
export interface CampaignAllocationAdjustInput {
  souvenirId: string;
  qty: number;
  /** ≤ `CAMPAIGN_ALLOCATION_NOTE_MAX_LENGTH` · ว่าง = ไม่มี */
  note?: string | null;
}

/** body ของ `POST /campaigns/:id/allocations/:souvenirId/release` — allocated := min(allocated, used) · ไม่มีอะไรคืน = 200 ไม่เขียน (ไม่บันทึก audit) */
export interface CampaignAllocationReleaseInput {
  note?: string | null;
}

/** body ของ `PATCH /campaigns/:id/stock-policy` (campaigns MAINTAIN · audit `campaign_stock_policy` UPDATE `{ policy }` · ไม่เปลี่ยน = ไม่บันทึก) — ตอบ `CampaignView` */
export interface CampaignStockPolicyInput {
  policy: CampaignStockPolicy;
}

/** query ของ `GET /campaigns/:id/allocations/movements` — `page` / `perPage` แบบ list อื่น · `souvenirId` = เฉพาะสินค้านั้น */
export interface CampaignAllocationMovementsQuery {
  souvenirId?: string;
  page?: number;
  perPage?: number;
}

/** 1 แถวของ ledger จัดสรร (append-only) — ใหม่สุดก่อน · `qty` มีเครื่องหมาย · `qtyAfter` = โควตารวมหลังรายการนี้ */
export interface CampaignAllocationMovementView {
  id: string;
  souvenir: CampaignAllocationSouvenirRef;
  type: CampaignAllocationMovementType;
  qty: number;
  qtyAfter: number;
  note: string | null;
  actor: DonationActorView | null;
  createdAt: string;
}

/** แคมเปญ 1 ตัวที่จัดสรรสินค้านี้ (`SouvenirAllocationSummaryView.allocations`) */
export interface SouvenirAllocationCampaignView {
  campaign: { id: string; code: string | null; name: string; isActive: boolean; deleted: boolean; fund: { id: string; name: string } };
  policy: CampaignStockPolicy;
  allocated: number;
  used: number;
  draft: number;
  remaining: number;
}

/** กองทุน/แคมเปญที่มีเงื่อนไขของที่ระลึกอ้างสินค้านี้ (`fundraising_souvenir_rules` · ไม่รวมกองทุน/แคมเปญที่ถูกลบ) */
export interface SouvenirRuleUsageView {
  source: SouvenirRuleSource;
  fund: { id: string; name: string };
  /** กฎของกองทุน = `null` */
  campaign: { id: string; name: string } | null;
  minAmount: string;
  startDate: string | null;
  endDate: string | null;
  effectiveToday: boolean;
}

/** `GET /souvenirs/:id/allocations` (souvenirs READ_ONLY) — สินค้าไม่พบ/ถูกลบ = 404 */
export interface SouvenirAllocationSummaryView {
  souvenirId: string;
  /** คงเหลือจริง (`stock_on_hand`) */
  onHand: number;
  /** Σ remaining ทุกแคมเปญ (จัดสรรแล้วยังไม่ใช้) */
  allocatedRemaining: number;
  /** onHand − allocatedRemaining (ติดลบได้) */
  free: number;
  /** max(0, −free) — จัดสรรเกินคงเหลือจริง (เตือน) */
  overAllocated: number;
  /** เรียงรหัสแคมเปญ */
  allocations: SouvenirAllocationCampaignView[];
  ruleUsages: SouvenirRuleUsageView[];
}
