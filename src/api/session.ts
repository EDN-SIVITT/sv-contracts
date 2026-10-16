/**
 * คำขอ "เบื้องหลัง" ที่ไม่นับเป็นการใช้งาน — `REQ-AUTH-015` · SV-ADR-039
 *
 * idle timeout (`REQ-AUTH-012`) ตัดตาม `refresh_tokens.last_activity_at` ที่ guard ขยับทุกคำขอ
 * ถ้าการโหลดที่หน้าเว็บทำเอง (stream realtime · ดึงส่วนที่พลาดหลังต่อใหม่) ขยับด้วย = เปิดหน้าทิ้งไว้แล้วไม่มีวัน idle
 *
 * - header นี้มีผลกับ **GET/HEAD เท่านั้น** — การเขียนทุกครั้งยังนับเป็นการใช้งานเสมอ
 * - ทำได้แค่ "ไม่ยืดเวลาให้ตัวเอง" จึงไม่ลดความปลอดภัย (ยังตรวจ session/สิทธิ์ครบทุกคำขอ)
 */
export const SESSION_PASSIVE_HEADER = 'X-Session-Passive';
export const SESSION_PASSIVE_HEADER_VALUE = '1';

/** body (ไม่บังคับ) ของ `POST /auth/refresh` — `passive: true` = หมุน token โดยคง `last_activity_at` เดิม */
export interface RefreshSessionRequest {
  passive?: boolean;
}
