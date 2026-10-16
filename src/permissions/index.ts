/**
 * RBAC — DOM-03
 * SV-BASE เหลือ 6 เมนู (SVB-KEEP-07) · เพิ่มเมนูใหม่ในระบบลูก → เพิ่ม key ที่นี่ + `nav.<key>` ใน locale (สูตรใน T-053)
 * ระบบลูก e-Donation เพิ่ม `donors` (ผู้บริจาค · `SV-CR-003` · SV-ADR-043) · `souvenirs` + `orders` (`SV-CR-004` · SV-ADR-050 · `T-077`)
 * · `donations` (รายการบริจาค · `SV-CR-005` · SV-ADR-053 · `T-084`)
 * — ลำดับที่นี่ = ลำดับแถวในเมทริกซ์สิทธิ์ (ตรงกับ sidebar: ผู้บริจาค → รายการบริจาค → ออเดอร์ → ของที่ระลึก · `SV-CR-005` ข้อ 0)
 * กลุ่ม root admin ได้สิทธิ์เต็มอัตโนมัติผ่าน flag `isSuperAdmin` ไม่ใช่ permission rows (REQ-GRP-011)
 */
export const PermissionSubject = {
  DASHBOARD: 'dashboard',
  /** ผู้บริจาค (e-Donation) — READ_ONLY ดู · MAINTAIN เพิ่ม/แก้/ยกเลิกผูก LINE · FULL ลบ (`REQ-DNR-*`) */
  DONORS: 'donors',
  /** รายการบริจาค (e-Donation) — READ_ONLY ดู list/view/สลิป · MAINTAIN สร้าง/แก้/ยืนยัน/ปฏิเสธ/อัปโหลด-ลบสลิป · FULL ลบ (soft · ทุกสถานะ) (`REQ-DNT-*` · `SV-CR-005` ข้อ 3.1) */
  DONATIONS: 'donations',
  /** ออเดอร์จัดส่งของที่ระลึก (e-Donation) — READ_ONLY ดู/พิมพ์ใบแปะหน้า · MAINTAIN สร้าง/แก้/ยืนยัน/จัดส่ง/ยกเลิก/บันทึกว่าพิมพ์แล้ว · FULL ลบ (ร่างเท่านั้น) (`REQ-ORD-*`) */
  ORDERS: 'orders',
  /** ของที่ระลึก (e-Donation) — READ_ONLY ดู · MAINTAIN เพิ่ม/แก้/รูป/สต็อก (lot)/หมวดหมู่ · FULL ลบ สินค้า · หมวดหมู่ · lot (`REQ-SVN-*` · `SV-CR-004` ข้อ 0) */
  SOUVENIRS: 'souvenirs',
  CHAT: 'chat',
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
