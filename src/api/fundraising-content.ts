import type { ContentImageView } from './content-images';

/**
 * เนื้อหา post cell ของกองทุน/แคมเปญ (`SV-CR-027` §2 · SV-ADR-166 · `T-231`) — กติกาเดียวกับ post cell ของข่าว (`news.ts`):
 * ตาราง `fundraising_cells` (`owner_type` FUND|CAMPAIGN + `owner_id`) · รูป = `content_images` scope `FUND` / `CAMPAIGN` (role `BODY` + `cell_id`) ·
 * บันทึกพร้อมฟอร์ม: `POST/PATCH /funds|/campaigns` รับ `cells[]` ทั้งชุด (`FundInput.cells` / `CampaignInput.cells`) · view คืน `cells` ·
 * รูป: `POST /funds|campaigns/images` (MAINTAIN · staged) · `GET /funds|campaigns/images/:imageId/:size` (READ_ONLY) ·
 * `GET /public/funds|campaigns/images/:imageId/:size` (ไม่ต้อง login · เฉพาะเจ้าของที่เปิดรับ `OPEN_FUNDS`/`OPEN_CAMPAIGNS`) · proxy เว็บ `/content-image/fund|campaign/…` ·
 * LINE OA (guest ได้): `GET /liff/:channel/campaigns/:id/content` · `GET /liff/:channel/campaigns/funds/:id/content` → `LiffFundraisingContentView` (ไม่เปิดรับ = 404)
 */

/** post cell ต่อกองทุน/แคมเปญไม่เกิน */
export const FUNDRAISING_CELLS_MAX = 20;
/** รูปต่อ cell ไม่เกิน (เกิน = 422 `CONTENT_IMAGES_LIMIT`) */
export const FUNDRAISING_CELL_IMAGES_MAX = 10;
/** HTML หลัง sanitize รวมทุก cell ยาวไม่เกิน (ตัวอักษร) */
export const FUNDRAISING_CONTENT_MAX = 300_000;
/** เพดาน body JSON ของ `/funds/**` `/campaigns/**` ที่ API (ค่าปกติของ Nest = 100 KB ไม่พอ) — แบบ `NEWS_BODY_LIMIT` */
export const FUNDRAISING_BODY_LIMIT = '2mb';

/** cell 1 อันตามลำดับแสดง (CMS view) */
export interface FundraisingCellView {
  id: string;
  /** HTML ที่ sanitize แล้ว (allowlist เดียวกับ legal/ข่าว) · cell ที่มีแต่รูป = `''` */
  contentHtml: string;
  textLength: number;
  /** ลำดับบนลงล่าง */
  images: ContentImageView[];
}

/**
 * cell ใน body บันทึกกองทุน/แคมเปญ — `id` เดิม = แก้ cell นั้น · ไม่มี = cell ใหม่ · cell เดิมที่ไม่อยู่ในรายการ = ลบ · ลำดับใน array = ลำดับแสดง ·
 * ไม่ส่ง `cells` เลย = ไม่แตะเนื้อหา · ว่างล้วน (ไม่มีข้อความและรูป) = 422 `cells[i]` `EMPTY`
 */
export interface FundraisingCellInput {
  id?: string;
  contentHtml: string;
  /** ลำดับบนลงล่าง · id = รูป staged ของผู้บันทึก (scope ตรงเมนู) หรือรูปเดิมของรายการนี้ */
  imageIds: string[];
  /**
   * คำอธิบายใต้รูป ขนานกับ `imageIds` (ยาวเท่ากัน — ไม่เท่า = 422 `cells[i].imageCaptions` MISMATCH) · `''` = ไม่มี · ไม่ส่ง = ไม่มีทุกรูปของส่วนนี้ ·
   * normalize ช่องว่างแล้ว ≤ `CONTENT_IMAGE_CAPTION_MAX` (เกิน = 422 `cells[i].imageCaptions` TOO_LONG + `index`) — `SV-CR-028` §3 · SV-ADR-169
   */
  imageCaptions?: string[];
}

/** cell สำหรับหน้าสาธารณะ/LINE OA — ไม่มี id · รูป `name: null` */
export interface PublicContentCellView {
  contentHtml: string;
  images: ContentImageView[];
}

/** `GET /liff/:channel/campaigns/:id/content` · `GET /liff/:channel/campaigns/funds/:id/content` — `cells` ว่าง = ไม่มีเนื้อหา (ไม่แสดงส่วนนี้) */
export interface LiffFundraisingContentView {
  cells: PublicContentCellView[];
}
