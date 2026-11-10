import type { ContentImageView } from './content-images';
import type { DonationActorView } from './donations';

/**
 * ข่าวสาร (e-Donation · กลุ่มเมนู "จัดการเนื้อหา") — `SV-CR-025` §3 · SV-ADR-163 · `T-224` (API) · `T-225` (CMS `/content/news`) · `T-226` (public `/news`)
 * ข่าว 1 เรื่อง = หัวข้อ + รูปปก (ไม่บังคับ) + post cell หลายอันตามลำดับ (cell = รูปหลายรูปเรียงบนลงล่าง แล้วข้อความ HTML) ·
 * รูปทุกรูปอยู่ `content_images` scope `NEWS` (อัปโหลด staged ก่อน แล้วส่ง id ตอนบันทึก — SV-ADR-161) · HTML ผ่าน allowlist เดียวกับเอกสาร legal
 */

/** สถานะ (มาจาก `news_articles.is_published`) — ตัวกรอง list · ป้าย · ประวัติช่อง `status` (`news.status.<ค่า>`) */
export const NewsStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
export type NewsStatus = (typeof NewsStatus)[keyof typeof NewsStatus];
export const NEWS_STATUSES = Object.values(NewsStatus) as readonly NewsStatus[];

/** การเรียง list ของ CMS — ค่าเริ่มต้น `updated_desc` */
export const NewsSort = {
  UPDATED_DESC: 'updated_desc',
  PUBLISHED_DESC: 'published_desc',
  TITLE_ASC: 'title_asc',
} as const;
export type NewsSort = (typeof NewsSort)[keyof typeof NewsSort];
export const NEWS_SORTS = Object.values(NewsSort) as readonly NewsSort[];

/** หัวข้อข่าว (ตัดช่องว่างหัวท้าย · บังคับ) ยาวไม่เกิน */
export const NEWS_TITLE_MAX = 200;
/** post cell ต่อข่าวไม่เกิน */
export const NEWS_CELLS_MAX = 30;
/** รูปต่อ cell ไม่เกิน */
export const NEWS_CELL_IMAGES_MAX = 10;
/** HTML หลัง sanitize รวมทุก cell ยาวไม่เกิน (ตัวอักษร) */
export const NEWS_CONTENT_MAX = 300_000;
/** ข้อความย่อ (จากข้อความล้วนของ cell แรกที่มีข้อความ) ยาวไม่เกิน — list + OG description */
export const NEWS_EXCERPT_MAX = 300;
/** เพดาน body JSON ของ `/news/**` ที่ API (ค่าปกติของ Nest = 100 KB ไม่พอ) — แบบ `LEGAL_DOCUMENT_BODY_LIMIT` */
export const NEWS_BODY_LIMIT = '2mb';
/** ขนาดหน้า list ของ CMS */
export const NEWS_PER_PAGE_DEFAULT = 20;
export const NEWS_PER_PAGE_MAX = 100;
/** ขนาดหน้า list สาธารณะ */
export const NEWS_PUBLIC_PER_PAGE = 12;
export const NEWS_PUBLIC_PER_PAGE_MAX = 50;
/** คำค้นยาวสุด */
export const NEWS_QUERY_MAX = 100;

/** path หน้าเว็บ — CMS อยู่ใต้ `/content/news` เพราะ `/news` เป็นหน้าสาธารณะ (ลิงก์ที่ guest/rich menu ใช้ · SV-ADR-163) */
export const NEWS_CMS_PATH = '/content/news';
export const NEWS_PUBLIC_PATH = '/news';
export function newsPublicPath(id: string): string {
  return `${NEWS_PUBLIC_PATH}/${encodeURIComponent(id)}`;
}

/**
 * รูปตัวอย่างลิงก์ (Open Graph) ของข่าวที่มีปก — JPEG 1200×630 (1.91:1 · ครอปกลางจากปก) เพราะตัวแสดงตัวอย่างลิงก์ (LINE · Facebook) รับ JPEG แน่นอนกว่า WebP ·
 * API `GET /public/news/:id/og-image` · เว็บ `/news/<id>/og-image?v=<version ของปก>` (`SV-CR-025` §3)
 */
export const NEWS_OG_IMAGE = { width: 1200, height: 630 } as const;
export function newsOgImagePath(id: string, coverVersion: string): string {
  return `${newsPublicPath(id)}/og-image?v=${encodeURIComponent(coverVersion)}`;
}

/** cell 1 อันตามลำดับแสดง */
export interface NewsCellView {
  id: string;
  /** HTML ที่ sanitize แล้ว · cell ที่มีแต่รูป = `''` */
  contentHtml: string;
  textLength: number;
  /** ลำดับบนลงล่าง */
  images: ContentImageView[];
}

/** แถวใน list ของ CMS */
export interface NewsSummaryView {
  id: string;
  title: string;
  excerpt: string;
  cover: ContentImageView | null;
  status: NewsStatus;
  /** เผยแพร่ครั้งแรก (คงไว้แม้เลิกเผยแพร่ — ใช้เป็นวันที่ข่าว) · ไม่เคย = `null` */
  publishedAt: string | null;
  /** การกดเผยแพร่ครั้งล่าสุด */
  lastPublishedAt: string | null;
  lastPublishedBy: DonationActorView | null;
  cellCount: number;
  /** รูปทั้งหมดรวมปก */
  imageCount: number;
  textLength: number;
  createdAt: string;
  updatedAt: string;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
}

export interface NewsView extends NewsSummaryView {
  cells: NewsCellView[];
}

/** `GET /news` */
export interface NewsListQuery {
  q?: string;
  status?: NewsStatus;
  sort?: NewsSort;
  page?: number;
  perPage?: number;
}

/** cell ใน body บันทึก — `id` เดิม = แก้ cell นั้น · ไม่มี = cell ใหม่ · cell เดิมที่ไม่อยู่ในรายการ = ลบ · ลำดับใน array = ลำดับแสดง */
export interface NewsCellInput {
  id?: string;
  contentHtml: string;
  /** ลำดับบนลงล่าง · id = รูป staged ของผู้บันทึก หรือรูปเดิมของข่าวนี้ */
  imageIds: string[];
}

/** `POST /news` — สร้างเป็นฉบับร่างเสมอ (เผยแพร่ = `POST /news/:id/publish`) */
export interface NewsCreateBody {
  title: string;
  coverImageId?: string | null;
  cells: NewsCellInput[];
}

/** `PATCH /news/:id` — ส่งเฉพาะที่แก้ (`cells` = ทั้งชุด) + `expectedUpdatedAt` (คนอื่นแก้คั่น = 409 `NEWS_STALE`) */
export interface NewsUpdateBody {
  title?: string;
  /** `null` = เอาปกออก · ไม่ส่ง = ปกเดิม */
  coverImageId?: string | null;
  cells?: NewsCellInput[];
  expectedUpdatedAt: string;
}

/** `GET /public/news` (ไม่ต้อง login · เฉพาะที่เผยแพร่และไม่ถูกลบ · ใหม่สุดก่อน) — `ApiListResponse<PublicNewsSummaryView>` */
export interface PublicNewsListQuery {
  page?: number;
  perPage?: number;
}
export interface PublicNewsSummaryView {
  id: string;
  title: string;
  excerpt: string;
  cover: ContentImageView | null;
  publishedAt: string;
}

/** `GET /public/news/:id` — ไม่เผยแพร่/ลบ/ไม่มี = 404 `NEWS_NOT_FOUND` · ไม่มีข้อมูลผู้แก้ · รูปไม่มีชื่อไฟล์ */
export interface PublicNewsView extends PublicNewsSummaryView {
  cells: Array<{ contentHtml: string; images: ContentImageView[] }>;
}
