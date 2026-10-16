/** ทิศทางข้อความในบทสนทนา LINE OA — FT-10 */
export const ChatMessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;
export type ChatMessageDirection = (typeof ChatMessageDirection)[keyof typeof ChatMessageDirection];

/** ชนิดข้อความขั้นต่ำที่ UI Chat ต้องแสดงได้ (`REQ-CHT-004`) */
export const ChatMessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  STICKER: 'STICKER',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ChatMessageType = (typeof ChatMessageType)[keyof typeof ChatMessageType];
