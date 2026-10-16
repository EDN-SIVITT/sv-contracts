/**
 * เลขเอกสารแบบ `prefix + เลขลำดับเติม 0 ซ้ายให้ครบ N หลัก` — ใช้ร่วมกันทุกชนิดเลข
 * (รหัสผู้บริจาค `T-072` · รหัสของที่ระลึก · เลขที่ออเดอร์ `SV-CR-004` ข้อ 3 · `T-077`)
 * prefix / N มาจากเมนูตั้งค่า (`<group>.codePrefix` · `<group>.codeDigits` ฯลฯ) · เลขลำดับจาก `running_numbers` (`RunningNumbersService.next`)
 * ย้ายมาจาก `formatDonorCode` — alias เดิม (`formatDonorCode` · `formatSouvenirCode` · `formatOrderNo`) เรียกตัวนี้ทั้งหมด
 */

/** `formatSequenceCode('DNR', 6, 12)` → `DNR000012` · เลขยาวกว่า N หลักไม่ถูกตัด (`DNR1234567`) · digits ≤ 0 = ไม่เติม 0 */
export function formatSequenceCode(prefix: string, digits: number, n: number): string {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`เลขลำดับไม่ถูกต้อง: ${n}`);
  return `${prefix}${String(n).padStart(Math.max(0, Math.trunc(digits)), '0')}`;
}
