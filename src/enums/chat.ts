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
  /**
   * การ์ด (LINE Flex) ที่ระบบส่งจาก CMS — ขาออกเท่านั้น (`SV-CR-032` · SV-ADR-172) · `body` = altText · `payload` = `ChatCardPayload` (การ์ดที่ส่งจริง)
   * ตอนนี้มีแบบเดียว: ชวนเชื่อมบัญชี (`ChatCardKind.ACCOUNT_LINK_INVITE`)
   */
  CARD: 'CARD',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ChatMessageType = (typeof ChatMessageType)[keyof typeof ChatMessageType];
