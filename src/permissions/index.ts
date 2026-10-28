/**
 * RBAC — DOM-03
 * SV-BASE เหลือ 6 เมนู (SVB-KEEP-07) · เพิ่มเมนูใหม่ในระบบลูก → เพิ่ม key ที่นี่ + `nav.<key>` ใน locale (สูตรใน T-053)
 * ระบบลูก e-Donation เพิ่ม `donors` (ผู้บริจาค · `SV-CR-003` · SV-ADR-043) · `souvenirs` + `orders` (`SV-CR-004` · SV-ADR-050 · `T-077`)
 * · `donations` (รายการบริจาค · `SV-CR-005` · SV-ADR-053 · `T-084`) · `programs` + `funds` + `campaigns` (โครงสร้างการรับบริจาค · `SV-CR-006` · SV-ADR-086/087 · `T-125`) · `contact_channels` (`SV-CR-009` · SV-ADR-094 · `T-136`) · `reports` (`SV-CR-009` · SV-ADR-095 · `T-138`)
 * — ลำดับที่นี่ = ลำดับแถวในเมทริกซ์สิทธิ์ (ตรงกับ sidebar: Dashboard → Chat → ผู้บริจาค → รายการบริจาค → ออเดอร์ → [โปรแกรม → กองทุน → แคมเปญ] → ของที่ระลึก → … · SV-ADR-089 → SV-ADR-093 · `T-135`)
 * กลุ่ม root admin ได้สิทธิ์เต็มอัตโนมัติผ่าน flag `isSuperAdmin` ไม่ใช่ permission rows (REQ-GRP-011)
 */
export const PermissionSubject = {
  DASHBOARD: 'dashboard',
  CHAT: 'chat',
  /** ผู้บริจาค (e-Donation) — READ_ONLY ดู · MAINTAIN เพิ่ม/แก้/ยกเลิกผูก LINE · FULL ลบ (`REQ-DNR-*`) */
  DONORS: 'donors',
  /** รายการบริจาค (e-Donation) — READ_ONLY ดู list/view/สลิป · MAINTAIN สร้าง/แก้/ยืนยัน/ปฏิเสธ/อัปโหลด-ลบสลิป · FULL ลบ (soft · ทุกสถานะ) (`REQ-DNT-*` · `SV-CR-005` ข้อ 3.1) */
  DONATIONS: 'donations',
  /** ออเดอร์จัดส่งของที่ระลึก (e-Donation) — READ_ONLY ดู/พิมพ์ใบแปะหน้า · MAINTAIN สร้าง/แก้/ยืนยัน/จัดส่ง/ยกเลิก/บันทึกว่าพิมพ์แล้ว · FULL ลบ (ร่างเท่านั้น) (`REQ-ORD-*`) */
  ORDERS: 'orders',
  /** โปรแกรม (e-Donation · ภารกิจ 1→N กองทุน) — READ_ONLY ดู/ประวัติ · MAINTAIN เพิ่ม/แก้/เปิด-ปิดใช้งาน · FULL ลบ (soft · ไม่มีกองทุนอ้าง) (`REQ-FND-*` · SV-ADR-087) */
  PROGRAMS: 'programs',
  /** กองทุน (e-Donation · ตัวรับเงิน 1→N แคมเปญ) — READ_ONLY ดู/ประวัติ · MAINTAIN เพิ่ม/แก้/เปิด-ปิดใช้งาน · FULL ลบ (soft · ไม่มีแคมเปญ/รายการบริจาคอ้าง) (`REQ-FND-*`) */
  FUNDS: 'funds',
  /** แคมเปญ (e-Donation · รอบ/กิจกรรมของกองทุน) — READ_ONLY ดู/ประวัติ · MAINTAIN เพิ่ม/แก้/เปิด-ปิดใช้งาน · FULL ลบ (soft · ไม่มีรายการบริจาคอ้าง) (`REQ-FND-*`) */
  CAMPAIGNS: 'campaigns',
  /** ของที่ระลึก (e-Donation) — READ_ONLY ดู · MAINTAIN เพิ่ม/แก้/รูป/สต็อก (lot)/หมวดหมู่ · FULL ลบ สินค้า · หมวดหมู่ · lot (`REQ-SVN-*` · `SV-CR-004` ข้อ 0) */
  SOUVENIRS: 'souvenirs',
  /** รายงาน (e-Donation · `SV-CR-009` ข้อ 2 · SV-ADR-095) — READ_ONLY ดู + ส่งออก Excel/PDF · ไม่มีการเขียน (MAINTAIN/FULL = เท่า READ_ONLY) · ทุกรายงานต้องมี READ_ONLY ของเมนูต้นทางด้วย (`REPORT_SOURCE_SUBJECTS`) */
  REPORTS: 'reports',
  /** ช่องทางติดต่อ (e-Donation · กลุ่มเมนู "จัดการเนื้อหา") — READ_ONLY ดู · MAINTAIN เพิ่ม/แก้/จัดลำดับ/ไอคอน/แสดง-ซ่อน · FULL ลบ (soft) (`REQ-CNT-*` · `SV-CR-009` ข้อ 3 · SV-ADR-094) */
  CONTACT_CHANNELS: 'contact_channels',
  SYSTEM_USERS: 'system_users',
  USER_GROUPS: 'user_groups',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
} as const;
export type PermissionSubject = (typeof PermissionSubject)[keyof typeof PermissionSubject];

export const PERMISSION_SUBJECTS = Object.values(PermissionSubject) as readonly PermissionSubject[];

/**
 * ระดับสิทธิ์ต่อเมนู — DOM-03 §3.1 · REQ-GRP-010 [MUST]
 *
 * `FULL` เพิ่มเข้ามาตามคำตอบ `Q-045` (2026-09-04): เจ้าของงานต้องการให้ "ลบเรคคอร์ด"
 * เป็นสิทธิ์ที่กำหนดแยกจาก "แก้ไข" ได้ — คนที่มีแค่ `MAINTAIN` จึงแก้ไข/ยกเลิกได้แต่ลบไม่ได้
 * ⚠️ คอลัมน์ `group_permissions.level` เป็น VARCHAR(20) จึง**ไม่ต้อง migration**
 *    และแถวเดิมที่เป็น `MAINTAIN` ยังคงเป็น `MAINTAIN` (= เสียสิทธิ์ลบ ต้องไปตั้งใหม่เอง)
 */
export const PermissionLevel = {
  NONE: 'NONE',
  READ_ONLY: 'READ_ONLY',
  MAINTAIN: 'MAINTAIN',
  FULL: 'FULL',
} as const;
export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

const LEVEL_RANK: Record<PermissionLevel, number> = {
  NONE: 0,
  READ_ONLY: 1,
  MAINTAIN: 2,
  FULL: 3,
};

/** เทียบว่าสิทธิ์ที่มีถึงระดับที่ต้องการหรือยัง — ใช้ทั้ง API guard และการซ่อนปุ่มฝั่ง UI */
export function satisfiesLevel(held: PermissionLevel, required: PermissionLevel): boolean {
  return LEVEL_RANK[held] >= LEVEL_RANK[required];
}

export type PermissionMap = Partial<Record<PermissionSubject, PermissionLevel>>;
