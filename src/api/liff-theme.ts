import { LIFF_LOCALES, type LiffLocale } from './liff';

/**
 * ธีมหน้า LINE OA ผู้บริจาค (`SV-CR-017` §6 · SV-ADR-132 · `T-184`) — ตั้งค่า → หมวด `liff` "LINE OA ผู้บริจาค"
 * - รูป 2 ช่อง (ปกโปรไฟล์ · พื้นหลังหน้าบัญชีของฉัน) = managed image แบบไอคอนระบบ (SV-ADR-036): descriptor ใน settings · ไฟล์ผ่าน `StorageService` ·
 *   แก้ได้ทาง `POST/DELETE /settings/liff/images/:slot` เท่านั้น · อ่านสาธารณะ `GET /branding/liff/:slot?v=` (เว็บ proxy `/liff-theme/<slot>.webp?v=`)
 * - ภาษา: ปุ่มเปลี่ยนภาษาบนหัวหน้า LIFF (เปิด/ปิด) + ภาษาหลัก (ปิดปุ่ม = ใช้เสมอ · เปิดปุ่ม = ภาษาเริ่มต้นก่อนผู้บริจาคเลือกเอง) — มีผลกับหน้า `/liff/` เท่านั้น (CMS ไม่กระทบ · Q-128)
 * ⚠️ ไฟล์นี้ห้าม import `./settings` (settings import `LIFF_LOCALES` จาก `./liff` ตอนโหลดโมดูล — กัน import วน) → key เขียนเป็นตัวอักษรตรงกับ `SettingKey.LIFF_*`
 */

/** ช่องรูป (ค่าใน URL) — เพิ่มช่อง = เพิ่มที่นี่ + key ใน `LIFF_THEME_SLOT_SETTING_KEY` + migration แถว settings */
export const LiffThemeSlot = {
  /** ปก section แรกของ "บัญชีของฉัน" (แถบรูปบนการ์ดรูปโปรไฟล์ + ชื่อ) */
  PROFILE_COVER: 'profile-cover',
  /** พื้นหลังทั้งจอของ "บัญชีของฉัน" (เฉพาะหน้านี้ — Q-123) */
  PAGE_BACKGROUND: 'page-background',
} as const;
export type LiffThemeSlot = (typeof LiffThemeSlot)[keyof typeof LiffThemeSlot];
export const LIFF_THEME_SLOTS: readonly LiffThemeSlot[] = Object.values(LiffThemeSlot);

export function isLiffThemeSlot(value: unknown): value is LiffThemeSlot {
  return typeof value === 'string' && (LIFF_THEME_SLOTS as readonly string[]).includes(value);
}

/** ช่อง → key ของ descriptor (JSON · อยู่ใน `MANAGED_SETTING_KEYS`) — ต้องตรงกับ `SettingKey.LIFF_PROFILE_COVER_IMAGE` / `LIFF_PAGE_BACKGROUND_IMAGE` */
export const LIFF_THEME_SLOT_SETTING_KEY = {
  [LiffThemeSlot.PROFILE_COVER]: 'liff.profileCoverImage',
  [LiffThemeSlot.PAGE_BACKGROUND]: 'liff.pageBackgroundImage',
} as const satisfies Record<LiffThemeSlot, string>;

/** ชนิดไฟล์ที่รับ — API ตรวจจากเนื้อไฟล์ (magic bytes) ไม่เชื่อ MIME ที่ประกาศ · ผลลัพธ์เก็บเป็น WebP เสมอ (ตัด EXIF/metadata) */
export const LIFF_THEME_ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LIFF_THEME_OUTPUT_MIME = 'image/webp';

/**
 * ขนาดต่อช่อง (px) — `max*` = API ย่อลงให้ไม่เกินนี้ (ไม่ขยายรูปเล็ก) · `recommended*` = คำแนะนำบนหน้าตั้งค่า ·
 * `minShortSide` = ด้านสั้นต่ำกว่านี้ปฏิเสธ (ย่อ/ขยายบนจอแล้วแตกจนใช้ไม่ได้) · `maxInputSide` = ด้านยาวของต้นฉบับสูงสุด (กันภาพระเบิด/กินหน่วยความจำ)
 */
export interface LiffThemeImageSpec {
  maxWidth: number;
  maxHeight: number;
  recommendedWidth: number;
  recommendedHeight: number;
}
export const LIFF_THEME_IMAGE_SPECS: Readonly<Record<LiffThemeSlot, LiffThemeImageSpec>> = {
  // แถบปกบนจอมือถือสูง ~136 px กว้างเต็มการ์ด (~343 px) ≈ 2.5:1 → แนะนำ 1200×480 · ย่อเก็บกว้างไม่เกิน 1600 (คมบนจอ 3x)
  [LiffThemeSlot.PROFILE_COVER]: { maxWidth: 1600, maxHeight: 1600, recommendedWidth: 1200, recommendedHeight: 480 },
  // ทั้งจอมือถือแนวตั้ง 9:16 → แนะนำ 1080×1920 · เก็บไม่เกิน 1440×2560
  [LiffThemeSlot.PAGE_BACKGROUND]: { maxWidth: 1440, maxHeight: 2560, recommendedWidth: 1080, recommendedHeight: 1920 },
};
export const LIFF_THEME_MIN_SHORT_SIDE_PX = 200;
export const LIFF_THEME_MAX_INPUT_SIDE_PX = 8000;

/** สรุปรูปที่ส่งออกทาง HTTP (`GET /settings/liff` · ผลอัปโหลด) — ไม่มี storage key / driver (รายละเอียดภายใน) */
export interface LiffThemeImageSummary {
  slot: LiffThemeSlot;
  /** เปลี่ยนทุกครั้งที่อัปโหลดใหม่ — ใช้เป็น `?v=` ของ URL รูป (cache แบบ immutable ได้) */
  version: string;
  /** ขนาดที่เก็บจริงหลังย่อ (px) */
  width: number;
  height: number;
  bytes: number;
  uploadedAt: string;
}

/** ค่าเริ่มต้น (ไม่มีแถว · ค่าเสีย) — ต้องตรงกับ `0046` */
export const LIFF_LANGUAGE_SWITCHER_DEFAULT_ENABLED = true;
export const LIFF_DEFAULT_LOCALE: LiffLocale = 'th';
/** แถบเมนูล่างของหน้า LINE OA — ค่าเริ่มต้น **ปิด** (ไม่มีแถว · ค่าเสีย) · ต้องตรงกับ `0057` (`SV-CR-023` §1 · SV-ADR-155) */
export const LIFF_BOTTOM_NAV_DEFAULT_ENABLED = false;

/** `BrandingView.liff` (`GET /branding` · public · ไม่มีข้อมูลลับ) — ไม่มีแถว/ค่าเสีย = ค่าเริ่มต้น (หน้าตาเดิม) */
export interface BrandingLiffView {
  languageSwitcherEnabled: boolean;
  defaultLocale: LiffLocale;
  /** แสดงแถบเมนูล่าง 4 ปุ่ม (`liff.bottomNavEnabled` · ค่าเริ่มต้นปิด) */
  bottomNavEnabled: boolean;
  profileCover: { version: string } | null;
  pageBackground: { version: string } | null;
}

export const BRANDING_LIFF_DEFAULTS: BrandingLiffView = {
  languageSwitcherEnabled: LIFF_LANGUAGE_SWITCHER_DEFAULT_ENABLED,
  defaultLocale: LIFF_DEFAULT_LOCALE,
  bottomNavEnabled: LIFF_BOTTOM_NAV_DEFAULT_ENABLED,
  profileCover: null,
  pageBackground: null,
};

export function isLiffLocale(value: unknown): value is LiffLocale {
  return typeof value === 'string' && (LIFF_LOCALES as readonly string[]).includes(value);
}

/** `liff.defaultLocale` — ค่านอกชุด/ไม่มีแถว = `th` */
export function readLiffDefaultLocale(raw: unknown): LiffLocale {
  return isLiffLocale(raw) ? raw : LIFF_DEFAULT_LOCALE;
}

/** `liff.languageSwitcherEnabled` — ไม่ใช่ boolean (ไม่มีแถว · ค่าเสีย) = เปิด (เหมือนก่อนมีค่านี้) */
export function readLiffLanguageSwitcherEnabled(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : LIFF_LANGUAGE_SWITCHER_DEFAULT_ENABLED;
}

/** `liff.bottomNavEnabled` — ไม่ใช่ boolean (ไม่มีแถว · ค่าเสีย) = ปิด (ค่าเริ่มต้นของ `SV-CR-023`) */
export function readLiffBottomNavEnabled(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : LIFF_BOTTOM_NAV_DEFAULT_ENABLED;
}

/** อ่าน `BrandingView.liff` แบบระวัง (API รุ่นเก่าไม่ส่ง · ค่าเสีย) — เว็บใช้ตัวนี้ตัวเดียว */
export function readBrandingLiff(raw: unknown): BrandingLiffView {
  if (typeof raw !== 'object' || raw === null) return BRANDING_LIFF_DEFAULTS;
  const value = raw as Record<string, unknown>;
  const image = (v: unknown): { version: string } | null => {
    const version = typeof v === 'object' && v !== null ? (v as { version?: unknown }).version : null;
    return typeof version === 'string' && version.length > 0 ? { version } : null;
  };
  return {
    languageSwitcherEnabled: readLiffLanguageSwitcherEnabled(value.languageSwitcherEnabled),
    defaultLocale: readLiffDefaultLocale(value.defaultLocale),
    bottomNavEnabled: readLiffBottomNavEnabled(value.bottomNavEnabled),
    profileCover: image(value.profileCover),
    pageBackground: image(value.pageBackground),
  };
}

/**
 * ภาษาของคำขอหน้าเว็บ (`sv-web/src/i18n/request.ts` · SV-ADR-132) — pure เพื่อทดสอบได้
 * 1. ขอภาษาเจาะจง (`getTranslations({ locale })`) = ภาษานั้นเสมอ
 * 2. หน้า LINE OA (`liff` ไม่ใช่ null): ปิดปุ่มเปลี่ยนภาษา = ภาษาหลักเสมอ (ไม่สน cookie) · เปิดปุ่ม = cookie ถ้ามี ไม่งั้นภาษาหลัก
 * 3. หน้าอื่น (CMS · login) = cookie ถ้ามี ไม่งั้น `fallback` — ค่าของ LINE OA ไม่มีผล
 */
export function resolveRequestLocale<L extends string>(input: {
  locales: readonly L[];
  fallback: L;
  explicit?: string | null;
  cookie?: string | null;
  liff: Pick<BrandingLiffView, 'languageSwitcherEnabled' | 'defaultLocale'> | null;
}): L {
  const known = (value: string | null | undefined): value is L =>
    typeof value === 'string' && (input.locales as readonly string[]).includes(value);
  if (known(input.explicit)) return input.explicit;
  if (input.liff) {
    const primary = known(input.liff.defaultLocale) ? input.liff.defaultLocale : input.fallback;
    if (!input.liff.languageSwitcherEnabled) return primary;
    return known(input.cookie) ? input.cookie : primary;
  }
  return known(input.cookie) ? input.cookie : input.fallback;
}

/** path ของ proxy รูปบนเว็บ — ลงท้าย `.webp` → middleware ไม่ทำงาน (เปิดสาธารณะ: หน้า LIFF ไม่มี cookie ของ CMS) */
export const LIFF_THEME_IMAGE_PATH = '/liff-theme';

export function liffThemeImageUrl(slot: LiffThemeSlot, version: string): string {
  return `${LIFF_THEME_IMAGE_PATH}/${slot}.webp?v=${encodeURIComponent(version)}`;
}
