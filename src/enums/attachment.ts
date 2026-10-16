/**
 * ที่เก็บไฟล์ (StorageService · S3) — TEC-04 §4.4 · REQ-NFR-004 · SV-ADR-013
 * SV-BASE ตัดระบบไฟล์แนบของ HST แต่คง StorageService ไว้ให้ระบบลูก — ค่าคงที่ที่ storage ยังใช้อยู่ที่นี่
 */

/**
 * ที่เก็บไฟล์จริง — เก็บลงแถวเพื่อให้รู้ว่าไฟล์เก่าอยู่ที่ไหนหลังย้ายจาก dev ขึ้น production
 * `LOCAL` ใช้ได้เฉพาะ development/test เท่านั้น (ADR-027 — กติกาเดียวกับ mail mock ใน ADR-019)
 */
export const StorageDriver = {
  S3: 'S3',
  LOCAL: 'LOCAL',
} as const;
export type StorageDriver = (typeof StorageDriver)[keyof typeof StorageDriver];

/** นามสกุลที่ยอมให้ตั้งชื่อไฟล์ที่เก็บ — กัน path traversal และไฟล์ที่ execute ได้ */
export const ATTACHMENT_MIME_EXTENSION: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

