import { SettingKey } from './settings';

/**
 * สีเลขที่ออเดอร์ / เลขที่รายการบริจาค (SV-ADR-078 · `T-115` · `REQ-SET-051`) — ให้ผู้ใช้แยก 2 ชนิดเลขที่ออกด้วยสีทุกจุดของเมนูออเดอร์ /
 * รายการบริจาค / หน้าผู้บริจาค · ตั้งค่าได้ใน ตั้งค่า → ออเดอร์ (`order.noColor`) และ ตั้งค่า → รายการบริจาค (`donation.noColor`) · `#RRGGBB` ตาม `SETTING_STRING_RULES`
 * อ่านผ่าน `GET /orders/ref-no-colors` (สิทธิ์ออเดอร์ READ_ONLY) หรือ `GET /donations/ref-no-colors` (สิทธิ์รายการบริจาค READ_ONLY) — คำตอบเหมือนกัน ·
 * ค่าเสีย/ว่าง/ไม่มีแถว = ค่าเริ่มต้น · หน้าเว็บ: เลขที่หลักของแถว/หัวการ์ด = โทนหลัก · เลขอ้างอิงของอีกชนิด = โทนรอง (จางกว่า)
 */
export const REF_NO_KINDS = ['order', 'donation'] as const;
export type RefNoKind = (typeof REF_NO_KINDS)[number];

/** response ของ `GET /orders/ref-no-colors` · `GET /donations/ref-no-colors` — `#RRGGBB` ตัวพิมพ์ใหญ่ครบทั้ง 2 ชนิด */
export type RefNoColors = Record<RefNoKind, string>;

/** ชนิดเลขที่ → setting key (หมวด `order` / `donation` ของแต่ละเมนู) */
export const REF_NO_COLOR_KEYS: Readonly<Record<RefNoKind, SettingKey>> = {
  order: SettingKey.ORDER_NO_COLOR,
  donation: SettingKey.DONATION_NO_COLOR,
};

/**
 * ค่าเริ่มต้น (= seed `0025`) — ใช้เมื่อแถวหาย/ค่าเสีย · หน้าเว็บที่ผู้ใช้ไม่มีสิทธิ์ทั้ง 2 เมนู · ปุ่ม "คืนค่าเริ่มต้น"
 * ออเดอร์ = สีแบรนด์เดิม (หน้าตาเดิมไม่เปลี่ยน) · รายการบริจาค = teal (ไม่ชนสีสถานะเริ่มต้นใดของออเดอร์/รายการบริจาค)
 */
export const REF_NO_COLOR_DEFAULTS: Readonly<RefNoColors> = {
  order: '#2563EB',
  donation: '#0F766E',
};
