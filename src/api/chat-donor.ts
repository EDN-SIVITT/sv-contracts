import type { ChatCardContent, ChatMessageSender } from './chat';
import type { DonorView } from './donors';
import { ErrorCode } from './errors';

/**
 * แผงผู้บริจาคในหน้า Chat (CMS · `SV-CR-013` · SV-ADR-108/109 · `T-158`) — module `chat-donor` ของ e-Donation (Chat ของฐานไม่รู้จักผู้บริจาค)
 */

/**
 * `GET /chat/threads/:id/donor` (+ คำตอบของ `POST …/donor/link` และ `POST …/donor` — body ของตัวหลัง = `DonorCreateInput` เดียวกับ `POST /donors` ·
 * สร้าง `STAFF` + ผูก LINE ของห้องในแถวเดียว) — LINE ของห้อง + ผู้บริจาคที่ผูกกับ LINE นั้น
 * `lineUserId` / ชื่อ / รูป มาจาก `line_accounts` ของห้อง (webhook ที่ตรวจลายเซ็นแล้ว) · `donor` = ผู้บริจาคที่ยังไม่ถูกลบซึ่ง `line_user_id` ตรงกัน · ไม่มี = `null`
 */
export interface ChatThreadDonorView {
  threadId: string;
  lineUserId: string | null;
  lineDisplayName: string | null;
  linePictureUrl: string | null;
  donor: DonorView | null;
}

/**
 * body ของ `POST /chat/threads/:id/donor/link` — ผูก LINE ของห้องกับผู้บริจาครายเดิม (`donors` MAINTAIN + `chat` READ_ONLY)
 * **ไม่มีช่อง LINE** — API อ่านจาก `line_accounts` ของห้องเอง (ส่ง `lineUserId` มา = 400 `VALIDATION_FAILED`)
 * ผู้บริจาคผูก LINE ของห้องนี้อยู่แล้ว = 200 คืนผลเดิม (ไม่บันทึก audit) · ผูก LINE อื่นอยู่ = 409 `DONOR_LINE_ALREADY_LINKED` ·
 * LINE นี้ผูกกับผู้บริจาครายอื่น = 409 `DONOR_ALREADY_LINKED` (ทั้งคู่ `details { donorId, donorCode }`)
 */
export interface ChatThreadDonorLinkInput {
  donorId: string;
}

/** โน้ตส่งต่องานของห้องสนทนา — ความยาวหลัง trim 0…ค่านี้ (UTF-16 code units · ตรงกับ `VARCHAR(1000)` ของ `chat_notes.body`) · ว่างได้เมื่อมีไฟล์แนบ (`T-162`) */
export const CHAT_NOTE_MAX_LENGTH = 1000;
/** `GET /chat/threads/:id/notes` คืนโน้ตล่าสุดไม่เกินจำนวนนี้ (ใหม่ → เก่า) */
export const CHAT_NOTE_LIST_LIMIT = 200;
/**
 * ไฟล์แนบต่อโน้ตไม่เกินจำนวนนี้ — นับรวมไฟล์เดิมที่ยังไม่เอาออก (`SV-CR-014` §3 · SV-ADR-112 · `T-162`) ·
 * เกิน = 422 `VALIDATION_FAILED` `details { field: 'files', reason: 'TOO_MANY', max }` (รวมกรณี multipart ส่งมาเกินที่ชั้น multer)
 */
export const CHAT_NOTE_MAX_FILES = 10;

/** ชนิดไฟล์แนบของโน้ต — `IMAGE` = รูป (มีภาพย่อ WebP `thumb`/`preview`) · `FILE` = เอกสาร (ต้นฉบับอย่างเดียว) */
export const ChatNoteFileKind = {
  IMAGE: 'IMAGE',
  FILE: 'FILE',
} as const;
export type ChatNoteFileKind = (typeof ChatNoteFileKind)[keyof typeof ChatNoteFileKind];

/** `GET /chat/notes/files/:fileId?variant=` — `thumb`/`preview` = WebP เฉพาะรูป (เอกสาร = 404) · `original` (ค่าเริ่มต้น) = ไฟล์ต้นฉบับ */
export const ChatNoteFileVariant = {
  THUMB: 'thumb',
  PREVIEW: 'preview',
  ORIGINAL: 'original',
} as const;
export type ChatNoteFileVariant = (typeof ChatNoteFileVariant)[keyof typeof ChatNoteFileVariant];
export const CHAT_NOTE_FILE_VARIANTS: readonly ChatNoteFileVariant[] = Object.values(ChatNoteFileVariant);

/** ด้านยาวสุด (px) ของภาพย่อ WebP ที่ระบบสร้างจากรูป (ไม่ขยาย · หมุนตาม EXIF · GIF ใช้เฟรมแรก) */
export const CHAT_NOTE_IMAGE_MAX_PX = { thumb: 320, preview: 1600 } as const;

/**
 * ชนิดไฟล์ที่โน้ตรับ: นามสกุล (ตัวเล็ก ไม่มีจุด) → MIME ที่ระบบเก็บ/ส่งกลับ — เว็บใช้ตรวจ**นามสกุล**ก่อนส่ง (MIME จากเบราว์เซอร์ไม่แน่นอน เช่น csv บน Windows) ·
 * API ตรวจ**เนื้อไฟล์**ซ้ำเสมอ: รูป = sharp อ่านได้และเป็น JPEG/PNG/WebP/GIF (นามสกุลรูปตัวไหนก็ได้ · ไม่มีนามสกุลได้ เช่นรูปที่วางจากคลิปบอร์ด) ·
 * `pdf` = หัว `%PDF-` · `docx`/`xlsx`/`pptx` = ZIP (`PK\x03\x04`) · `doc`/`xls`/`ppt` = OLE (`D0 CF 11 E0 A1 B1 1A E1`) · `txt`/`csv` = ไม่มีไบต์ NUL ใน 8 KB แรก ·
 * ไม่ผ่าน = 422 `FILE_TYPE_NOT_ALLOWED` `details { field: 'files', index, name, reason: 'EXTENSION' | 'CONTENT' | 'CORRUPT' | 'EMPTY', accepted }`
 */
export const CHAT_NOTE_FILE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
} as const;
export type ChatNoteFileExtension = keyof typeof CHAT_NOTE_FILE_TYPES;
/** MIME ของรูปที่รับ (ได้ `kind: IMAGE` + ภาพย่อ) */
export const CHAT_NOTE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
/** ค่า `accept` ของ `<input type="file">` — `.jpg,.jpeg,…,.csv` */
export const CHAT_NOTE_FILE_ACCEPT = Object.keys(CHAT_NOTE_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(',');

/**
 * ฟอร์มของ `POST /chat/threads/:id/notes` — **multipart** (`body` · `showOnHome` `'true'`/`'false'` · `files` ซ้ำได้หลายไฟล์ ชื่อช่องตรงตัว) หรือ JSON (ไม่มีไฟล์ · แบบเดิม `{ body }` ใช้ได้)
 * `body` trim แล้ว 0–`CHAT_NOTE_MAX_LENGTH` · body ว่าง + ไม่มีไฟล์ = 422 `VALIDATION_FAILED` `details { field: 'body', reason: 'REQUIRED' }` · `showOnHome` ไม่ส่ง = `true`
 */
export interface ChatNoteInput {
  body?: string;
  showOnHome?: boolean;
}

/**
 * ฟอร์มของ `PATCH /chat/notes/:id` — ช่องที่ไม่ส่ง = คงเดิม · `files` = ไฟล์ใหม่ต่อท้าย · `removeFileIds` = id ไฟล์เดิมที่เอาออก
 * (multipart ส่งช่องซ้ำหรือคั่นจุลภาค · JSON เป็น array · id ที่ไม่ใช่ไฟล์ของโน้ตนี้แล้ว = ข้าม) · ผลรวมไฟล์ > `CHAT_NOTE_MAX_FILES` / body ว่าง + ไฟล์เหลือ 0 = 422 · ทำทั้งชุดแบบ atomic
 */
export interface ChatNoteUpdateInput extends ChatNoteInput {
  removeFileIds?: string[];
}

/** ไฟล์แนบของโน้ต (`chat_note_files`) — ไม่มี storage key · ดาวน์โหลด/ภาพย่อผ่าน `GET /chat/notes/files/:id?variant=` (`chat` READ_ONLY) */
export interface ChatNoteFileView {
  id: string;
  /** ชื่อไฟล์เดิม (ตัด path/อักขระควบคุม ≤ 255 ตัวอักษร) — ใช้เป็นชื่อตอนดาวน์โหลด */
  name: string;
  /** ชนิดของไฟล์ต้นฉบับที่ระบบตรวจจากเนื้อไฟล์ (ค่าใน `CHAT_NOTE_FILE_TYPES`) */
  mimeType: string;
  /** ขนาดไฟล์ต้นฉบับ (ไบต์) */
  size: number;
  kind: ChatNoteFileKind;
  /** ขนาดภาพหลังหมุนตาม EXIF (px) · เอกสาร = `null` */
  width: number | null;
  height: number | null;
}

/**
 * โน้ตของห้องสนทนา (`chat_notes` · SV-ADR-109) — ผู้สร้าง/ผู้แก้ล่าสุดแบบ `ChatMessageSender` (ผู้ใช้ที่ถูกลบแบบ soft ยังแสดงชื่อ ·
 * ลบถาวร/ไม่ทราบ = `null`) · `updatedAt` = `createdAt` เมื่อยังไม่เคยแก้ · `showOnHome` = แสดงในหน้าแรกของแผง · `files` เรียงตามลำดับแนบ (`T-162`)
 */
export interface ChatNoteView {
  id: string;
  threadId: string;
  body: string;
  showOnHome: boolean;
  files: ChatNoteFileView[];
  createdBy: ChatMessageSender | null;
  updatedBy: ChatMessageSender | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * หน้า LIFF ที่ปุ่ม "เชื่อมต่อบัญชี" เปิด = หน้า "บัญชีของฉัน" (ปุ่ม profile ของ rich menu · `https://liff.line.me/<LIFF ID>/profile`) —
 * ยังไม่เชื่อม → หน้า LIFF พาไปเชื่อมบัญชี/สมัคร · เชื่อมแล้ว → บัญชีของฉัน (`SV-CR-032` · SV-ADR-172)
 */
export const ACCOUNT_LINK_LIFF_PAGE = 'profile';

/** LIFF URL ของหน้าเชื่อมบัญชี — `liffId` ว่าง = `null` */
export function accountLinkLiffUrl(liffId: string | null | undefined): string | null {
  const id = (liffId ?? '').trim();
  return id ? `https://liff.line.me/${encodeURIComponent(id)}/${ACCOUNT_LINK_LIFF_PAGE}` : null;
}

/** เหตุที่ส่งการ์ดชวนเชื่อมบัญชีไม่ได้ (ค่า = `ErrorCode` ที่ `POST` ตอบ · หน้าเว็บแปลด้วย `errorMessageKey`) */
export const ChatLinkInviteBlockedReason = {
  /** ยังไม่ตั้ง LIFF ID (ตั้งค่า → LINE) — 422 */
  LIFF_NOT_CONFIGURED: ErrorCode.SHARE_LINK_LIFF_NOT_CONFIGURED,
  /** แม่แบบ `account_link_invite` ไม่มี/ผิดรูป (ตั้งค่า → ข้อความอัตโนมัติ · ยังไม่รัน `0063`) — 503 */
  TEMPLATE_NOT_CONFIGURED: ErrorCode.MESSAGE_TEMPLATE_NOT_CONFIGURED,
  /** LINE ของห้องเชื่อมกับผู้บริจาคแล้ว (เชื่อมเองจาก LINE OA ระหว่างนั้น) — 409 */
  ALREADY_LINKED: ErrorCode.DONOR_ALREADY_LINKED,
} as const;
export type ChatLinkInviteBlockedReason = (typeof ChatLinkInviteBlockedReason)[keyof typeof ChatLinkInviteBlockedReason];

/**
 * `GET /chat/threads/:id/link-invite` (`chat` R + `donors` R · `SV-CR-032` §1 §2) — ตัวอย่างการ์ดที่จะส่ง + ลิงก์สำหรับปุ่ม "แชร์" ·
 * ไม่ส่ง · ไม่ audit · `blocked` = เหตุแรกที่ส่งไม่ได้ (ลำดับ: เชื่อมแล้ว → LIFF → แม่แบบ) · ห้องไม่มี LINE user ID = 422 `VALIDATION_FAILED`
 */
export interface ChatLinkInviteView {
  /** LIFF URL หน้าเชื่อมบัญชี (`accountLinkLiffUrl`) · `null` = ยังไม่ตั้ง LIFF ID */
  url: string | null;
  /** การ์ดที่ render ด้วยชื่อ LINE ของห้องแล้ว · `null` = แม่แบบใช้ไม่ได้ หรือยังไม่มี `url` */
  card: ChatCardContent | null;
  blocked: ChatLinkInviteBlockedReason | null;
}

/** body ของ `POST /chat/threads/:id/link-invite` — `clientMessageId` เดิมภายใน 24 ชม. = คืนข้อความเดิม ไม่ส่งซ้ำ (SV-ADR-041) */
export interface ChatLinkInviteInput {
  clientMessageId?: string;
}
