/**
 * ความต่างของสี (contrast) ตาม WCAG 2.x — ของกลางสำหรับ "สีที่ผู้ใช้ตั้งเอง" (`SV-CR-017` §1 · SV-ADR-127 · สีห้องแชท)
 * ใช้ได้ทั้ง API และเว็บ (ฟังก์ชันล้วน · ไม่มี DOM) — ข้อความที่วางบนพื้นสีที่ผู้ใช้เลือก ให้เลือกสีตัวอักษรด้วย `readableTextOn` เสมอ (TEC-08 §8.6 ข้อ 5)
 * รับเฉพาะ `#RRGGBB` (ตัวพิมพ์เล็ก/ใหญ่ได้) — รูปแบบเดียวกับ `HEX_COLOR_RULE` ของค่าตั้งค่า
 */

/** เกณฑ์ AA ของข้อความขนาดปกติ */
export const MIN_TEXT_CONTRAST = 4.5;

const HEX_COLOR = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;

/** `#RRGGBB` → `[r, g, b]` (0–255) · รูปแบบอื่น = `null` */
export function parseHexColor(value: string): [number, number, number] | null {
  const match = HEX_COLOR.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** relative luminance (0 = ดำ · 1 = ขาว) · สีผิดรูปแบบ = `null` */
export function relativeLuminance(color: string): number | null {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** contrast ratio ของ 2 สี (1–21 · ลำดับไม่สำคัญ) · สีใดผิดรูปแบบ = 1 (ถือว่าอ่านไม่ได้) */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * สีตัวอักษรที่อ่านได้บนพื้น `background` — ตัวแรกใน `candidates` ที่ contrast ≥ `min` (เรียงตามที่อยากได้ เช่นเทาเข้ม → เทาอ่อน)
 * ไม่มีตัวไหนผ่าน = ดำ `#000000` หรือขาว `#FFFFFF` ตัวที่ต่างกว่า (พื้นสีใดก็ได้ ≥ 4.58:1 เสมอ) · พื้นผิดรูปแบบ = ตัวแรกของ `candidates` (หรือดำ)
 */
export function readableTextOn(background: string, candidates: readonly string[] = [], min = MIN_TEXT_CONTRAST): string {
  if (relativeLuminance(background) === null) return candidates[0] ?? '#000000';
  for (const candidate of candidates) {
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return contrastRatio('#000000', background) >= contrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF';
}
