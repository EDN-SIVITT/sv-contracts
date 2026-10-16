import { LineChannel, MessageTemplateKey } from '../enums/line';

/**
 * แม่แบบข้อความอัตโนมัติทุกตัวตาม F03.1 — `REQ-SET-010` [MUST]
 *
 * ตารางนี้เป็น **แหล่งความจริงเดียว** ของ "template ตัวนี้มีช่องอะไร ยาวได้เท่าไร ใส่ตัวแปรอะไรได้บ้าง"
 * ทั้ง 3 ฝั่งอ่านจากที่นี่ ห้ามเขียนซ้ำ:
 *   - API  → ตรวจ payload ตอนบันทึก (`PATCH /message-templates/:key`) และตรวจซ้ำก่อนส่งเข้า LINE
 *   - CMS  → สร้างช่องกรอกในหน้า "ข้อความอัตโนมัติ" โดยไม่ต้องรู้จัก template เป็นราย ๆ
 *   - seed → migration ใส่ค่าเริ่มต้นตามช่องชุดเดียวกัน
 *
 * เพิ่ม template ใหม่ = เพิ่ม key ใน `MessageTemplateKey` + แถวที่นี่ + seed ใน migration
 * **ไม่ต้องแก้หน้าเว็บ** (หน้าแก้ข้อความวนจากตารางนี้)
 */

/** ชนิดช่องกรอก — คุมแค่รูปแบบ input ฝั่ง CMS ไม่ได้เปลี่ยนวิธีเก็บ (ทุกช่องเก็บเป็น string) */
export const MessageTemplateFieldKind = {
  /** ข้อความยาวหลายบรรทัด → textarea */
  TEXT: 'TEXT',
  /** ข้อความบรรทัดเดียว (หัวข้อ/label/ปุ่ม) → input */
  LINE: 'LINE',
} as const;
export type MessageTemplateFieldKind =
  (typeof MessageTemplateFieldKind)[keyof typeof MessageTemplateFieldKind];

export interface MessageTemplateFieldSpec {
  /** ชื่อ property ใน JSON `content` — ใช้เป็นส่วนท้ายของคีย์ i18n ด้วย */
  name: string;
  kind: MessageTemplateFieldKind;
  /** เพดานความยาวตามข้อจำกัดจริงของ LINE Messaging API (ดูหมายเหตุแต่ละค่าด้านล่าง) */
  maxLength: number;
  /**
   * ตัวแปรที่พิมพ์ในช่องนี้ได้ เขียนในรูป `{name}` — ช่องที่ไม่ประกาศไว้ใส่ตัวแปรไม่ได้เลย
   * ผู้ใช้จะลบตัวแปรออกก็ได้ (ไม่บังคับให้มีครบ) แต่ตัวแปรที่ระบบไม่รู้จักต้องถูกปฏิเสธตอนบันทึก
   * ไม่งั้นข้อความจะไปโผล่เป็น `{foo}` ดิบ ๆ ในแชตของผู้รับ
   */
  placeholders?: readonly string[];
  /**
   * true = เว้นว่างได้ และ "ว่าง" แปลว่าระบบไม่ส่งข้อความนั้น (SV-ADR-014 · `Q-008`)
   * ไม่ระบุ = ช่องบังคับ (พฤติกรรมเดิมของ HST — ทุกช่องต้องกรอก)
   */
  optional?: boolean;
}

export interface MessageTemplateDefinition {
  key: MessageTemplateKey;
  /**
   * OA ที่ใช้ส่งข้อความนี้ — คอลัมน์ `message_templates.channel` เก็บ "ช่องทางหลัก" = ตัวแรกของ array นี้
   * ตอนนี้ทุกแม่แบบมีช่องทางเดียว · array ยังคงไว้เผื่อแม่แบบหลายช่องทางในอนาคต
   */
  channels: readonly LineChannel[];
  /** true = ส่งเป็น Flex Message → ต้องมีช่อง `altText` เสมอ */
  flex: boolean;
  fields: readonly MessageTemplateFieldSpec[];
}

/** เพดานความยาวของ LINE — ประกาศเป็นค่าคงที่เพื่อไม่ให้ตัวเลขกระจายอยู่ในหลายไฟล์ */
export const LINE_TEXT_MAX = 5_000;
/** `altText` ของ Flex/Template message ยาวได้ 400 ตัวอักษร ยาวกว่านี้ LINE ปฏิเสธทั้งชุด */
export const LINE_ALT_TEXT_MAX = 400;
/** label ของปุ่ม (action.label) ยาวได้ 20 ตัวอักษร */
export const LINE_BUTTON_LABEL_MAX = 20;

const text = (
  name: string,
  maxLength: number,
  placeholders?: readonly string[],
): MessageTemplateFieldSpec => ({
  name,
  kind: MessageTemplateFieldKind.TEXT,
  maxLength,
  ...(placeholders ? { placeholders } : {}),
});

export const MESSAGE_TEMPLATE_DEFINITIONS: readonly MessageTemplateDefinition[] = [
  {
    // SV-ADR-014 (`Q-008`) — ส่งเป็น reply เมื่อมีคนเพิ่ม OA เป็นเพื่อน · body ว่าง = ไม่ส่ง
    key: MessageTemplateKey.WELCOME,
    channels: [LineChannel.MAIN],
    flex: false,
    fields: [{ ...text('body', LINE_TEXT_MAX), optional: true }],
  },
];

export function messageTemplateDefinition(
  key: MessageTemplateKey,
): MessageTemplateDefinition | undefined {
  return MESSAGE_TEMPLATE_DEFINITIONS.find((definition) => definition.key === key);
}

/** ช่องทางหลักที่เก็บลงคอลัมน์ `channel` — ตัวแรกของ `channels` */
export function messageTemplatePrimaryChannel(definition: MessageTemplateDefinition): LineChannel {
  return definition.channels[0];
}

/** เหตุผลที่ content ใช้ไม่ได้ — ฝั่งเว็บแปลเป็นข้อความผ่าน i18n เอง ห้ามส่งประโยคดิบกลับไป */
export const MessageTemplateFieldError = {
  /** ไม่ได้ส่งช่องนี้มา หรือส่งมาเป็นค่าว่าง — ช่องที่ไม่ได้ประกาศ `optional` เป็นช่องบังคับ */
  REQUIRED: 'REQUIRED',
  /** ยาวเกิน `maxLength` */
  TOO_LONG: 'TOO_LONG',
  /** มี `{ตัวแปร}` ที่ระบบไม่รู้จักในช่องนี้ */
  UNKNOWN_PLACEHOLDER: 'UNKNOWN_PLACEHOLDER',
  /** ส่งช่องที่ template นี้ไม่มีมาด้วย */
  UNKNOWN_FIELD: 'UNKNOWN_FIELD',
} as const;
export type MessageTemplateFieldError =
  (typeof MessageTemplateFieldError)[keyof typeof MessageTemplateFieldError];

export interface MessageTemplateFieldIssue {
  field: string;
  error: MessageTemplateFieldError;
  /** ใส่มาเฉพาะ `TOO_LONG` (เพดาน) และ `UNKNOWN_PLACEHOLDER` (ชื่อตัวแปรตัวแรกที่ผิด) */
  detail?: string | number;
}

const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;

/**
 * ตรวจ `content` ของ template หนึ่งตัวให้ครบทุกช่อง — **ใช้ตัวนี้ตัวเดียวทั้งตอนบันทึกและตอนจะส่ง**
 * คืน array ว่าง = ใช้ได้ · ไม่ throw เพื่อให้ฝั่ง API เลือก error code เองได้
 */
export function validateMessageTemplateContent(
  definition: MessageTemplateDefinition,
  content: unknown,
): MessageTemplateFieldIssue[] {
  const issues: MessageTemplateFieldIssue[] = [];
  const record: Record<string, unknown> =
    typeof content === 'object' && content !== null ? (content as Record<string, unknown>) : {};

  for (const spec of definition.fields) {
    const value = record[spec.name];
    const blank = value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
    if (blank && spec.optional) continue;
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({ field: spec.name, error: MessageTemplateFieldError.REQUIRED });
      continue;
    }
    if (value.length > spec.maxLength) {
      issues.push({
        field: spec.name,
        error: MessageTemplateFieldError.TOO_LONG,
        detail: spec.maxLength,
      });
      continue;
    }
    const allowed = spec.placeholders ?? [];
    for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
      const token = match[1].trim();
      if (!allowed.includes(token)) {
        issues.push({
          field: spec.name,
          error: MessageTemplateFieldError.UNKNOWN_PLACEHOLDER,
          detail: match[0],
        });
        break;
      }
    }
  }

  const known = new Set(definition.fields.map((spec) => spec.name));
  for (const name of Object.keys(record)) {
    if (!known.has(name)) {
      issues.push({ field: name, error: MessageTemplateFieldError.UNKNOWN_FIELD });
    }
  }

  return issues;
}

/**
 * แทน `{ตัวแปร}` ด้วยค่าจริง — ตัวแปรที่ไม่มีค่าให้กลายเป็นค่าว่าง ไม่ใช่ปล่อย `{foo}` ค้างไว้
 * ใช้ตอนประกอบข้อความก่อนยิง Messaging API
 */
export function renderMessageTemplateField(
  value: string,
  values: Readonly<Record<string, string | null | undefined>>,
): string {
  return value.replace(PLACEHOLDER_PATTERN, (_, name: string) => values[name.trim()] ?? '');
}

/** รูปแบบที่ API ส่งให้หน้า "ข้อความอัตโนมัติ" — `content` ผ่าน validate มาแล้วเสมอ */
export interface MessageTemplateView {
  key: MessageTemplateKey;
  channels: readonly LineChannel[];
  flex: boolean;
  fields: readonly MessageTemplateFieldSpec[];
  content: Record<string, string>;
  /** null = ยังไม่มีแถวใน DB (ยังไม่ได้รัน migration seed) → หน้าเว็บเตือนว่าต้องรัน migration */
  updatedAt: string | null;
  /** มีค่าเมื่อ content ใน DB ใช้ไม่ได้ — หน้าเว็บเตือนให้แก้ก่อนระบบจะส่งข้อความนั้นได้ */
  issues: MessageTemplateFieldIssue[];
}
