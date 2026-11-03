import type { ChatMessageSender } from './chat';
import type { DonorView } from './donors';

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

/** โน้ตส่งต่องานของห้องสนทนา — ความยาวหลัง trim 1…ค่านี้ (UTF-16 code units · ตรงกับ `VARCHAR(1000)` ของ `chat_notes.body`) */
export const CHAT_NOTE_MAX_LENGTH = 1000;
/** `GET /chat/threads/:id/notes` คืนโน้ตล่าสุดไม่เกินจำนวนนี้ (ใหม่ → เก่า) */
export const CHAT_NOTE_LIST_LIMIT = 200;

/** body ของ `POST /chat/threads/:id/notes` · `PATCH /chat/notes/:id` */
export interface ChatNoteInput {
  body: string;
}

/**
 * โน้ตของห้องสนทนา (`chat_notes` · SV-ADR-109) — ผู้สร้าง/ผู้แก้ล่าสุดแบบ `ChatMessageSender` (ผู้ใช้ที่ถูกลบแบบ soft ยังแสดงชื่อ ·
 * ลบถาวร/ไม่ทราบ = `null`) · `updatedAt` = `createdAt` เมื่อยังไม่เคยแก้
 */
export interface ChatNoteView {
  id: string;
  threadId: string;
  body: string;
  createdBy: ChatMessageSender | null;
  updatedBy: ChatMessageSender | null;
  createdAt: string;
  updatedAt: string;
}
