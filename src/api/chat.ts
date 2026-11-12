import { ChatMessageType, type ChatMessageDirection } from '../enums/chat';
import type { LineChannel } from '../enums/line';
import type { ChatAppearance, ChatFlag } from './chat-settings';
import type { ChatBroadcastTargetType } from './chat-broadcasts';

/** รายการคู่สนทนาที่ CMS เห็น — ข้อมูลตัวตนมาจาก LINE account เท่านั้น (`REQ-CHT-001`) */
export interface ChatThreadListItemView {
  id: string;
  channel: LineChannel;
  displayName: string | null;
  pictureUrl: string | null;
  lineUserId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  /** ข้อความล่าสุดแบบตัวอักษร — มีค่าเฉพาะข้อความชนิด `TEXT` เท่านั้น */
  lastMessagePreview: string | null;
  /**
   * ชนิดของข้อความล่าสุด — UI ใช้แปลคำว่า "รูปภาพ"/"สติกเกอร์" เอง
   * (ห้ามให้ API เขียนคำไทยลง `lastMessagePreview` เพราะผู้ใช้ภาษาอังกฤษจะเห็นคำไทย · `REQ-INF-002`)
   */
  lastMessageType: ChatMessageType | null;
  /**
   * เวลาที่แถว thread เปลี่ยนล่าสุด (`chat_threads.updated_at`) — SV-ADR-038
   * event ของ realtime อาจมาถึงไม่ตรงลำดับ (คนละ replica) → client ใช้ค่านี้ไม่ให้สถานะเก่าทับสถานะใหม่
   */
  updatedAt: string | null;
  /**
   * `SV-CR-015` · SV-ADR-115 — เวลาข้อความขาเข้า**แรก**ที่ยังไม่ได้ตอบ (ตัวจับเวลาสถานะการตอบสนอง) · ตอบ/รับทราบแล้ว = `null`
   * สีคำนวณที่เว็บด้วย {@link chatResponseStatus} (เวลาเดินต่อเองโดยไม่ต้องมี event)
   */
  awaitingSince: string | null;
  /** การตอบสนองล่าสุด (ตอบข้อความจาก CMS / กดรับทราบ) · ยังไม่เคย = `null` */
  lastResponse: ChatLastResponse | null;
  /** แฟล็กของห้อง (id ใน settings `chat.flags` · SV-ADR-116) — id ที่ไม่อยู่ใน settings แล้ว = ถือว่าไม่มีแฟล็ก */
  flagId: string | null;
  /** เจ้าหน้าที่ผู้ดูแลห้อง (SV-ADR-117) · ไม่มี / ผู้ใช้ถูกลบ = `null` */
  assignee: ChatUserRef | null;
  assignedAt: string | null;
  /**
   * `SV-CR-019` §4 · SV-ADR-144 · `REQ-CHT-032` — เวลาล่าสุดที่ผู้บริจาค "เห็นห้อง" (`chat_threads.donor_seen_at`) แบบ**อนุมาน**:
   * ส่งข้อความเข้ามา (เวลาของ webhook event) หรือใช้หน้า LINE OA ที่ยืนยันตัวตนแล้ว (throttle 60 วินาที) · ไม่ถอยหลัง · ยังไม่เคย = `null`
   * เว็บแสดงป้าย "อ่านแล้ว" ที่ข้อความขาออกซึ่ง `sentAt ≤ donorSeenAt` — LINE ไม่มี read receipt ของข้อความที่ OA ส่ง
   * (คนละเรื่องกับ mark-as-read ทิศ OA → ผู้ใช้ของ SV-ADR-128) · เปลี่ยนจากหน้า LINE OA = event `SEEN`
   */
  donorSeenAt: string | null;
  /**
   * `SV-CR-017` §2 · SV-ADR-129 — ผู้บริจาค (ยังไม่ลบ) ที่ผูก LINE ของห้องนี้ · ยังไม่ผูก = `null`
   * join ตอนอ่าน (`donors.line_user_active` unique = 1:1) — ผูก/ยกเลิก/แก้ชื่อจากที่ไหนก็ได้ค่าล่าสุดเมื่อโหลดใหม่
   */
  donor: ChatThreadDonorRef | null;
}

/** ผู้บริจาคแบบย่อในรายชื่อห้อง (SV-ADR-129) — `fullName` `null` = สมัครเองแต่ยังไม่กรอกฟอร์ม (เว็บแสดง `donors.pendingName`) */
export interface ChatThreadDonorRef {
  id: string;
  /** รหัสผู้บริจาค (`donors.donor_code`) */
  code: string;
  fullName: string | null;
}

/** ผู้ใช้ระบบแบบย่อ (id · ชื่อ-นามสกุล) — ผู้ดูแลห้อง · ผู้ตอบสนองล่าสุด · รายชื่อที่มอบหมายได้ */
export interface ChatUserRef {
  id: string;
  name: string;
}

// ── สถานะการตอบสนอง · แฟล็ก · ผู้ดูแล (`SV-CR-015` · SV-ADR-115…117) ─────────────────

/** ชนิดการตอบสนอง — ตรงกับ `chat_threads.last_response_kind` */
export const ChatResponseKind = {
  /** ตอบข้อความจาก CMS */
  REPLY: 'REPLY',
  /** กด "รับทราบ" (ไม่ต้องตอบ เช่นลูกค้าส่งสติกเกอร์ขอบคุณ) */
  ACK: 'ACK',
} as const;
export type ChatResponseKind = (typeof ChatResponseKind)[keyof typeof ChatResponseKind];

export interface ChatLastResponse {
  kind: ChatResponseKind;
  at: string;
  /** ผู้ตอบสนอง · ผู้ใช้ถูกลบถาวร = `null` */
  by: ChatUserRef | null;
}

/**
 * สถานะการตอบสนอง 3 สี (SV-ADR-115) — `null` = ไม่มีสถานะ (ยังไม่มีข้อความขาเข้า/ยังไม่เคยตอบ) · ตัวกรอง `response=` ของ `GET /chat/threads` ใช้ค่าเดียวกัน
 */
export const ChatResponseStatus = {
  /** เขียว — ตอบแล้ว (ข้อความสุดท้ายจากฝั่งเรา) หรือกดรับทราบแล้ว */
  RESPONDED: 'RESPONDED',
  /** เหลือง — ลูกค้าส่งล่าสุด ยังไม่ตอบ ภายในเกณฑ์ (`chat.responseOverdueMinutes`) */
  WAITING: 'WAITING',
  /** แดง — รอเกินเกณฑ์ (แสดงเวลารอ) */
  OVERDUE: 'OVERDUE',
} as const;
export type ChatResponseStatus = (typeof ChatResponseStatus)[keyof typeof ChatResponseStatus];
export const CHAT_RESPONSE_STATUSES = [ChatResponseStatus.RESPONDED, ChatResponseStatus.WAITING, ChatResponseStatus.OVERDUE] as const;

/** สีของห้อง ณ เวลา `now` (ms) — เว็บเรียกซ้ำทุกนาที (`useNow`) · กติกาเดียวกับตัวกรองของ API */
export function chatResponseStatus(
  thread: Pick<ChatThreadListItemView, 'awaitingSince' | 'lastResponse'>,
  overdueMinutes: number,
  now: number,
): ChatResponseStatus | null {
  if (thread.awaitingSince) {
    const waited = now - Date.parse(thread.awaitingSince);
    return waited >= overdueMinutes * 60_000 ? ChatResponseStatus.OVERDUE : ChatResponseStatus.WAITING;
  }
  return thread.lastResponse ? ChatResponseStatus.RESPONDED : null;
}

/** เวลารอแยกหน่วย (ปัดลงเป็นนาที · ติดลบ = 0) — ป้ายย่อ: นาที (< 1 ชม.) → ชม. (< 1 วัน) → วัน */
export function chatWaitParts(ms: number): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

/** แท็บของช่องรายชื่อ — `scope` ของ `GET /chat/threads` */
export const ChatThreadScope = {
  ALL: 'all',
  /** ห้องที่ผู้ใช้ปัจจุบันเป็นผู้ดูแล */
  MINE: 'mine',
} as const;
export type ChatThreadScope = (typeof ChatThreadScope)[keyof typeof ChatThreadScope];
export const CHAT_THREAD_SCOPES = [ChatThreadScope.ALL, ChatThreadScope.MINE] as const;

/** ค่าในตัวกรอง `flag=` / `assignee=` ที่หมายถึง "ไม่มีแฟล็ก" / "ยังไม่มีผู้ดูแล" */
export const CHAT_FILTER_NONE = 'none';

/** ค่าในตัวกรอง `linked=` (SV-ADR-129) — ห้องที่ LINE ผูกกับผู้บริจาคแล้ว / ยังไม่ผูก · ส่งทั้งสองค่า = ทุกห้อง */
export const ChatThreadLinked = {
  YES: 'yes',
  NO: 'no',
} as const;
export type ChatThreadLinked = (typeof ChatThreadLinked)[keyof typeof ChatThreadLinked];
export const CHAT_THREAD_LINKED_VALUES = [ChatThreadLinked.YES, ChatThreadLinked.NO] as const;

/** แนบมากับผลของ `GET /chat/threads` (ไม่ขึ้นกับตัวกรอง) — ตัวเลขบนแท็บ "ของฉัน" */
export interface ChatThreadListSummary {
  mine: {
    total: number;
    /** สถานะ เหลือง + แดง */
    awaiting: number;
    /** มีข้อความยังไม่อ่าน */
    unread: number;
  };
}

/** `GET /chat/config` (`chat` READ_ONLY) — ค่าจาก ตั้งค่า → Chat ที่หน้า Chat ต้องใช้ (ไม่ต้องมีสิทธิ์ตั้งค่า) */
export interface ChatConfigView {
  responseStatus: {
    /** `chat.responseStatusEnabled` — ปิด = ซ่อนจุดสถานะ/ตัวกรองสถานะ/ปุ่มรับทราบ */
    enabled: boolean;
    /** `chat.responseOverdueMinutes` */
    overdueMinutes: number;
  };
  /** `chat.flags` (ผ่าน `readChatFlags` แล้ว) */
  flags: ChatFlag[];
  /** สีห้องแชท 4 ค่า (`chat.color*` ผ่าน `readChatAppearance` แล้ว — ค่าเสีย = ค่าเริ่มต้นของช่องนั้น · `SV-CR-017` §1 · SV-ADR-127) */
  appearance: ChatAppearance;
}

/** body ของ `PUT /chat/threads/:id/flag` — `null` = เอาแฟล็กออก */
export interface ChatThreadFlagInput {
  flagId: string | null;
}

/** body ของ `PUT /chat/threads/:id/assignee` — `null` = ยกเลิกการมอบหมาย · id ตัวเอง = รับดูแลเอง */
export interface ChatThreadAssigneeInput {
  userId: string | null;
}

/**
 * ข้อความชนิดนี้มีไฟล์ให้ดึงผ่าน `GET /chat/messages/:id/content` (`REQ-CHT-004`)
 * — API ใช้ตัดสินว่าจะยอม proxy ให้ไหม และ UI ใช้ตัดสินว่าจะโหลดรูปมาแสดงไหม **ต้องตรงกันเสมอ**
 */
export function hasChatMessageContent(type: ChatMessageType): boolean {
  return type === ChatMessageType.IMAGE || type === ChatMessageType.STICKER;
}

/** แอดมินผู้ส่งข้อความขาออก — `REQ-CHT-015` · SV-ADR-041 (ผู้ใช้ที่ถูกลบแบบ soft ยังแสดงชื่อ) */
export interface ChatMessageSender {
  id: string;
  name: string;
}

export interface ChatMessageView {
  id: string;
  threadId: string;
  direction: ChatMessageDirection;
  messageType: ChatMessageType;
  body: string | null;
  payload: Record<string, unknown> | null;
  sentAt: string;
  /** ข้อความขาออกจาก CMS = แอดมินผู้ส่ง · ขาเข้า / ไม่ทราบ (บัญชีถูกลบถาวร) = `null` */
  sentBy: ChatMessageSender | null;
  /**
   * ข้อความที่ระบบลงห้องให้หลัง Broadcast สำเร็จ (`REQ-CHT-030` · SV-ADR-135 · `chat_messages.broadcast_id`) — ขาออกเสมอ ·
   * ข้อความปกติ = `null` · `targetType` ใช้แสดงป้าย "Broadcast · ทุกคน / ตามกลุ่ม"
   */
  broadcast: ChatMessageBroadcastRef | null;
}

/** Broadcast ต้นทางของข้อความในห้อง — id ของ `chat_broadcasts` + เป้าหมาย (ประวัติเต็มดูที่ `GET /chat/broadcasts`) */
export interface ChatMessageBroadcastRef {
  id: string;
  targetType: ChatBroadcastTargetType;
}

export interface ChatThreadView extends ChatThreadListItemView {
  messages: ChatMessageView[];
}

/** LINE Messaging API จำกัดข้อความ text ที่ 5,000 UTF-16 code units — API (DTO) และกล่องพิมพ์ใช้ค่าเดียวกัน */
export const CHAT_MESSAGE_MAX_LENGTH = 5000;

/**
 * `clientMessageId` ที่หน้าเว็บสุ่มแนบมากับการส่ง — SV-ADR-041
 * ส่งซ้ำด้วยค่าเดิม (ลองใหม่หลังไม่แน่ใจว่าส่งถึงไหม) = API คืนข้อความเดิมโดยไม่ push ซ้ำถึงลูกค้า
 */
export const CHAT_CLIENT_MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// ── รูปแนบ (`SV-CR-020` §1 · `REQ-CHT-033/034` · SV-ADR-145 · `T-198`) ─────────────────────────────────────────────

/** รูปต่อการส่ง 1 ครั้ง — LINE push/broadcast/multicast รับ ≤ 5 message ต่อคำขอ = รูป 4 + ข้อความ 1 */
export const CHAT_IMAGE_MAX_PER_SEND = 4;
/** ไฟล์ที่อัปโหลด (ก่อนแปลง) ≤ 10 MB — เพดานของ LINE สำหรับ `originalContentUrl` (API แปลงเป็น JPEG ที่เล็กกว่านี้เสมอ) */
export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** ชนิดที่รับ (ตรวจจากเนื้อไฟล์ที่ API · `accept` ของ `<input type=file>`) */
export const CHAT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** ด้านยาวสุด (px) หลังแปลงเป็น JPEG — ต้นฉบับที่ LINE เปิดดู / พรีวิวในแชท LINE (≤ 1 MB เสมอ) */
export const CHAT_IMAGE_ORIGINAL_MAX_PX = 2048;
export const CHAT_IMAGE_PREVIEW_MAX_PX = 240;
/** route สาธารณะบน origin ของเว็บ (`app/chat-image/[token]/[variant]`) — token = สิทธิ์ (ไม่ต้อง login · LINE ดึงรูปเอง) */
export const CHAT_IMAGE_PATH = '/chat-image';
/** token สุ่ม 256 bit (hex ตัวเล็ก) */
export const CHAT_IMAGE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
export const ChatImageVariant = {
  ORIGINAL: 'original',
  PREVIEW: 'preview',
} as const;
export type ChatImageVariant = (typeof ChatImageVariant)[keyof typeof ChatImageVariant];
export const CHAT_IMAGE_VARIANTS = [ChatImageVariant.ORIGINAL, ChatImageVariant.PREVIEW] as const;

/** path ของรูปบน origin ของเว็บ (ไม่มี origin) — `/chat-image/<token>/<variant>` */
export function chatImagePath(token: string, variant: ChatImageVariant): string {
  return `${CHAT_IMAGE_PATH}/${token}/${variant}`;
}

/** `POST /chat/images` (multipart `file`) — รูปที่แปลงแล้ว · `previewUrl` = path พรีวิวบน origin ของเว็บ (`chatImagePath`) */
export interface ChatImageView {
  id: string;
  width: number;
  height: number;
  /** byte ของ JPEG ต้นฉบับหลังแปลง */
  size: number;
  previewUrl: string;
}

/** body ของ `POST /chat/threads/:id/messages` — ต้องมีข้อความหรือรูปอย่างน้อย 1 อย่าง */
export interface ChatSendMessageInput {
  text?: string;
  /** id จาก `POST /chat/images` ของผู้ส่งเอง (≤ `CHAT_IMAGE_MAX_PER_SEND` · ลำดับ = ลำดับที่ส่ง) */
  imageIds?: string[];
  clientMessageId?: string;
}

/** ผลของ `POST /chat/threads/:id/messages` — 1 แถวต่อ LINE message (รูปก่อน ข้อความท้าย · เรียงตาม id) */
export interface ChatSendResultView {
  messages: ChatMessageView[];
}

/**
 * แบบของการ์ด (ข้อความ `CARD` · `SV-CR-032` · SV-ADR-172) — ระบบฐานรู้จักแค่โครงการ์ด · ระบบลูกเพิ่มแบบได้
 * `ACCOUNT_LINK_INVITE` = ชวนเชื่อมบัญชี LINE กับข้อมูลผู้บริจาค (`POST /chat/threads/:id/link-invite`)
 */
export const ChatCardKind = {
  ACCOUNT_LINK_INVITE: 'ACCOUNT_LINK_INVITE',
} as const;
export type ChatCardKind = (typeof ChatCardKind)[keyof typeof ChatCardKind];

/**
 * การ์ดที่ render แล้ว (ตัวแปรแทนค่าแล้ว) — ตัวอย่างในหน้ายืนยันของ CMS และ `payload` ของข้อความ `CARD` ใช้โครงเดียวกัน ·
 * LINE ได้ Flex 1 bubble: `title` ตัวหนา · `body` · ปุ่ม `buttonLabel` เปิด `url` · `altText` = ข้อความแจ้งเตือน/ตัวอย่างในรายการแชท
 */
export interface ChatCardContent {
  altText: string;
  title: string;
  body: string;
  buttonLabel: string;
  url: string;
}

/** `chat_messages.payload` ของข้อความ `CARD` */
export interface ChatCardPayload extends ChatCardContent {
  card: string;
  clientMessageId?: string;
}

const CARD_TEXT_FIELDS = ['altText', 'title', 'body', 'buttonLabel', 'url'] as const;

/** payload ของข้อความ `CARD` — ชนิดอื่น/โครงไม่ครบ (ข้อมูลเก่า · แก้มือ) = `null` (UI แสดงแบบข้อความที่ยังไม่รองรับ) */
export function chatCardOf(message: Pick<ChatMessageView, 'messageType' | 'payload'>): ChatCardPayload | null {
  if (message.messageType !== ChatMessageType.CARD || !message.payload) return null;
  const payload = message.payload;
  if (typeof payload.card !== 'string') return null;
  for (const field of CARD_TEXT_FIELDS) if (typeof payload[field] !== 'string') return null;
  return payload as unknown as ChatCardPayload;
}

/** เหตุที่ไม่มีลิงก์เพิ่มเพื่อน — `NOT_CONFIGURED` = ยังไม่กรอก Basic ID · `INVALID` = รูปแบบผิด (ตั้งค่า → LINE) */
export const ChatAddFriendProblem = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INVALID: 'INVALID',
} as const;
export type ChatAddFriendProblem = (typeof ChatAddFriendProblem)[keyof typeof ChatAddFriendProblem];

/**
 * `GET /chat/add-friend?channel=` (`chat` READ_ONLY · `SV-CR-032` §3 · `REQ-CHT-037`) — LINE ID + ลิงก์เพิ่มเพื่อนของ OA จาก `line.<channel>.basicId` ·
 * หน้า Chat สร้าง QR ของ `url` เอง (`lib/qr-code.ts`) · ข้อมูลสาธารณะ (ผู้ใช้ทั่วไปค้น OA ด้วยค่าเดียวกัน)
 */
export interface ChatAddFriendView {
  channel: LineChannel;
  /** `@xxxx` เสมอ (ตั้งไว้ไม่มี `@` = เติมให้) · `null` = ยังไม่ตั้ง/รูปแบบผิด (`problem`) */
  basicId: string | null;
  /** `https://line.me/R/ti/p/%40xxxx` (รูปแบบเดียวกับช่องทางติดต่อ LINE `@id`) · `null` เมื่อ `basicId` เป็น `null` */
  url: string | null;
  problem: ChatAddFriendProblem | null;
}

/** Basic ID / Premium ID ของ LINE OA (ไม่รวม `@`) — ตัวอักษรชุดเดียวกับ LINE ID ของช่องทางติดต่อ */
const LINE_OA_ID = /^[A-Za-z0-9._-]{1,50}$/;

/** ค่าดิบของ `line.<channel>.basicId` → LINE ID + ลิงก์เพิ่มเพื่อน (`@` นำหน้ามี/ไม่มีก็ได้ · ช่องว่างหัวท้ายตัดทิ้ง) */
export function lineAddFriend(raw: string | null | undefined): Omit<ChatAddFriendView, 'channel'> {
  const id = (raw ?? '').trim().replace(/^@+/, '');
  if (!id) return { basicId: null, url: null, problem: ChatAddFriendProblem.NOT_CONFIGURED };
  if (!LINE_OA_ID.test(id)) return { basicId: null, url: null, problem: ChatAddFriendProblem.INVALID };
  const basicId = `@${id}`;
  return { basicId, url: `https://line.me/R/ti/p/${encodeURIComponent(basicId)}`, problem: null };
}

/** `GET /chat/threads/:id/messages` — ขนาดหน้าเริ่มต้น/สูงสุด (`REQ-CHT-013`) */
export const CHAT_MESSAGE_PAGE_DEFAULT = 50;
export const CHAT_MESSAGE_PAGE_MAX = 100;

/**
 * ผลของ `GET /chat/threads/:id/messages?before=|after=` (เรียงเก่า → ใหม่เสมอ)
 * `hasMore` = ยังมีข้อความถัดไปในทิศทางที่ขอ (before: เก่ากว่านี้ · after: ใหม่กว่านี้เกิน `limit`)
 */
export interface ChatMessagePageView {
  messages: ChatMessageView[];
  hasMore: boolean;
}

/** ยอดที่ยังไม่อ่าน — `GET /chat/unread` และแนบมากับทุก event ของ stream (`REQ-CHT-014`) */
export interface ChatUnreadCount {
  /** จำนวนคู่สนทนาที่มีข้อความยังไม่อ่าน (ตัวเลขบนเมนู Chat) */
  threads: number;
  /** ผลรวมข้อความที่ยังไม่อ่าน */
  messages: number;
}

export interface ChatUnreadSummary extends ChatUnreadCount {
  byChannel: Partial<Record<LineChannel, ChatUnreadCount>>;
}

// ── Realtime (SSE) — SV-ADR-038 · `REQ-CHT-010/011` ─────────────────────────────

/** path ของ stream ต่อท้าย `API_BASE_PATH` */
export const CHAT_STREAM_PATH = '/chat/stream';
/** API ส่ง comment `: ping` ทุกกี่วินาที — client ถือว่าสายตายเมื่อเงียบเกิน ~2.5 เท่า */
export const CHAT_STREAM_HEARTBEAT_SECONDS = 25;

/** ชื่อ event ใน `text/event-stream` (`event: <ชื่อ>`) */
export const ChatStreamEventName = {
  /** ส่งครั้งแรกหลังต่อสำเร็จ — client ใช้เป็นสัญญาณให้ดึงส่วนที่พลาดระหว่างหลุด */
  READY: 'ready',
  /** มีการเปลี่ยนแปลงของคู่สนทนา (ข้อความใหม่ · อ่านแล้ว · รับทราบ/แฟล็ก/ผู้ดูแล · ผู้บริจาคเห็นห้อง `SEEN`) */
  THREAD: 'thread',
  /** API กำลังปิดสาย — `data.reason` บอกว่าควรต่อใหม่แบบไหน */
  CLOSE: 'close',
  /**
   * Broadcast ลงห้องแชทแล้ว (`REQ-CHT-030` · SV-ADR-135) — **1 event ต่อ broadcast** (ไม่ยิงทีละห้อง) · ไม่มีข้อมูลห้อง/ยอดยังไม่อ่าน
   * (chat_threads ไม่เปลี่ยน) → หน้าที่เปิดห้องของ channel นั้นอยู่ดึงข้อความล่าสุดของห้องนั้นเอง
   */
  BROADCAST: 'broadcast',
} as const;
export type ChatStreamEventName = (typeof ChatStreamEventName)[keyof typeof ChatStreamEventName];

/** ชนิดการเปลี่ยนแปลง — ตรงกับคอลัมน์ `chat_events.kind` */
export const ChatEventKind = {
  /** ข้อความใหม่ (ขาเข้าจาก LINE หรือขาออกจาก CMS) — มี `message` */
  MESSAGE: 'MESSAGE',
  /** แอดมินเปิดอ่าน (unread → 0) */
  READ: 'READ',
  /** แอดมินเปลี่ยนสถานะห้อง — รับทราบ · แฟล็ก · ผู้ดูแล (`SV-CR-015`) */
  UPDATED: 'UPDATED',
  /**
   * ผู้บริจาคใช้หน้า LINE OA (LIFF) หลังข้อความขาออกล่าสุด → `thread.donorSeenAt` ขยับ (`REQ-CHT-032` · SV-ADR-144) — ไม่มี `message` ·
   * ไม่เรียงห้องใหม่/ไม่แทรกห้อง (เหมือน `READ`) · ข้อความขาเข้าจาก LINE ขยับค่าเดียวกันใน event `MESSAGE` ของข้อความนั้นอยู่แล้ว (ไม่ส่งตัวนี้ซ้ำ)
   */
  SEEN: 'SEEN',
  /** Broadcast ลงห้องแชทแล้ว (`0048` · `chat_events.thread_id` = NULL · `broadcast_id`) — ส่งเป็น SSE `broadcast` ไม่ใช่ `thread` */
  BROADCAST: 'BROADCAST',
} as const;
export type ChatEventKind = (typeof ChatEventKind)[keyof typeof ChatEventKind];
/** ชนิดที่ผูกกับห้องเดียว (SSE `thread`) */
export type ChatThreadEventKind = Exclude<ChatEventKind, typeof ChatEventKind.BROADCAST>;

export interface ChatStreamReadyData {
  serverTime: string;
  heartbeatSeconds: number;
  unread: ChatUnreadSummary;
  /** `db` = ส่งข้าม replica ผ่าน `chat_events` · `memory` = ยังไม่ได้ migrate `0003` (ส่งได้เฉพาะใน replica เดียวกัน) */
  delivery: 'db' | 'memory';
}

export interface ChatStreamThreadData {
  /** id ของแถว `chat_events` (`memory` = `null`) — ใช้กันการส่งซ้ำ */
  eventId: string | null;
  kind: ChatThreadEventKind;
  thread: ChatThreadListItemView;
  /** มีเมื่อ `kind = MESSAGE` และข้อความยังอยู่ */
  message: ChatMessageView | null;
  unread: ChatUnreadSummary;
  at: string;
}

/** SSE `broadcast` — Broadcast `broadcast.id` ลงห้องของ `broadcast.channel` แล้ว (ALL = ทุกห้อง · DONOR_GROUPS = เฉพาะห้องของผู้รับที่ LINE รับ) */
export interface ChatStreamBroadcastData {
  /** id ของแถว `chat_events` (`memory` = `null`) */
  eventId: string | null;
  kind: typeof ChatEventKind.BROADCAST;
  broadcast: ChatMessageBroadcastRef & { channel: LineChannel };
  at: string;
}

/** เหตุผลที่ API ปิด stream — SV-ADR-039 */
export const ChatStreamCloseReason = {
  /** access token ของสายนี้ครบอายุ → refresh (passive) แล้วต่อใหม่ */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  /** session ถูกหมุน token แล้ว (เบราว์เซอร์มี cookie ใหม่แล้ว) → ต่อใหม่ทันที */
  SESSION_ROTATED: 'SESSION_ROTATED',
  /** session จบ (idle · logout · เปลี่ยนรหัส · ผู้ใช้ถูกลบ) → ไม่ต่อใหม่ · ตรวจสถานะ session */
  SESSION_ENDED: 'SESSION_ENDED',
  /** สิทธิ์ `chat` ถูกถอน → ไม่ต่อใหม่ */
  FORBIDDEN: 'FORBIDDEN',
  /** API กำลังปิด/restart (deploy) → ต่อใหม่หลังหน่วงสั้น ๆ (ไปตัวที่เหลือ) */
  SERVER_SHUTDOWN: 'SERVER_SHUTDOWN',
  /** ผู้ใช้คนเดียวเปิดสายเกินเพดานต่อ replica → สายเก่าสุดถูกปิด · หน่วงนานก่อนต่อใหม่ */
  TOO_MANY_STREAMS: 'TOO_MANY_STREAMS',
  /** เบราว์เซอร์รับไม่ทัน (buffer ค้างเกินเพดาน) → ต่อใหม่แล้วดึงส่วนที่พลาด */
  SLOW_CONSUMER: 'SLOW_CONSUMER',
} as const;
export type ChatStreamCloseReason = (typeof ChatStreamCloseReason)[keyof typeof ChatStreamCloseReason];

export interface ChatStreamCloseData {
  reason: ChatStreamCloseReason;
}
