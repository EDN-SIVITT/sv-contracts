import { ChatMessageType, type ChatMessageDirection } from '../enums/chat';
import type { LineChannel } from '../enums/line';

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
  /** มีการเปลี่ยนแปลงของคู่สนทนา (ข้อความใหม่ · อ่านแล้ว) */
  THREAD: 'thread',
  /** API กำลังปิดสาย — `data.reason` บอกว่าควรต่อใหม่แบบไหน */
  CLOSE: 'close',
} as const;
export type ChatStreamEventName = (typeof ChatStreamEventName)[keyof typeof ChatStreamEventName];

/** ชนิดการเปลี่ยนแปลง — ตรงกับคอลัมน์ `chat_events.kind` */
export const ChatEventKind = {
  /** ข้อความใหม่ (ขาเข้าจาก LINE หรือขาออกจาก CMS) — มี `message` */
  MESSAGE: 'MESSAGE',
  /** แอดมินเปิดอ่าน (unread → 0) */
  READ: 'READ',
} as const;
export type ChatEventKind = (typeof ChatEventKind)[keyof typeof ChatEventKind];

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
  kind: ChatEventKind;
  thread: ChatThreadListItemView;
  /** มีเมื่อ `kind = MESSAGE` และข้อความยังอยู่ */
  message: ChatMessageView | null;
  unread: ChatUnreadSummary;
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
