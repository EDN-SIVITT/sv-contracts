import { APP_BRAND } from '../brand';

/**
 * ชื่อ / ชื่อย่อ / ไอคอนระบบ — `REQ-SET-028/029/030` · SV-ADR-036 (`SV-CR-001` ข้อ 2)
 * ค่าจริงอยู่ในเมนูตั้งค่า (`general.*`) · `APP_BRAND` เป็นค่าสำรองเมื่อยังไม่ได้ตั้ง/อ่านไม่ได้
 */

/** ขนาด PNG จัตุรัสที่ API ย่อเก็บไว้ (px) — 180 = apple-touch-icon (ปูพื้นขาว) */
export const SYSTEM_ICON_SIZES = [32, 64, 180, 192, 512] as const;
export type SystemIconSize = (typeof SYSTEM_ICON_SIZES)[number];

export function isSystemIconSize(value: number): value is SystemIconSize {
  return (SYSTEM_ICON_SIZES as readonly number[]).includes(value);
}

/** ชนิดไฟล์ที่รับ — API ตรวจจากเนื้อไฟล์ ไม่เชื่อ MIME ที่ผู้อัปโหลดประกาศ */
export const SYSTEM_ICON_ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** ขนาดภาพที่รับต่อด้าน (px) — ด้านสั้นต่ำกว่านี้ย่อแล้วแตก · ด้านยาวเกินนี้กินหน่วยความจำโดยไม่จำเป็น */
export const SYSTEM_ICON_MIN_PX = 128;
export const SYSTEM_ICON_MAX_PX = 4096;
/** ขนาดที่แนะนำบนหน้าจอ (ภาพจัตุรัสอย่างน้อยเท่านี้คมทุกจุด) */
export const SYSTEM_ICON_RECOMMENDED_PX = 512;

/** วิธีทำภาพที่ไม่จัตุรัสให้เป็นจัตุรัส — contain = ย่อให้พอดีเติมพื้นโปร่งใส · cover = ครอบตัดกลางภาพ */
export const SystemIconFit = {
  CONTAIN: 'contain',
  COVER: 'cover',
} as const;
export type SystemIconFit = (typeof SystemIconFit)[keyof typeof SystemIconFit];

/** สรุปไอคอนที่ส่งออกทาง HTTP — ไม่มี storage key / driver (รายละเอียดภายใน) */
export interface SystemIconSummary {
  /** เปลี่ยนทุกครั้งที่อัปโหลดใหม่ — ใช้เป็น `?v=` ของ URL รูป (cache แบบ immutable ได้) */
  version: string;
  sizes: readonly number[];
  /** ขนาดภาพต้นฉบับหลังหมุนตาม EXIF */
  width: number;
  height: number;
  fit: SystemIconFit;
  uploadedAt: string;
}

/** `GET /branding` (public) — หน้า login ต้องใช้ก่อน login */
export interface BrandingView {
  name: { th: string; en: string };
  shortName: string;
  icon: Pick<SystemIconSummary, 'version' | 'sizes'> | null;
}

/** ชื่อระบบตามภาษา — ภาษาที่ขอว่าง → อีกภาษา → `APP_BRAND.name` */
export function brandingName(branding: Pick<BrandingView, 'name'>, locale: string): string {
  const primary = locale === 'en' ? branding.name.en : branding.name.th;
  const secondary = locale === 'en' ? branding.name.th : branding.name.en;
  return primary.trim() || secondary.trim() || APP_BRAND.name;
}
