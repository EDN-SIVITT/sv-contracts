import { isYmd, ymdAddDays, ymdDiffDays } from './dashboard';

/**
 * วันที่ตามเวลาไทย (Asia/Bangkok = UTC+7 คงที่ · ไทยไม่มี DST) — ใช้ร่วม API + เว็บ (`SV-CR-017` §4 · SV-ADR-131 · `T-182`)
 * ⚠️ DB เก็บเวลาเป็น UTC → "วันนี้" ต้องคิดที่แอปด้วยฟังก์ชันนี้ ห้ามใช้ `CURDATE()` ตรง ๆ (ได้วันของ UTC — 00:00–06:59 น. ไทยจะยังเป็นเมื่อวาน)
 * คิดจากตัวเลขปฏิทินล้วน (`ymdDiffDays` ของ dashboard) — ไม่พึ่ง TZ ของเครื่อง/browser
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** วันนี้ตามเวลาไทย `YYYY-MM-DD` — `2026-11-04T23:30:00Z` → `'2026-11-05'` */
export function thaiTodayYmd(now: Date = new Date()): string {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** จำนวนวันจาก `ymd` ถึง `todayYmd` (วันเดียวกัน = 0 · เมื่อวาน = 1 · วันในอนาคต = ติดลบ) · ค่าที่ไม่ใช่วันที่จริง = `NaN` */
export function daysSince(ymd: string, todayYmd: string): number {
  if (!isYmd(ymd) || !isYmd(todayYmd)) return Number.NaN;
  return ymdDiffDays(ymd, todayYmd);
}

/**
 * "ห่างจากวันนี้ min–max วัน" → ช่วงวันที่ (รวมปลาย) ที่ใช้เทียบคอลัมน์ DATE ตรง ๆ (ใช้ index ได้ · ไม่คำนวณต่อแถว)
 * ห่าง ≥ `min` วัน ⇔ วันที่ ≤ today − min (`to`) · ห่าง ≤ `max` วัน ⇔ วันที่ ≥ today − max (`from`) · ไม่ส่งฝั่งไหน = `null` (ไม่จำกัด)
 */
export function daysAgoRange(todayYmd: string, min?: number | null, max?: number | null): { from: string | null; to: string | null } {
  return {
    from: max === null || max === undefined ? null : ymdAddDays(todayYmd, -max),
    to: min === null || min === undefined ? null : ymdAddDays(todayYmd, -min),
  };
}
