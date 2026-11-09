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
  /** จำนวนตัวอักษรของข้อความล้วน (ไม่นับแท็ก) — แสดงความยาวคร่าว ๆ ในตาราง */
  textLength: number;
  createdAt: string;
  updatedAt: string;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
}

export interface LegalDocumentVersionView extends LegalDocumentVersionSummaryView {
  contentHtml: string;
}

/** `GET /legal-documents/:type/versions` — ใหม่สุดก่อน (`id` มาก → น้อย) · ไม่แบ่งหน้า (เอกสารมีไม่กี่สิบเวอร์ชัน) */
export interface LegalDocumentVersionListView {
  type: LegalDocumentType;
  items: LegalDocumentVersionSummaryView[];
  /** id ของเวอร์ชันที่เผยแพร่อยู่ · ไม่มี = `null` */
  publishedId: string | null;
}

/** `POST /legal-documents/:type/versions` */
export interface LegalDocumentVersionCreateBody {
  version: string;
  contentHtml: string;
}

/** `PATCH /legal-documents/:type/versions/:id` — `expectedUpdatedAt` = ค่า `updatedAt` ตอนเปิดฟอร์ม (คนอื่นแก้คั่นกลาง = 409 `LEGAL_DOCUMENT_STALE`) */
export interface LegalDocumentVersionUpdateBody {
  version?: string;
  contentHtml?: string;
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
  contentHtml: string;
  publishedAt: string;
}
