/**
 * รูปของเนื้อหา (กลุ่มเมนู "จัดการเนื้อหา") — `SV-CR-025` §1 · SV-ADR-161 · `T-222` (API กลาง) · `T-223`/`T-225` (เว็บ)
 * ตาราง `content_images` ตารางเดียวใช้ร่วมทุกเมนูเนื้อหา (`scope`) · อัปโหลดก่อนเป็นรูป **staged** (`owner_id` NULL · ผูกผู้อัปโหลด) →
 * ฟอร์มส่ง `imageIds[]` ตามลำดับแสดงตอนบันทึก → API ผูก/เรียง/ปลดใน transaction เดียวกับเนื้อหา · public เสิร์ฟเฉพาะรูปของรายการที่เผยแพร่อยู่
 */

/** เมนูเจ้าของรูป — เก็บใน `content_images.scope` VARCHAR(16) */
export const ContentImageScope = {
  /** เอกสารนโยบาย/ข้อกำหนด (`legal_document_versions.id`) */
  LEGAL: 'LEGAL',
  /** ข่าวสาร (`news_articles.id`) */
  NEWS: 'NEWS',
} as const;
export type ContentImageScope = (typeof ContentImageScope)[keyof typeof ContentImageScope];
export const CONTENT_IMAGE_SCOPES = Object.values(ContentImageScope) as readonly ContentImageScope[];

/** หน้าที่ของรูปในรายการ — `COVER` = รูปปกข่าว (1 รูป) · `BODY` = รูปในเนื้อหา (เอกสาร legal · cell ของข่าว) */
export const ContentImageRole = {
  COVER: 'COVER',
  BODY: 'BODY',
} as const;
export type ContentImageRole = (typeof ContentImageRole)[keyof typeof ContentImageRole];

/**
 * ขนาดที่เก็บ (WebP) — `thumb` กรอบ 480×480 (ภาพย่อใน CMS) · `medium` กว้าง ≤ 1080 (มือถือ) · `large` กว้าง ≤ 1920 สูง ≤ 16000 (จอใหญ่/retina)
 * ไม่ขยายรูปเล็ก (`withoutEnlargement`) · width/height ที่ส่งออก = ของ `large`
 */
export const CONTENT_IMAGE_SIZES = ['thumb', 'medium', 'large'] as const;
export type ContentImageSize = (typeof CONTENT_IMAGE_SIZES)[number];
export const CONTENT_IMAGE_MAX_PX: Readonly<Record<ContentImageSize, { width: number; height: number }>> = {
  thumb: { width: 480, height: 480 },
  medium: { width: 1080, height: 16000 },
  large: { width: 1920, height: 16000 },
};
/** ชนิดไฟล์ที่รับ (ตรวจจากเนื้อไฟล์ด้วย sharp ไม่เชื่อนามสกุล) — GIF ใช้เฟรมแรก · `accept` ของ `<input type=file>` */
export const CONTENT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
/** ชื่อไฟล์เดิมที่เก็บ (แสดงใน CMS · ประวัติรูปปก) ยาวไม่เกิน */
export const CONTENT_IMAGE_NAME_MAX = 200;
/** รูป staged ค้างต่อผู้ใช้ต่อ scope ได้ไม่เกิน (เกิน = 422 `CONTENT_IMAGES_LIMIT`) */
export const CONTENT_IMAGE_STAGED_MAX = 100;
/** รูป staged ที่เก่ากว่านี้ (ชั่วโมง) ถูกลบเองตอนมีการอัปโหลดครั้งถัดไปใน scope เดียวกัน */
export const CONTENT_IMAGE_STAGED_TTL_HOURS = 24;

/** รูป 1 รูปที่ API ส่งออก (ไม่มี storage key) — CMS + public ใช้รูปเดียวกัน */
export interface ContentImageView {
  id: string;
  /** hex 8 ตัว สุ่มใหม่ทุกไฟล์ (URL `?v=` · ETag) */
  version: string;
  /** ขนาดของ `large` (px) — ใส่ `width`/`height` ของ `<img>` กันหน้าเลื่อนตอนโหลด */
  width: number;
  height: number;
  /** ชื่อไฟล์เดิม — public ไม่ส่ง (`null`) */
  name: string | null;
}

/** ผลอัปโหลด staged (`POST /<เมนู>/images`) · คัดลอก (`POST /legal-documents/images/copy`) */
export interface ContentImageUploadResult {
  image: ContentImageView;
}
export interface ContentImageCopyBody {
  imageIds: string[];
}
export interface ContentImageCopyResult {
  images: ContentImageView[];
}

/** path proxy บนเว็บ (origin เดียวกับหน้า — CSP `img-src 'self'`) — `/content-image/<legal|news>/<id>/<size>?v=` */
export const CONTENT_IMAGE_PATH = '/content-image/';
export const CONTENT_IMAGE_SCOPE_SLUGS: Readonly<Record<ContentImageScope, string>> = {
  LEGAL: 'legal',
  NEWS: 'news',
};

/** URL รูปบนเว็บ — proxy ตัดสินเองว่าใช้ทาง CMS (มี cookie) หรือทาง public */
export function contentImageUrl(scope: ContentImageScope, image: Pick<ContentImageView, 'id' | 'version'>, size: ContentImageSize): string {
  return `${CONTENT_IMAGE_PATH}${CONTENT_IMAGE_SCOPE_SLUGS[scope]}/${encodeURIComponent(image.id)}/${size}?v=${encodeURIComponent(image.version)}`;
}

/** `srcset` ของรูปเต็มกว้าง (medium + large) — ใช้คู่ `sizes` ของหน้า */
export function contentImageSrcSet(scope: ContentImageScope, image: Pick<ContentImageView, 'id' | 'version' | 'width'>): string {
  const medium = Math.min(image.width, CONTENT_IMAGE_MAX_PX.medium.width);
  if (image.width <= medium) return `${contentImageUrl(scope, image, 'large')} ${image.width}w`;
  return `${contentImageUrl(scope, image, 'medium')} ${medium}w, ${contentImageUrl(scope, image, 'large')} ${image.width}w`;
}
