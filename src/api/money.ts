/**
 * จำนวนเงิน DECIMAL(12,2) ที่ API รับ/ส่งเป็นข้อความ (`"1234.50"`) — คิดเป็น **สตางค์ (integer)** เสมอ กันทศนิยม float เพี้ยน
 * ใช้ร่วม API (ตรวจ DTO · คำนวณงบ) และหน้าเว็บ (ฟอร์ม · แถบงบ) — `SV-CR-005` ข้อ 2 (มูลค่าของที่ระลึก) · ข้อ 3 (ยอดบริจาค) · `T-084`
 * 99,999,999.99 บาท = 9,999,999,999 สตางค์ < `Number.MAX_SAFE_INTEGER` — ใช้ `number` ได้ไม่ต้อง BigInt
 * (หน้าเว็บจัดรูปแบบ `1,234.50` ตามภาษาด้วย `formatCents` ของ `sv-web/src/lib/souvenir-format.ts`)
 */

/** ไม่ติดลบ · จำนวนเต็มอย่างน้อย 1 หลัก · ทศนิยม 0–2 ตำแหน่ง · ไม่มีจุลภาค/เครื่องหมาย/ช่องว่างกลางค่า */
const MONEY_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * `"1234.5"` → `123450` · `120` → `12000` · `" 0.00 "` → `0`
 * รูปแบบผิด (ติดลบ · ทศนิยม > 2 ตำแหน่ง · `"1,000"` · `"1e3"` · `""` · `NaN` · เกิน safe integer) → `null` — ผู้เรียกตอบ 422 / ข้อความในฟอร์มเอง
 * ไม่ตรวจเพดาน — เทียบกับ `parseMoneyToSatang(DONATION_AMOUNT_MAX)` / `SOUVENIR_VALUE_MAX` ที่จุดใช้งาน
 */
export function parseMoneyToSatang(value: string | number): number | null {
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const match = MONEY_PATTERN.exec(String(value).trim());
  if (!match) return null;
  const [, whole, fraction = ''] = match;
  const satang = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(satang) ? satang : null;
}

/** `123450` → `"1234.50"` · `-150` → `"-1.50"` (คงเหลือติดลบ = เกินงบ) — รูปแบบเดียวกับที่ API ส่ง (ไม่มีจุลภาค) · ไม่ใช่ integer → RangeError */
export function formatSatang(satang: number): string {
  if (!Number.isSafeInteger(satang)) throw new RangeError(`จำนวนสตางค์ไม่ถูกต้อง: ${satang}`);
  const abs = Math.abs(satang);
  return `${satang < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
