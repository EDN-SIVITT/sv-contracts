import type { DonationActorView } from './donations';
import type { SouvenirStatus } from './souvenirs';

/**
 * ของที่ระลึก × กองทุน/แคมเปญ (`SV-CR-008`) — เงื่อนไขของที่ระลึก (`T-132` · SV-ADR-091) + จัดสรรสต็อกให้แคมเปญ (`T-133` · SV-ADR-092)
 * schema: `sv-api/migrations/0031_campaign_souvenir_stock.sql` · ใช้ของที่ระลึก/สต็อก/lot/ออเดอร์**เดิม** · ไม่เพิ่ม permission subject
 *
 * - `GET|PUT /campaigns/:id/souvenir-rules` (campaigns READ_ONLY / MAINTAIN · audit `campaign_souvenir_rule` `{ mode, rules }`) — `PUT` = แทนทั้งชุด
 * - `GET /souvenirs?eligibleFundId=&eligibleCampaignId=&eligibleDate=` — picker ของรายการบริจาค (ไม่ส่งทั้ง 3 = เดิม)
 * - กฎ = **รายชื่อของที่เลือกได้ + เกณฑ์ยอดบริจาค/ชิ้นที่ใช้แทน `souvenirs.donation_threshold`** → snapshot `unit_donation_threshold` + งบเดิม (Σ qty × เกณฑ์ ≤ ยอด)
 * - **ของที่ระลึกกำหนดที่แคมเปญเท่านั้น** (`T-190` · SV-ADR-138): เลิกใช้กฎของกองทุน (`GET|PUT /funds/:id/souvenir-rules` ถูกลบ · แถว `fund_id` เดิมเก็บไว้ในตารางแต่ไม่ถูกอ่าน) ·
 *   ไม่มีแคมเปญ (บริจาคเข้ากองทุนตรง/ทั่วไป) = พฤติกรรมเดิมทุกอย่าง (`LEGACY`)
 */

/** กฎต่อแคมเปญ 1 ตัวไม่เกินนี้ — เกิน → 400 (DTO แบบ `items` ของรายการบริจาค · service ตรวจซ้ำ 422 `{ field: 'rules', reason: 'TOO_MANY', max }`) */
export const SOUVENIR_RULES_MAX = 50;

/**
 * โหมดของที่ระลึกของแคมเปญ (`campaigns.souvenir_rule_mode`) — `CUSTOM` "แจกของที่ระลึก" (ค่าเริ่มต้น) ใช้กฎของแคมเปญ (ว่าง = ไม่มีของให้เลือก) · `NONE` "ไม่แจกของที่ระลึก"
 * กฎของแคมเปญเก็บไว้แม้สลับโหมด (สลับกลับไม่หาย) · `FUND` (ใช้กฎกองทุนแม่) เลิกใช้แล้ว (`T-190` · `0051` ย้ายเป็น `CUSTOM`) — ค่าไม่รู้จักใน DB = `CUSTOM`
 */
export const CampaignSouvenirRuleMode = {
  CUSTOM: 'CUSTOM',
  NONE: 'NONE',
} as const;
export type CampaignSouvenirRuleMode = (typeof CampaignSouvenirRuleMode)[keyof typeof CampaignSouvenirRuleMode];

/**
 * สถานะของของที่ระลึก 1 ชิ้นในแคมเปญ (`fundraising_souvenir_rules.status` · `0052` · `T-194` · SV-ADR-142) — `ACTIVE` ปกติ ·
 * `SUSPENDED` ระงับ = **ไม่อยู่ใน eligibility** (picker CMS · แคตตาล็อก/ฟอร์ม LINE OA · ป้าย `hasSouvenirs` · ชิป/ตัวกรองของเมนูของที่ระลึก) แต่ยังกันสต็อกตามชนิดสต็อก
 */
export const CampaignSouvenirStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type CampaignSouvenirStatus = (typeof CampaignSouvenirStatus)[keyof typeof CampaignSouvenirStatus];

/**
 * ชนิดสต็อกต่อ (แคมเปญ, ของ) (`fundraising_souvenir_rules.stock_mode` · `0052` · SV-ADR-142 — แทนนโยบายระดับแคมเปญ `campaigns.stock_policy` ที่เลิกอ่านแล้ว) ·
 * ยอดที่แคมเปญ c ใช้ของ s ได้: `RESERVED` = remaining(c,s) เท่านั้น (จองเกินคงเหลือจริงได้ = pre-order · ตัดสต็อกจริงยังต้องมีของ → ออเดอร์รอใน `DRAFT` · SV-ADR-098) ·
 * `CENTRAL` (ค่าเริ่มต้น) หรือไม่มีแถว = remaining(c,s) + max(0, free) · ไม่มีแคมเปญ = max(0, free)
 */
export const CampaignSouvenirStockMode = {
  CENTRAL: 'CENTRAL',
  RESERVED: 'RESERVED',
} as const;
export type CampaignSouvenirStockMode = (typeof CampaignSouvenirStockMode)[keyof typeof CampaignSouvenirStockMode];

/**
 * ผลของการ resolve กฎ ณ บริบท (แคมเปญ · วันที่บริจาค):
 * `LEGACY` = ไม่มีแคมเปญ (บริจาคเข้ากองทุนตรง/ทั่วไป) → แบบเดิม (ทุกสินค้า ACTIVE · เกณฑ์ของสินค้า) ·
 * `RULES` = แคมเปญแจกของ (`CUSTOM`) — เฉพาะของในกฎของแคมเปญที่มีผลวันนั้น · เกณฑ์ = `minAmount` (ว่าง = ไม่มีของให้เลือก) · `NONE` = แคมเปญไม่แจกของ
 */
export const SouvenirEligibilityMode = {
  LEGACY: 'LEGACY',
  RULES: 'RULES',
  NONE: 'NONE',
} as const;
export type SouvenirEligibilityMode = (typeof SouvenirEligibilityMode)[keyof typeof SouvenirEligibilityMode];

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
  /** เลิกใช้ (`T-190` · endpoint `PUT /funds/:id/souvenir-rules` ถูกลบ) — คงชื่อไว้อ้างแถว audit เดิม (subject `funds` · UPDATE `{ rules }`) */
  FUND_SOUVENIR_RULE: 'fund_souvenir_rule',
  /** `PUT /campaigns/:id/souvenir-rules` — UPDATE `{ mode, rules }` */
  CAMPAIGN_SOUVENIR_RULE: 'campaign_souvenir_rule',
  /** เลิกใช้ (`T-194` · `PATCH /campaigns/:id/stock-policy` ถูกลบ) — คงชื่อไว้อ้างแถว audit เดิม (UPDATE `{ policy }`) */
  CAMPAIGN_STOCK_POLICY: 'campaign_stock_policy',
  /** ของที่ระลึกในแคมเปญ (`T-194`) — `POST` CREATE `{ items }` · `PATCH` UPDATE `{ item, changes, allocation? }` · `DELETE` DELETE `{ item, released }` */
  CAMPAIGN_SOUVENIR: 'campaign_souvenir',
  /** `PATCH /campaigns/:id/souvenir-mode` — UPDATE `{ mode }` */
  CAMPAIGN_SOUVENIR_MODE: 'campaign_souvenir_mode',
  /** จัดสรร/ปรับ/คืน (`T-133`) — CREATE/UPDATE `{ campaign, souvenir, allocated, type, qty, note }` */
  CAMPAIGN_ALLOCATION: 'campaign_allocation',
} as const;
export type FundraisingSouvenirAuditEntity = (typeof FundraisingSouvenirAuditEntity)[keyof typeof FundraisingSouvenirAuditEntity];

// ── กฎ (`fundraising_souvenir_rules`) ────────────────────────────────────────────────────────────

/**
 * กฎ 1 แถวใน body (`PUT /campaigns/:id/souvenir-rules` — คงไว้เพื่อความเข้ากันได้ · `T-194`) — ลำดับใน array = `sortOrder` ·
 * ของชิ้นเดียวกัน 1 แถวต่อแคมเปญ (ซ้ำ → 422 `rules.N.souvenirId` `DUPLICATE` · `0052` UNIQUE) · ช่วงวันของกฎแคมเปญ**ไม่ใช้แล้ว** (ใช้ช่วงแคมเปญ — ค่าที่ส่งมาถูกตรวจรูปแบบแล้วทิ้ง) ·
 * `souvenirId` ไม่พบ/ถูกลบ → 422 `rules.N.souvenirId` `NOT_FOUND` (ระงับใส่ได้ — แต่รายการบริจาคยังเลือกของที่ระงับไม่ได้เหมือนเดิม) ·
 * แถวที่ยังอยู่คง `status`/`stockMode` เดิม · แถวใหม่ = `ACTIVE` + `CENTRAL` · แถวที่หายไป = แบบ `DELETE …/souvenirs/:souvenirId` (คืนที่จองเหลือ — ต้องมี souvenirs MAINTAIN ถ้ามีที่ต้องคืน)
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
  souvenir: { id: string; code: string; name: string; unit: string | null; status: SouvenirStatus; deleted: boolean; imageVersion: string | null };
  /** DECIMAL(12,2) เป็นข้อความ (`"1000.00"`) */
  minAmount: string;
  startDate: string | null;
  endDate: string | null;
  /** มีผล ณ วันนี้ (เวลาไทย) ตามช่วงวันที่ */
  effectiveToday: boolean;
  sortOrder: number;
  /** `SUSPENDED` = ไม่อยู่ใน `effective` (`T-194`) */
  status: CampaignSouvenirStatus;
  stockMode: CampaignSouvenirStockMode;
}

/** body ของ `PUT /campaigns/:id/souvenir-rules` — `rules` ไม่ส่ง = คงกฎเดิมของแคมเปญ (กฎเก็บไว้แม้สลับโหมด) · `mode` นอก `CUSTOM`/`NONE` (รวม `FUND` เดิม) = 400 */
export interface CampaignSouvenirRulesInput {
  mode: CampaignSouvenirRuleMode;
  rules?: SouvenirRuleInput[];
}

/** กฎที่มีผล ณ บริบทหนึ่ง (`resolve`) — `NONE` = `rules: []` · `RULES` = กฎของแคมเปญที่มีผลวันนั้น (ว่างได้) */
export interface SouvenirEffectiveRulesView {
  mode: SouvenirEligibilityMode;
  rules: SouvenirRuleView[];
}

/** `GET|PUT /campaigns/:id/souvenir-rules` — แคมเปญไม่พบ/ถูกลบ = 404 */
export interface CampaignSouvenirRulesView {
  campaignId: string;
  mode: CampaignSouvenirRuleMode;
  /** กฎของแคมเปญ (ใช้เมื่อ `CUSTOM` · เก็บไว้แม้ `NONE`) */
  rules: SouvenirRuleView[];
  /** ที่มีผล ณ วันนี้ (เวลาไทย) ตามโหมด — `CUSTOM` = `RULES` · `NONE` = `NONE` */
  effective: SouvenirEffectiveRulesView;
}

// ── picker (`GET /souvenirs` + `eligible*`) ───────────────────────────────────────────────────────

/** meta เพิ่มของ `GET /souvenirs` เมื่อส่ง `eligibleFundId` / `eligibleCampaignId` / `eligibleDate` มาอย่างน้อย 1 ช่อง */
export interface SouvenirEligibilityMeta {
  mode: SouvenirEligibilityMode;
}

// ── จัดสรรสต็อกให้แคมเปญ (`T-133` · SV-ADR-092) ────────────────────────────────────────────────────
//
// ต่อสินค้า s: `used(c)` = Σ qty ในออเดอร์สถานะถือของ (`ORDER_STOCK_HELD_STATUSES`) ที่ `source_donation → campaign_id = c` (คำนวณจากออเดอร์เสมอ · ไม่เก็บตัวนับ) ·
// `draft(c)` = Σ ในออเดอร์ `DRAFT` (แสดง/เตือน · ไม่กินโควตา) · `remaining(c)` = max(0, allocated − used) · `free` = `stock_on_hand` − Σc remaining(c) (ติดลบ = จัดสรรเกินคงเหลือจริง) ·
// จัดสรร**ไม่**แตะ `stock_on_hand`/lot/movement สต็อก · ตัดสต็อก (`issueForOrder`) ตรวจต่อ (c, s) ตาม `CampaignSouvenirStockMode` (`T-194`):
// RESERVED ≤ remaining(c,s) · CENTRAL/ไม่มีแถว ≤ remaining(c,s) + max(0, free) · ไม่มีแคมเปญ ≤ max(0, free)

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
  /** version ของรูปหลัก (= `SouvenirListItemView.imageVersion`) · `null` = ไม่มีรูป (`T-194` · CR-019 #3.1) */
  imageVersion: string | null;
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
  /** ออเดอร์ `SHIPPED` + `RECEIVED` + `COMPLETED` (จัดส่งแล้ว · SV-ADR-149) */
  usedShipped: number;
  /** ในออเดอร์ `DRAFT` ของแคมเปญ (จองอยู่ · ยังไม่ตัด · ไม่กินโควตา) */
  draft: number;
  /** max(0, allocated − used) */
  remaining: number;
  /** ที่แคมเปญยังใช้ได้หลังหักของในออเดอร์ `DRAFT` ตามชนิดสต็อกของ (c, s) — RESERVED: max(0, remaining − draft) · CENTRAL/ไม่มีแถว: max(0, remaining + max(0, free) − draft) */
  available: number;
  /** สต็อกที่ยังไม่จัดสรรของสินค้านี้ (ทุกแคมเปญ) — ติดลบ = จัดสรรเกินคงเหลือจริง */
  free: number;
  /** แก้แถวจัดสรรล่าสุด (ISO) · ไม่มีแถว (มีแค่ออเดอร์) = `null` */
  updatedAt: string | null;
}

/** `GET /campaigns/:id/allocations` (campaigns READ_ONLY) — rows = แถวจัดสรร ∪ ของที่แคมเปญมีในออเดอร์ (ถือของ/`DRAFT`) เรียงรหัสสินค้า · แคมเปญไม่พบ/ถูกลบ = 404 */
export interface CampaignAllocationsView {
  campaignId: string;
  rows: CampaignAllocationView[];
}

/**
 * body ของ `POST /campaigns/:id/allocations` (campaigns MAINTAIN + souvenirs MAINTAIN) — `qty` จำนวนเต็ม ≠ 0 · |qty| ≤ `CAMPAIGN_ALLOCATION_QTY_MAX` (+ เพิ่ม · − ลด)
 * เพิ่ม: Δremaining ≤ max(0, free) ไม่งั้น 422 `CAMPAIGN_ALLOCATION_EXCEEDS_FREE { souvenirId, requested, free, delta }` (เว้นแต่ `preorder: true`) ·
 * ลด: ผล ≥ used และ ≥ 0 ไม่งั้น 422 `CAMPAIGN_ALLOCATION_BELOW_USED { souvenirId, allocated, used, requested }` ·
 * สินค้าไม่พบ/ถูกลบ → 422 `{ field: 'souvenirId', reason: 'NOT_FOUND' }` · ระงับ/แคมเปญปิดใช้งาน = ทำได้ · audit `campaign_allocation` CREATE (ครั้งแรก) / UPDATE
 * (`after.preorderQty` = ส่วนที่เกิน free ของครั้งนี้)
 */
export interface CampaignAllocationAdjustInput {
  souvenirId: string;
  qty: number;
  /** ≤ `CAMPAIGN_ALLOCATION_NOTE_MAX_LENGTH` · ว่าง = ไม่มี */
  note?: string | null;
  /**
   * Pre-order (SV-ADR-098 · `T-142`) — `true` = ยืนยันจัดสรรเกินสต็อกที่ยังไม่จัดสรร (ข้ามเพดาน max(0, free) · free ติดลบได้) ·
   * ledger `preorderQty` = max(0, Δremaining − max(0, free)) ณ ตอนนั้น (ไม่เกิน = 0) · ไม่ส่ง/`false` = 422 เดิม · ตอนลด (`qty` < 0) = ไม่มีผล
   */
  preorder?: boolean;
}

/**
 * body ของ `POST /campaigns/:id/allocations/:souvenirId/release` (SV-ADR-097 · `T-141`) — ledger `RELEASE` −จำนวนที่คืน · audit `campaign_allocation` UPDATE
 * - ไม่ส่ง `qty` = คืนทั้งหมด: allocated := min(allocated, used) · ไม่มีอะไรคืน = 200 ไม่เขียน (ไม่บันทึก audit)
 * - ส่ง `qty` = คืนบางส่วน: allocated −= qty · ต้อง ≤ remaining (= ส่วนที่ไม่ใช้ = max(0, allocated − used) · รวมส่วนที่ออเดอร์ร่างจอง) ไม่งั้น
 *   422 `CAMPAIGN_ALLOCATION_RELEASE_EXCEEDS { souvenirId, remaining, requested, allocated, used }` (ตรวจใต้ล็อก)
 */
export interface CampaignAllocationReleaseInput {
  /** จำนวนเต็ม 1…`CAMPAIGN_ALLOCATION_QTY_MAX` · ไม่ส่ง = คืนทั้งหมด */
  qty?: number;
  /** ≤ `CAMPAIGN_ALLOCATION_NOTE_MAX_LENGTH` · ว่าง = ไม่มี */
  note?: string | null;
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
  /** ส่วนที่จัดสรรเกินสต็อกที่ยังไม่จัดสรร ณ ตอนนั้น (Pre-order · SV-ADR-098 · `0033`) — ประวัติ ไม่ใช่สถานะ · 0 = ไม่เกิน / ลด / คืน / แถวก่อน `0033` */
  preorderQty: number;
  note: string | null;
  actor: DonationActorView | null;
  createdAt: string;
}

/** แคมเปญ 1 ตัวที่จัดสรรสินค้านี้ (`SouvenirAllocationSummaryView.allocations`) */
export interface SouvenirAllocationCampaignView {
  campaign: { id: string; code: string | null; name: string; isActive: boolean; deleted: boolean; fund: { id: string; name: string } };
  /** ชนิดสต็อกของ (แคมเปญ, ของนี้) — `null` = ไม่มีของนี้ในแคมเปญแล้ว (ลบออกหลังใช้ไป · แถวจัดสรรคงไว้เป็นประวัติ) */
  stockMode: CampaignSouvenirStockMode | null;
  /** สถานะของของนี้ในแคมเปญ — `null` แบบเดียวกับ `stockMode` */
  status: CampaignSouvenirStatus | null;
  allocated: number;
  used: number;
  draft: number;
  remaining: number;
}

/** แคมเปญที่มีเงื่อนไขของที่ระลึกอ้างสินค้านี้ (`fundraising_souvenir_rules` ของแคมเปญ · ไม่รวมกองทุน/แคมเปญที่ถูกลบ · กฎของกองทุนเดิมไม่แสดง — `T-190`) */
export interface SouvenirRuleUsageView {
  /** กองทุนแม่ของแคมเปญ */
  fund: { id: string; name: string };
  campaign: { id: string; name: string };
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

// ── ของที่ระลึก ↔ แคมเปญที่เกี่ยวข้อง (`SV-CR-018` §6 · `T-191` · SV-ADR-139 · FT-15 `REQ-SVN-018`) ─────────────────────
//
// "แคมเปญที่เกี่ยวข้อง" ของสินค้า = แคมเปญที่**ไม่ลบ** (กองทุนแม่ไม่ลบ) · โหมด `CUSTOM` (ค่าไม่รู้จัก = `CUSTOM` · `NONE` ไม่นับ — กฎค้างไม่มีผล) ·
// มีกฎของสินค้านั้น ≥ 1 แถว (เปิด/ปิดใช้งาน · หมดช่วงก็นับ แต่บอกสถานะ) · กฎของกองทุนเดิม (`fund_id`) ไม่นับ (`T-190`) ·
// ชิป/ตัวกรอง `campaignId`/ตัวเลือกตัวกรอง นับเฉพาะของที่ `ACTIVE` ในแคมเปญ · การ์ด `GET /souvenirs/:id/campaigns` คืนทุกแถวพร้อม `status` (`T-194`)

/** ค่าพิเศษของตัวกรอง `GET /souvenirs?campaignId=` = ไม่อยู่ในแคมเปญที่เกี่ยวข้องใดเลย */
export const SOUVENIR_CAMPAIGN_FILTER_NONE = 'none';
/** แคมเปญที่ส่งมาในแถวของ list (`campaigns.items`) ไม่เกินนี้ — ที่เหลือนับใน `total` · ชื่อใน `otherNames` */
export const SOUVENIR_LIST_CAMPAIGNS_PREVIEW = 2;
/** ชื่อแคมเปญที่เหลือ (`campaigns.otherNames` — tooltip ของ "+N") ไม่เกินนี้ */
export const SOUVENIR_LIST_CAMPAIGN_NAMES_MAX = 10;

/**
 * สถานะแคมเปญ ณ วันนี้ (เวลาไทย) — ลำดับตัดสิน: `INACTIVE` (แคมเปญ/กองทุนปิดใช้งาน หรือโปรแกรมแม่ถูกลบ/ปิดเมื่อชั้นโปรแกรมเปิด = เกณฑ์ `OPEN_CAMPAIGNS`) →
 * `NOT_STARTED` (วันนี้ < วันเริ่ม) → `ENDED` (วันนี้ > วันสิ้นสุด) → `OPEN` (เปิดรับบริจาค)
 */
export const SouvenirCampaignStatus = {
  OPEN: 'OPEN',
  INACTIVE: 'INACTIVE',
  NOT_STARTED: 'NOT_STARTED',
  ENDED: 'ENDED',
} as const;
export type SouvenirCampaignStatus = (typeof SouvenirCampaignStatus)[keyof typeof SouvenirCampaignStatus];

/** แคมเปญ 1 ตัวในแถวของ list (ชิป) */
export interface SouvenirCampaignChip {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  /** `status === OPEN` (เปิดรับบริจาควันนี้) */
  open: boolean;
  /** มีกฎของสินค้านี้ที่มีผลวันนี้ ≥ 1 แถว */
  effectiveToday: boolean;
}

/** `SouvenirListItemView.campaigns` — query รวมครั้งเดียวต่อหน้า (ไม่ N+1) · items เรียง: เปิดรับ + มีผลวันนี้ก่อน แล้วชื่อ แล้ว id */
export interface SouvenirCampaignsSummary {
  /** จำนวนแคมเปญที่เกี่ยวข้องทั้งหมด (0 = ไม่อยู่ในแคมเปญใด) */
  total: number;
  /** ≤ `SOUVENIR_LIST_CAMPAIGNS_PREVIEW` */
  items: SouvenirCampaignChip[];
  /** ชื่อของแคมเปญที่เหลือ (ลำดับเดียวกัน) ≤ `SOUVENIR_LIST_CAMPAIGN_NAMES_MAX` — tooltip ของ "+N" */
  otherNames: string[];
}

/** 1 ตัวเลือกของ `GET /souvenirs/campaign-options` (souvenirs READ_ONLY) = แคมเปญที่เกี่ยวข้องกับของ (ไม่ลบ) ≥ 1 ชิ้น · เรียงชื่อ แล้ว id */
export interface SouvenirCampaignOption {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  fundName: string;
}

/** กฎ 1 แถวของสินค้านี้ในแคมเปญ (เรียง `sort_order, id` ตามที่หน้าแคมเปญบันทึก) */
export interface SouvenirCampaignRuleRef {
  /** เกณฑ์ยอดบริจาค/ชิ้น `"1000.00"` */
  minAmount: string;
  /** `YYYY-MM-DD` · `null` = ไม่จำกัด */
  startDate: string | null;
  endDate: string | null;
  effectiveToday: boolean;
}

/**
 * 1 แคมเปญของ `GET /souvenirs/:id/campaigns` (souvenirs READ_ONLY · สินค้าไม่พบ/ถูกลบ = 404) — กฎของชิ้นนี้จัดกลุ่มตามแคมเปญ ·
 * เรียงแบบ `SouvenirCampaignsSummary.items` (เปิดรับ + มีผลวันนี้ก่อน แล้วชื่อ)
 */
export interface SouvenirCampaignUsageView {
  campaign: {
    id: string;
    code: string | null;
    name: string;
    /** `campaignIconUrl` · `null` = ไม่มีไอคอน */
    iconUrl: string | null;
    isActive: boolean;
    open: boolean;
    status: SouvenirCampaignStatus;
    startDate: string | null;
    endDate: string | null;
  };
  /** สถานะของของนี้ในแคมเปญ (`SUSPENDED` = แสดงพร้อมป้าย "ระงับ" · ยังกันสต็อก) */
  status: CampaignSouvenirStatus;
  stockMode: CampaignSouvenirStockMode;
  fund: { id: string; name: string; isActive: boolean };
  /** `null` = กองทุนไม่มีโปรแกรม หรือชั้นโปรแกรมปิด (`fundraising.programEnabled`) */
  program: { id: string; name: string; isActive: boolean } | null;
  /** ≥ 1 แถว */
  rules: SouvenirCampaignRuleRef[];
  /** โควตาจัดสรรของสินค้านี้ให้แคมเปญ — มีแถวจัดสรร หรือ `stockMode = RESERVED` · อื่น ๆ = `null` */
  quota: { allocated: number; used: number; remaining: number } | null;
}

// ── ของที่ระลึกในแคมเปญแบบ list เดียว (`SV-CR-019` §1 · `T-194` · SV-ADR-142 · FT-18 `REQ-FND-021`) ─────────────────────────
//
// 1 แถว = ของ 1 ชิ้นในแคมเปญ (`fundraising_souvenir_rules` ของแคมเปญ · UNIQUE (แคมเปญ, ของ) · ช่วงวัน = ช่วงแคมเปญ) — รวมเงื่อนไข (ยอด/ชิ้น · สถานะ) + สต็อก (ชนิด · จอง) ·
// สิทธิ์ `campaigns` (READ_ONLY ดู · MAINTAIN เขียน) · เปลี่ยนสต็อก (`stockMode` / `reservedQty` / ลบของที่ยังจองเหลือ) ต้องมี `souvenirs` MAINTAIN ด้วย (ตรวจที่ service → 403) ·
// audit ทุก write (`campaign_souvenir` / `campaign_souvenir_mode`) + ประวัติ append-only `campaign_souvenir_events` (+ ledger จองเดิม `campaign_stock_allocation_movements`)
//
// - `GET /campaigns/:id/souvenirs` → `CampaignSouvenirsView`
// - `POST /campaigns/:id/souvenirs` `CampaignSouvenirsAddInput` → `CampaignSouvenirsView` (เพิ่มเป็น ACTIVE + CENTRAL + เกณฑ์ตั้งต้นของของ · ที่มีแล้วข้าม)
// - `PATCH /campaigns/:id/souvenirs/:souvenirId` `CampaignSouvenirUpdateInput` → `CampaignSouvenirItemView`
// - `DELETE /campaigns/:id/souvenirs/:souvenirId` → `CampaignSouvenirsView` (คืนที่จองเหลือ · แถวจัดสรรที่ใช้แล้วคงไว้เป็นประวัติ)
// - `PATCH /campaigns/:id/souvenir-mode` `CampaignSouvenirModeInput` → `CampaignSouvenirsView`
// - `GET /campaigns/:id/souvenirs/history?souvenirId=&page=&perPage=` → `CampaignSouvenirHistoryEntry[]` + meta (เหตุการณ์ + ledger จอง เรียงเวลาใหม่ก่อน)

/** ชนิดเหตุการณ์ของ `campaign_souvenir_events` — `MODE` = สลับ "แจกของที่ระลึก" (ไม่มีของ · `souvenir = null`) */
export const CampaignSouvenirEventType = {
  ADDED: 'ADDED',
  UPDATED: 'UPDATED',
  REMOVED: 'REMOVED',
  MODE: 'MODE',
} as const;
export type CampaignSouvenirEventType = (typeof CampaignSouvenirEventType)[keyof typeof CampaignSouvenirEventType];

/** ช่องที่ลงใน `changes` ของเหตุการณ์ — จำนวนจองอยู่ใน ledger (`MOVEMENT`) ไม่ซ้ำในเหตุการณ์ */
export const CampaignSouvenirChangeField = {
  MIN_AMOUNT: 'minAmount',
  STATUS: 'status',
  STOCK_MODE: 'stockMode',
  MODE: 'mode',
} as const;
export type CampaignSouvenirChangeField = (typeof CampaignSouvenirChangeField)[keyof typeof CampaignSouvenirChangeField];

/** ชนิดแถวของประวัติรวม */
export const CampaignSouvenirHistoryKind = {
  EVENT: 'EVENT',
  MOVEMENT: 'MOVEMENT',
} as const;
export type CampaignSouvenirHistoryKind = (typeof CampaignSouvenirHistoryKind)[keyof typeof CampaignSouvenirHistoryKind];

/** ของที่ระลึกในแถว (ณ ปัจจุบัน) — `defaultMinAmount` = `souvenirs.donation_threshold` (ค่าตั้งต้นของ "ยอดบริจาค/ชิ้น") */
export interface CampaignSouvenirRef extends CampaignAllocationSouvenirRef {
  category: { id: string; name: string } | null;
  defaultMinAmount: string;
}

/** สต็อกสดของ (แคมเปญ, ของ) — ชิ้นทั้งหมด · นิยามเดียวกับ `CampaignAllocationView` */
export interface CampaignSouvenirStockView {
  /** คงเหลือจริง (`stock_on_hand`) */
  onHand: number;
  /** ส่วนกลางหลังหักจอง = onHand − Σ ที่จองเหลือของทุกแคมเปญ (ติดลบ = จองเกินคงเหลือจริง) */
  free: number;
  /** ยอดจองรวม (รวมที่ใช้แล้ว · `campaign_stock_allocations.qty_allocated`) · ไม่มีแถว = 0 */
  reserved: number;
  /** ตัดสต็อกแล้ว = `usedPending` + `usedShipped` */
  used: number;
  usedPending: number;
  usedShipped: number;
  /** ในออเดอร์ `DRAFT` ของแคมเปญ (รอออกของ · ไม่กินโควตา) */
  draft: number;
  /** คงเหลือที่จอง = max(0, reserved − used) */
  reservedRemaining: number;
  /** ส่วนของที่จองเหลือที่ยังไม่มีของจริงรองรับ = min(reservedRemaining, max(0, −free)) — ป้าย Pre-order */
  preorder: number;
  /** ที่แคมเปญยังใช้ได้หลังหัก `DRAFT` — RESERVED: max(0, reservedRemaining − draft) · CENTRAL: max(0, reservedRemaining + max(0, free) − draft) */
  available: number;
}

/** 1 แถวของ list (เรียง `sort_order, id` = ลำดับที่เพิ่ม) */
export interface CampaignSouvenirItemView {
  /** id ของแถว (`fundraising_souvenir_rules.id`) */
  id: string;
  souvenir: CampaignSouvenirRef;
  /** ยอดบริจาค/ชิ้น `"1000.00"` */
  minAmount: string;
  status: CampaignSouvenirStatus;
  stockMode: CampaignSouvenirStockMode;
  stock: CampaignSouvenirStockView;
  /** ISO — แก้แถวล่าสุด */
  updatedAt: string;
}

/** `GET /campaigns/:id/souvenirs` (และผลของ POST / DELETE / souvenir-mode) — แคมเปญไม่พบ/ถูกลบ = 404 */
export interface CampaignSouvenirsView {
  campaignId: string;
  /** "แจกของที่ระลึก" `CUSTOM` · ไม่แจก `NONE` (list เก็บไว้แม้ `NONE`) */
  mode: CampaignSouvenirRuleMode;
  items: CampaignSouvenirItemView[];
}

/** แถวต่อแคมเปญไม่เกิน `SOUVENIR_RULES_MAX` (เพิ่มเกิน → 422 `{ field: 'souvenirIds', reason: 'TOO_MANY', max }`) */
export interface CampaignSouvenirsAddInput {
  /** 1…`SOUVENIR_RULES_MAX` id ไม่ซ้ำ · ของต้อง `ACTIVE` ไม่ลบ (ไม่งั้น 422 `souvenirIds.N` `NOT_FOUND` / `SUSPENDED`) · ที่อยู่ในแคมเปญแล้ว = ข้าม (ไม่ error) */
  souvenirIds: string[];
}

/**
 * body ของ `PATCH /campaigns/:id/souvenirs/:souvenirId` — ส่งเฉพาะช่องที่แก้ · ของไม่อยู่ในแคมเปญ = 404 · ไม่มีอะไรเปลี่ยน = 200 ไม่เขียน (ไม่บันทึก audit)
 * transaction เดียว (ล็อก ของ X → แคมเปญ S → แถว X → แถวจัดสรร X แบบ `issueForOrder`): `stockMode = CENTRAL` → คืนที่จองเหลือ (ledger `RELEASE`) ·
 * `RESERVED` + `reservedQty` → ตั้งยอดจองรวม (ledger `ALLOCATE`/`INCREASE`/`DECREASE` · ส่วนที่เกิน free = `preorder_qty` · จองเกินคงเหลือได้เสมอ = pre-order) ·
 * `reservedQty` < used → 422 `CAMPAIGN_ALLOCATION_BELOW_USED { souvenirId, allocated, used, requested }` ·
 * ส่ง `reservedQty` แต่ผลเป็น `CENTRAL` → 422 `{ field: 'reservedQty', reason: 'NOT_RESERVED' }` · เปลี่ยน `stockMode`/`reservedQty` ไม่มีสิทธิ์ souvenirs MAINTAIN → 403
 */
export interface CampaignSouvenirUpdateInput {
  /** กติกาเดียวกับเกณฑ์ของของ (0 – `SOUVENIR_VALUE_MAX` · ทศนิยม ≤ 2) */
  minAmount?: string | number;
  status?: CampaignSouvenirStatus;
  stockMode?: CampaignSouvenirStockMode;
  /** ยอดจองรวม (รวมที่ใช้แล้ว) จำนวนเต็ม 0…`CAMPAIGN_ALLOCATION_QTY_MAX` */
  reservedQty?: number;
  /** หมายเหตุของ ledger ≤ `CAMPAIGN_ALLOCATION_NOTE_MAX_LENGTH` */
  note?: string | null;
}

/** body ของ `PATCH /campaigns/:id/souvenir-mode` — ไม่เปลี่ยน = ไม่เขียน · เหตุการณ์ `MODE` */
export interface CampaignSouvenirModeInput {
  mode: CampaignSouvenirRuleMode;
}

/** query ของ `GET /campaigns/:id/souvenirs/history` */
export interface CampaignSouvenirHistoryQuery {
  souvenirId?: string;
  page?: number;
  perPage?: number;
}

/** 1 ช่องที่เปลี่ยน — ADDED: `from = null` · REMOVED: `to = null` */
export interface CampaignSouvenirChange {
  field: CampaignSouvenirChangeField;
  from: string | null;
  to: string | null;
}

/** แถวเหตุการณ์ (เพิ่ม/แก้/ลบ/สลับโหมด) */
export interface CampaignSouvenirEventEntry {
  kind: typeof CampaignSouvenirHistoryKind.EVENT;
  /** `e<id>` */
  id: string;
  type: CampaignSouvenirEventType;
  /** `MODE` = `null` */
  souvenir: CampaignAllocationSouvenirRef | null;
  changes: CampaignSouvenirChange[];
  actor: DonationActorView | null;
  createdAt: string;
}

/** แถว ledger จอง (`campaign_stock_allocation_movements`) */
export interface CampaignSouvenirMovementEntry extends Omit<CampaignAllocationMovementView, 'id'> {
  kind: typeof CampaignSouvenirHistoryKind.MOVEMENT;
  /** `m<id>` */
  id: string;
}

/** ประวัติรวม — ใหม่สุดก่อน (`createdAt DESC` · เวลาเท่ากัน = เหตุการณ์ก่อน ledger) */
export type CampaignSouvenirHistoryEntry = CampaignSouvenirEventEntry | CampaignSouvenirMovementEntry;
