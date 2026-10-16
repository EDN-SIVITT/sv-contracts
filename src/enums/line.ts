/**
 * LINE OA ที่ระบบรับ-ส่งข้อความ — SV-ADR-006 (`Q-001` · `Q-007`) · เริ่มต้น 1 channel (`MAIN`)
 * ค่าใน enum นี้ใช้เป็น path param ของ webhook ด้วย: /api/v1/webhooks/line/:channel (ตัวพิมพ์เล็ก)
 * และเป็น prefix ของ settings `line.<channel>.*` — เพิ่ม channel ตามสูตรใน `docs/40-technical/11-extend-recipes.md`
 */
export const LineChannel = {
  /** LINE OA หลักของระบบ — ป้าย "LINE OA" (`Q-007`) */
  MAIN: 'MAIN',
} as const;
export type LineChannel = (typeof LineChannel)[keyof typeof LineChannel];

export const LINE_CHANNELS = [LineChannel.MAIN] as const;

/** key ข้อความอัตโนมัติที่ implement แล้ว — ห้ามพิมพ์ string ซ้ำใน service (SV-ADR-014) */
export const MessageTemplateKey = {
  /** ข้อความต้อนรับเมื่อผู้ใช้เพิ่ม OA เป็นเพื่อน (event `follow`) — ข้อความล้วน (`Q-008`) */
  WELCOME: 'welcome',
} as const;
export type MessageTemplateKey = (typeof MessageTemplateKey)[keyof typeof MessageTemplateKey];

/** แปลง path param เป็น channel กลาง โดยรับตัวพิมพ์เล็ก/ใหญ่และปฏิเสธค่าอื่น */
export function lineChannelFromPath(value: string): LineChannel | null {
  return (
    LINE_CHANNELS.find((channel) => channel.toLowerCase() === value.trim().toLowerCase()) ?? null
  );
}

/**
 * path ของ webhook ต่อ channel (ต่อท้าย base URL ของ API) — TEC-05 §5.3 · REQ-LIF-040
 * หน้าตั้งค่าเอาไปประกอบเป็น URL เต็มให้ผู้ดูแลระบบ copy ไปใส่ใน LINE Developer Console (REQ-SET-004)
 */
export function lineWebhookPath(channel: LineChannel): string {
  return `/webhooks/line/${channel.toLowerCase()}`;
}
