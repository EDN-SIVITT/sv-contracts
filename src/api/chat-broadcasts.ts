import type { LineChannel } from '../enums/line';
import type { ErrorCode } from './errors';
import { CHAT_MESSAGE_MAX_LENGTH, type ChatImageView, type ChatUserRef } from './chat';
import type { DonorGroupRef } from './donor-groups';

// ── Broadcast จากหน้า Chat (`SV-CR-017` §3 · FT-10 `REQ-CHT-028` · SV-ADR-130 · `T-181`) ─────────────────────────────
// ส่ง = `chat` FULL · ดูประวัติ = `chat` READ_ONLY · ข้อความอย่างเดียว · ส่งสำเร็จ (SENT/PARTIAL) = ลงห้องแชทของผู้รับเป็นข้อความขาออก
// (`0048` · `REQ-CHT-030` · SV-ADR-135 — เดิม SV-ADR-130 "ไม่ลงห้องแชท") แต่**ไม่แตะ chat_threads** (ลำดับห้อง/ยังไม่อ่าน/สถานะรอตอบคงเดิม)

/** เป้าหมาย — ALL = LINE broadcast (ผู้ติดตาม OA ทุกคน) · DONOR_GROUPS = multicast ผู้บริจาคที่ผูก LINE ในกลุ่มที่เลือก */
export const ChatBroadcastTargetType = {
  ALL: 'ALL',
  DONOR_GROUPS: 'DONOR_GROUPS',
} as const;
export type ChatBroadcastTargetType = (typeof ChatBroadcastTargetType)[keyof typeof ChatBroadcastTargetType];
export const CHAT_BROADCAST_TARGET_TYPES = [ChatBroadcastTargetType.ALL, ChatBroadcastTargetType.DONOR_GROUPS] as const;

/** ผลการส่ง — SENT = ครบ · PARTIAL = บางชุด multicast ล้ม (มีจำนวน) · FAILED = ไม่ถึงใครเลย */
export const ChatBroadcastStatus = {
  SENT: 'SENT',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
} as const;
export type ChatBroadcastStatus = (typeof ChatBroadcastStatus)[keyof typeof ChatBroadcastStatus];

/** ค่าใน `target.groupIds` ที่หมายถึง "ไม่มีกลุ่ม" (ผู้บริจาคที่ไม่มีกลุ่ม/กลุ่มถูกลบ) — ค่าเดียวกับตัวกรอง `none` ของเมนูอื่น */
export const CHAT_BROADCAST_GROUP_NONE = 'none';
/** id กลุ่มใน `target.groupIds` — เลขแถว `donor_groups.id` หรือ `none` */
export const CHAT_BROADCAST_GROUP_ID_PATTERN = /^(\d{1,20}|none)$/;
/** เลือกได้สูงสุดกี่ค่าในคำขอเดียว (กันคำขอยักษ์ — กลุ่มจริงมีไม่กี่สิบ) */
export const CHAT_BROADCAST_GROUPS_MAX = 200;
/** ข้อความ ≤ 5,000 UTF-16 code units แบบ LINE — นับแบบเดียวกับกล่องพิมพ์ของ Chat (`String.length` หลังตัดช่องว่างหัวท้าย) */
export const CHAT_BROADCAST_TEXT_MAX_LENGTH = CHAT_MESSAGE_MAX_LENGTH;
/** LINE multicast รับ userId ได้ ≤ 500 ต่อคำขอ — API แบ่งชุดตามนี้ (เรียงตาม id ผู้บริจาค · ส่งทีละชุดตามลำดับ) */
export const CHAT_BROADCAST_MULTICAST_MAX = 500;
/** `GET /chat/broadcasts` — ขนาดหน้าเริ่มต้นของแท็บประวัติใน dialog */
export const CHAT_BROADCAST_HISTORY_PER_PAGE = 20;

export type ChatBroadcastTextProblem = 'EMPTY' | 'TOO_LONG';

/**
 * ตรวจข้อความแบบเดียวกันทั้งเว็บและ API — ว่าง (หลังตัดช่องว่าง) · ยาวเกิน ·
 * `hasImages` = แนบรูปแล้ว → ข้อความว่างได้ (ต้องมีอย่างน้อย 1 อย่าง · `REQ-CHT-034` · `T-198`)
 */
export function chatBroadcastTextProblem(text: string, hasImages = false): ChatBroadcastTextProblem | null {
  const trimmed = text.trim();
  if (!trimmed) return hasImages ? null : 'EMPTY';
  if (trimmed.length > CHAT_BROADCAST_TEXT_MAX_LENGTH) return 'TOO_LONG';
  return null;
}

/** โควตาข้อความของ LINE OA เดือนนี้ — `limited: false` = ไม่จำกัด (`limit`/`remaining` = null) · ดึงไม่ได้ = view เป็น `null` ทั้งก้อน */
export interface ChatBroadcastQuotaView {
  limited: boolean;
  limit: number | null;
  used: number | null;
  remaining: number | null;
}

/** กลุ่มผู้บริจาคที่เลือกได้ + จำนวนผู้รับ (ผู้บริจาคไม่ถูกลบที่ผูก LINE) — 0 = เลือกไม่ได้ */
export interface ChatBroadcastGroupTarget extends DonorGroupRef {
  recipientCount: number;
}

/** `GET /chat/broadcasts/targets?channel=` (`chat` FULL) */
export interface ChatBroadcastTargetsView {
  channel: LineChannel;
  /** ตั้ง Channel Access Token ของ channel นี้แล้ว — `false` = ส่งไม่ได้ (เว็บบอกให้ไปตั้งค่า) */
  configured: boolean;
  /** กลุ่มที่ยังไม่ลบ (default ก่อน แล้วชื่อ) */
  groups: ChatBroadcastGroupTarget[];
  /** ผู้บริจาคที่ผูก LINE แต่ไม่มีกลุ่ม (รวมกลุ่มที่ถูกลบ) */
  noGroupRecipientCount: number;
  /** ผู้บริจาคทุกคนที่ผูก LINE (ไม่ใช่จำนวนผู้ติดตาม OA — "ทุกคน" ใช้ LINE broadcast ซึ่งไปถึงผู้ติดตามทั้งหมด) */
  linkedRecipientCount: number;
  quota: ChatBroadcastQuotaView | null;
}

/** body ของ `POST /chat/broadcasts` */
export interface ChatBroadcastTargetInput {
  type: ChatBroadcastTargetType;
  /** DONOR_GROUPS เท่านั้น — id กลุ่ม และ/หรือ `none` · ALL ไม่ใช้ */
  groupIds?: string[];
}
export interface ChatBroadcastCreateInput {
  channel: LineChannel;
  target: ChatBroadcastTargetInput;
  /** ว่างได้เมื่อแนบรูป (`imageIds`) */
  text: string;
  /** id จาก `POST /chat/images` ของผู้ส่งเอง ≤ `CHAT_IMAGE_MAX_PER_SEND` (`REQ-CHT-034`) — ส่งเป็นรูปก่อน แล้วข้อความท้าย */
  imageIds?: string[];
  /** UUID ที่เว็บสุ่มต่อการกดยืนยัน 1 ครั้ง — ส่งซ้ำค่าเดิม = ได้แถวเดิมโดยไม่ส่งซ้ำ (ไม่บันทึก audit ซ้ำ) */
  clientRequestId: string;
}

/** กลุ่มในประวัติ — ชื่อ/สี ณ ตอนอ่าน · กลุ่มที่ถูกลบภายหลังยังมีชื่อ (`deleted: true`) */
export interface ChatBroadcastTargetGroupView {
  id: string;
  name: string;
  color: string;
  iconUrl: string | null;
  deleted: boolean;
}

export interface ChatBroadcastTargetView {
  type: ChatBroadcastTargetType;
  groups: ChatBroadcastTargetGroupView[];
  /** เลือก "ไม่มีกลุ่ม" ด้วย */
  includesNoGroup: boolean;
}

/** 1 รายการในประวัติ (`GET /chat/broadcasts`) และผลของ `POST /chat/broadcasts` */
export interface ChatBroadcastView {
  id: string;
  channel: LineChannel;
  target: ChatBroadcastTargetView;
  /** ว่างได้เมื่อส่งรูปอย่างเดียว */
  text: string;
  /** รูปที่ส่ง (ลำดับเดิม · `REQ-CHT-034`) — ไม่มี = `[]` · รูปที่ไม่พบแล้วถูกตัดออก */
  images: ChatImageView[];
  /** ALL = `null` (LINE ไม่บอกจำนวนผู้ติดตาม) */
  recipientCount: number | null;
  /** จำนวนผู้รับในชุดที่ LINE รับแล้ว / ล้ม — ALL = `null` (ดูจาก `status`) */
  sentCount: number | null;
  failedCount: number | null;
  status: ChatBroadcastStatus;
  /** code ของความล้มเหลวล่าสุด (ไม่มีรายละเอียดจาก LINE) — SENT = `null` */
  errorCode: ErrorCode | null;
  createdBy: ChatUserRef | null;
  createdAt: string;
}
