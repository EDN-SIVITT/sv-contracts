/**
 * หน่วยนับของที่ระลึก — master data ใต้เมนู "ตั้งค่า → ของที่ระลึก" (`SV-CR-022` #2 · SV-ADR-154 · `T-209` API · `T-210` เว็บ · FT-15 REQ-SVN-020)
 * schema: `sv-api/migrations/0056_souvenir_units.sql` · ชื่อยาวสุด = `SOUVENIR_UNIT_MAX_LENGTH` (เท่าคอลัมน์ `souvenirs.unit`)
 *
 * - **"ชิ้น" ไม่เป็นแถว:** `souvenirs.unit = NULL` = ชิ้น (หน้าเว็บแสดงจาก i18n `souvenirs.defaultUnit` th "ชิ้น" / en "pcs") ·
 *   ตั้งชื่อหน่วยตรง `SOUVENIR_UNIT_RESERVED_NAMES` (ไม่สนตัวพิมพ์/ช่องว่างหัวท้าย) → 409 `SOUVENIR_UNIT_RESERVED`
 * - `souvenirs.unit` ยังเก็บ**ชื่อ** · เปลี่ยนชื่อหน่วย = ของที่ระลึก (ไม่ลบ) ที่ใช้ชื่อเดิมเปลี่ยนตามใน transaction เดียว (ออเดอร์คง snapshot)
 * - `GET /souvenir-units` (settings READ_ONLY) — ทุกแถวที่ยังไม่ลบ รวมที่ปิดใช้งาน · เรียง `sortOrder, name` · `souvenirCount`
 * - `GET /souvenir-units/options` — **ทุกคนที่ login** · เฉพาะที่เปิดใช้งาน = ตัวเลือก dropdown ช่อง "หน่วยนับ" ของฟอร์มของที่ระลึก (ไม่รวม "ชิ้น")
 * - `POST` / `PATCH /:id` (MAINTAIN · ชื่อซ้ำ 409 `SOUVENIR_UNIT_NAME_TAKEN`) · `DELETE /:id` (FULL · soft · มีของที่ระลึกใช้อยู่ → 409 `SOUVENIR_UNIT_IN_USE { count }` — ให้ "ปิดใช้งาน" แทน)
 * - ของที่ระลึก `POST`/`PATCH` ช่อง `unit`: ว่าง/ชื่อสงวน = `NULL` (ชิ้น) · อื่นต้องเป็นชื่อหน่วยที่เปิดใช้งาน หรือเท่าค่าเดิมของชิ้นนั้น →
 *   ไม่งั้น 422 `VALIDATION_FAILED { field: 'unit', reason: 'NOT_FOUND' }` (PATCH ไม่ส่ง `unit` = ไม่ตรวจ)
 */

/** ชื่อที่ใช้ตั้งหน่วยไม่ได้ — ตรงกับค่าเริ่มต้นในตัว (`souvenirs.unit = NULL`) ทั้ง 2 ภาษา · เทียบด้วย `isReservedSouvenirUnitName` */
export const SOUVENIR_UNIT_RESERVED_NAMES = ['ชิ้น', 'pcs'] as const;

/** `true` = ชื่อนี้คือค่าเริ่มต้น "ชิ้น" (trim · ไม่สนตัวพิมพ์) — API ตอบ 409 ตอนตั้งชื่อหน่วย และเก็บ `NULL` ตอนบันทึกของที่ระลึก */
export function isReservedSouvenirUnitName(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return (SOUVENIR_UNIT_RESERVED_NAMES as readonly string[]).includes(normalized);
}

/** แถวในการ์ด "หน่วยนับ" ของ `/settings/souvenir` */
export interface SouvenirUnitView {
  id: string;
  name: string;
  /** ปิด = ไม่ขึ้นในตัวเลือกของฟอร์มของที่ระลึก แต่ของที่ระลึกเดิมยังคงค่าเดิม (บันทึกช่องอื่นต่อได้) */
  isActive: boolean;
  sortOrder: number;
  /** จำนวนของที่ระลึก (ที่ยังไม่ลบ) ที่ใช้ชื่อหน่วยนี้ — ลบได้เมื่อ 0 */
  souvenirCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 1 ตัวเลือกของ `GET /souvenir-units/options` (เปิดใช้งานเท่านั้น · เรียง `sortOrder, name`) — ของที่ระลึกส่ง `name` เป็นค่า `unit` */
export interface SouvenirUnitOption {
  id: string;
  name: string;
}

/** body ของ `POST /souvenir-units` — `PATCH /souvenir-units/:id` = `Partial` (ส่งเฉพาะช่องที่แก้) */
export interface SouvenirUnitInput {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}
