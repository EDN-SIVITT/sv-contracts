import { ErrorCode } from './errors';

/**
 * ลิงก์แชร์รายการให้ผู้บริจาค (e-Donation) — `SV-CR-016` §7 · SV-ADR-125 · Q-120 · `T-177`
 * แอดมินกด "แชร์ลิงก์" ที่รายการบริจาค/ออเดอร์ → ได้ LIFF URL `https://liff.line.me/<LIFF ID>/s/<code>` ไปวางในแชท LINE ·
 * เปิดได้เฉพาะผู้บริจาคที่ผูกบัญชี LINE และเป็น**เจ้าของปัจจุบัน**ของรายการ (ตรวจตอนเปิดทุกครั้ง) · อื่น ๆ = 404 เดียวกัน
 * CMS: `GET|POST /donations/:id/share-link` (`donations` ≥ READ_ONLY) · `GET|POST /orders/:id/share-link` (`orders` ≥ READ_ONLY) —
 * แยก route ตามเมนู (09-pitfalls 128 · ไม่ทำสิทธิ์ไดนามิก) · LIFF: `GET /liff/:channel/donor/share-links/:code`
 */

export const ShareLinkTargetType = {
  DONATION: 'DONATION',
  ORDER: 'ORDER',
} as const;
export type ShareLinkTargetType = (typeof ShareLinkTargetType)[keyof typeof ShareLinkTargetType];

/** ความยาว code (คอลัมน์ `share_links.code` CHAR(10) utf8mb4_bin — ตัวพิมพ์ต่างกัน = คนละ code) */
export const SHARE_LINK_CODE_LENGTH = 10;
/** ชุดตัวอักษร base62 ที่ API สุ่ม (crypto) — 62^10 ≈ 8.4 × 10^17 แบบ */
export const SHARE_LINK_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** รูปแบบ code ที่รับ (ทั้ง API LIFF และ whitelist `liff.state` ของหน้าเว็บ) — ไม่ตรง = 404 เดียวกับไม่พบ */
export const SHARE_LINK_CODE_PATTERN = /^[0-9A-Za-z]{10}$/;
/** ส่วน path ของหน้า LIFF (`https://liff.line.me/<LIFF ID>/s/<code>` → `/liff/<channel>/s/<code>`) */
export const SHARE_LINK_LIFF_PAGE = 's';

/** เป้าหมายของลิงก์ (หน้าเว็บส่งให้ปุ่มกลาง `ShareLinkButton` · API อ่านจาก path) */
export interface ShareLinkTarget {
  targetType: ShareLinkTargetType;
  targetId: string;
}

/** `POST /donations|orders/:id/share-link` — ใหม่ = 201 `reused: false` · มีลิงก์ของ (ชนิด · id · ผู้บริจาคปัจจุบัน) แล้ว = 200 code เดิม `reused: true` */
export interface ShareLinkView {
  code: string;
  /** `https://liff.line.me/<LIFF ID ของ channel MAIN>/s/<code>` */
  url: string;
  createdAt: string;
  reused: boolean;
}

/** เหตุที่สร้างลิงก์ไม่ได้ (ปุ่มปิด + `title`) — ค่าเดียวกับ error code ที่ `POST` ตอบ 422 */
export const ShareLinkBlockedReason = {
  DONOR_NOT_LINKED: ErrorCode.SHARE_LINK_DONOR_NOT_LINKED,
  LIFF_NOT_CONFIGURED: ErrorCode.SHARE_LINK_LIFF_NOT_CONFIGURED,
} as const;
export type ShareLinkBlockedReason = (typeof ShareLinkBlockedReason)[keyof typeof ShareLinkBlockedReason];

/** `GET /donations|orders/:id/share-link` — หน้า view ใช้ตัดสินว่าปุ่มกดได้ไหม (ไม่สร้างลิงก์ · ไม่ audit) · `null` = สร้างได้ */
export interface ShareLinkStatusView {
  blockedReason: ShareLinkBlockedReason | null;
}

/** `GET /liff/:channel/donor/share-links/:code` — หน้า `/liff/<channel>/s/<code>` พาไปหน้ารายละเอียดเดิมของชนิดนั้น */
export interface LiffShareLinkResolveView {
  targetType: ShareLinkTargetType;
  targetId: string;
}
