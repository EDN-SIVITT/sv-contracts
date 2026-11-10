import type { ContentImageView } from './content-images';
import type { DonationActorView } from './donations';

/**
 * เอกสารนโยบาย/ข้อกำหนดแบบเวอร์ชัน (e-Donation · กลุ่มเมนู "จัดการเนื้อหา") — `SV-CR-024` §2 · FT-22 `REQ-LGL-*` · SV-ADR-159/160
 * `T-219` (สัญญานี้ + API `/legal-documents/:type/versions` + `/public/legal-documents/:type`) · `T-220` (CMS) · `T-221` (หน้า `/privacypolicy` `/termsofuse`)
 * 1 ตาราง 2 ชนิด · เผยแพร่ได้ชนิดละ ≤ 1 เวอร์ชัน (DB บังคับด้วย unique generated column) · เนื้อหา = HTML ที่ API sanitize แล้ว
 */

/** ชนิดเอกสาร — เก็บใน `legal_document_versions.doc_type` VARCHAR(32) */
export const LegalDocumentType = {
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  TERMS_OF_USE: 'TERMS_OF_USE',
} as const;
export type LegalDocumentType = (typeof LegalDocumentType)[keyof typeof LegalDocumentType];
export const LEGAL_DOCUMENT_TYPES = Object.values(LegalDocumentType) as readonly LegalDocumentType[];

/** ชนิด ↔ ส่วนของ path API (`/legal-documents/privacy-policy/versions`) — kebab-case */
export const LEGAL_DOCUMENT_SLUGS: Readonly<Record<LegalDocumentType, string>> = {
  PRIVACY_POLICY: 'privacy-policy',
  TERMS_OF_USE: 'terms-of-use',
};

/** ส่วนของ path → ชนิด · ไม่รู้จัก = `null` (API ตอบ 404) */
export function legalDocumentTypeFromSlug(slug: string | null | undefined): LegalDocumentType | null {
  const found = LEGAL_DOCUMENT_TYPES.find((type) => LEGAL_DOCUMENT_SLUGS[type] === (slug ?? '').toLowerCase());
  return found ?? null;
}

/** หน้าสาธารณะบนเว็บ (ไม่ต้อง login) — ตามที่เจ้าของกำหนด `[domain]/privacypolicy` · `[domain]/termsofuse` */
export const LEGAL_DOCUMENT_PUBLIC_PATHS: Readonly<Record<LegalDocumentType, string>> = {
  PRIVACY_POLICY: '/privacypolicy',
  TERMS_OF_USE: '/termsofuse',
};

/**
 * รูปแบบเนื้อหาของเวอร์ชัน (`SV-CR-025` §2 · SV-ADR-162) — 1 เวอร์ชัน = 1 รูปแบบ · ข้อมูลของรูปแบบที่ไม่ได้เลือกเก็บไว้ (สลับกลับได้) แต่ตรวจ/แสดง/เผยแพร่เฉพาะรูปแบบที่เลือก
 * `TEXT` = HTML จาก editor (เดิม · ค่าเริ่มต้นของแถวเดิม) · `IMAGES` = รูปหลายรูปเรียงลงมาเต็มกว้าง · `LINK` = หน้า public redirect 307 ไป `linkUrl`
 */
export const LegalContentType = {
  TEXT: 'TEXT',
  IMAGES: 'IMAGES',
  LINK: 'LINK',
} as const;
export type LegalContentType = (typeof LegalContentType)[keyof typeof LegalContentType];
export const LEGAL_CONTENT_TYPES = Object.values(LegalContentType) as readonly LegalContentType[];
/** รูปต่อเวอร์ชัน (`IMAGES`) ไม่เกิน */
export const LEGAL_DOCUMENT_IMAGES_MAX = 30;
/** URL ปลายทาง (`LINK`) ยาวไม่เกิน — `http(s)` สมบูรณ์ · ไม่มี user:pass */
export const LEGAL_DOCUMENT_LINK_MAX = 2048;

/** URL ที่ใช้เป็นปลายทาง redirect ได้ (ตัวเดียวกับที่ API ตรวจ) — `null` = ใช้ไม่ได้ · คืนค่าที่ตัดช่องว่างแล้ว */
export function normalizeLegalLinkUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw || raw.length > LEGAL_DOCUMENT_LINK_MAX || /\s/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname || url.username || url.password) return null;
  return raw;
}

/** เลขเวอร์ชัน — ข้อความอิสระ (`1.0` · `2026-11`) ยาวไม่เกินนี้ · ตัดช่องว่างหัวท้าย · ไม่ซ้ำในชนิดเดียวกัน (ไม่สนตัวพิมพ์) */
export const LEGAL_DOCUMENT_VERSION_MAX = 32;
/** เนื้อหา HTML หลัง sanitize ยาวไม่เกินนี้ (ตัวอักษร) — เอกสารกฎหมายยาวสุดราว 100–200 KB */
export const LEGAL_DOCUMENT_CONTENT_MAX = 300_000;
/** เพดาน body JSON ของ `/legal-documents/**` ที่ API (ค่าปกติของ Nest = 100 KB ไม่พอ) — รูปแบบของ body-parser */
export const LEGAL_DOCUMENT_BODY_LIMIT = '2mb';
/** ข้อความล้วน (ไม่นับแท็ก) ต้องมีอย่างน้อยเท่านี้ — กันบันทึกเอกสารเปล่า */
export const LEGAL_DOCUMENT_CONTENT_MIN_TEXT = 1;

/** แถวในตาราง list (ไม่มีเนื้อหา — เนื้อหาโหลดเมื่อเปิดแก้ไข) */
export interface LegalDocumentVersionSummaryView {
  id: string;
  type: LegalDocumentType;
  version: string;
  isPublished: boolean;
  publishedAt: string | null;
  publishedBy: DonationActorView | null;
  /** รูปแบบที่เลือก (`SV-CR-025`) — ตารางแสดงป้ายตามนี้ */
  contentType: LegalContentType;
  /** จำนวนตัวอักษรของข้อความล้วน (ไม่นับแท็ก) — แสดงความยาวคร่าว ๆ ในตาราง (`TEXT`) */
  textLength: number;
  /** จำนวนรูปที่ผูกกับเวอร์ชันนี้ (`IMAGES`) */
  imageCount: number;
  /** ปลายทาง (`LINK`) · ไม่มี = `null` */
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
}

export interface LegalDocumentVersionView extends LegalDocumentVersionSummaryView {
  contentHtml: string;
  /** รูปตามลำดับแสดง (เก็บไว้แม้เลือกรูปแบบอื่น) */
  images: ContentImageView[];
}

/** `GET /legal-documents/:type/versions` — ใหม่สุดก่อน (`id` มาก → น้อย) · ไม่แบ่งหน้า (เอกสารมีไม่กี่สิบเวอร์ชัน) */
export interface LegalDocumentVersionListView {
  type: LegalDocumentType;
  items: LegalDocumentVersionSummaryView[];
  /** id ของเวอร์ชันที่เผยแพร่อยู่ · ไม่มี = `null` */
  publishedId: string | null;
}

/**
 * `POST /legal-documents/:type/versions` — ส่งข้อมูลของทุกรูปแบบที่มีได้ (ฟอร์มเก็บค่าที่สลับไปมาไว้) · ตรวจเฉพาะรูปแบบที่เลือก ·
 * `imageIds` = ลำดับแสดง · id ต้องเป็นรูป staged ของผู้บันทึก (scope `LEGAL`) หรือรูปของเวอร์ชันนี้ (แก้ไข)
 */
export interface LegalDocumentVersionCreateBody {
  version: string;
  contentType: LegalContentType;
  contentHtml?: string;
  linkUrl?: string | null;
  imageIds?: string[];
}

/** `PATCH /legal-documents/:type/versions/:id` — `expectedUpdatedAt` = ค่า `updatedAt` ตอนเปิดฟอร์ม (คนอื่นแก้คั่นกลาง = 409 `LEGAL_DOCUMENT_STALE`) */
export interface LegalDocumentVersionUpdateBody {
  version?: string;
  contentType?: LegalContentType;
  contentHtml?: string;
  linkUrl?: string | null;
  /** ส่ง = ชุดรูปทั้งหมดตามลำดับ (รูปเดิมที่ไม่อยู่ = ลบ) · ไม่ส่ง = รูปเดิม */
  imageIds?: string[];
  expectedUpdatedAt: string;
}

/** `POST …/:id/publish` — ผล: เวอร์ชันที่เพิ่งเผยแพร่ + เวอร์ชันที่ถูกเลิก (ไม่มี = `null`) */
export interface LegalDocumentPublishResultView {
  published: LegalDocumentVersionView;
  unpublishedId: string | null;
}

/** `GET /public/legal-documents/:type` (ไม่ต้อง login) — ไม่มีเวอร์ชันที่เผยแพร่ = `data: null` */
export interface PublicLegalDocumentView {
  type: LegalDocumentType;
  version: string;
  contentType: LegalContentType;
  /** `TEXT` เท่านั้น · รูปแบบอื่น = `''` */
  contentHtml: string;
  /** `IMAGES` เท่านั้น (ลำดับแสดง · `name` = `null`) · รูปแบบอื่น = `[]` */
  images: ContentImageView[];
  /** `LINK` เท่านั้น · รูปแบบอื่น = `null` */
  linkUrl: string | null;
  publishedAt: string;
}
