import { readableTextOn } from './color-contrast';
import {
  CHAT_LINE_READ_RECEIPT_MODES,
  ChatLineReadReceiptMode,
  countChars,
  MAX_CODE_POINTS_PER_CHAR,
  normalizeSettingString,
  settingStringProblem,
  SettingKey,
} from './settings';

/**
 * ค่าตั้งค่ากลุ่ม `chat` (ตั้งค่า → Chat · `SV-CR-015` · SV-ADR-115/116) — **แหล่งความจริงเดียว** ของ API (ตรวจตอนบันทึก/อ่าน) และหน้าเว็บ (ตัวแก้ + หน้า Chat)
 * key อยู่ใน `SettingKey.CHAT_*` (`./settings.ts`) · แถวใน DB มาจาก `0038` · `0039` (ห้องต่อหน้า) · `0043` (สีห้องแชท · โหมด "อ่านแล้ว")
 */

/** `chat.responseStatusEnabled` เมื่อยังไม่มีแถว (ยังไม่รัน `0038`) */
export const CHAT_RESPONSE_STATUS_DEFAULT_ENABLED = true;
/** `chat.responseOverdueMinutes` — เกินเท่านี้ = แดง (ช่วง `SETTING_NUMBER_BOUNDS`: 1–1440) */
export const CHAT_RESPONSE_OVERDUE_DEFAULT_MINUTES = 5;
/** `chat.lineReadReceiptMode` เมื่อยังไม่มีแถว (ยังไม่รัน `0043`) / ค่าเสีย — ขึ้น "อ่านแล้ว" ทันที (SV-ADR-128) */
export const CHAT_LINE_READ_RECEIPT_DEFAULT_MODE: ChatLineReadReceiptMode = ChatLineReadReceiptMode.IMMEDIATE;
/** `chat.threadsPerPage` — ห้องต่อหน้าของช่องรายชื่อเมื่อยังไม่มีแถว/ค่าเสีย (`SV-CR-016` §2 · ต้องอยู่ใน `PAGINATION_OPTIONS`) */
export const CHAT_THREADS_PER_PAGE_DEFAULT = 50;

/** แฟล็ก 1 ตัว — `color` = `#RRGGBB` (ตัวพิมพ์ใหญ่) · `label.en` ว่าง = ใช้ `label.th` */
export interface ChatFlag {
  id: string;
  color: string;
  label: { th: string; en: string };
}

export const CHAT_FLAG_MAX = 10;
export const CHAT_FLAG_ID_PATTERN = /^[a-z0-9-]{1,20}$/;
export const CHAT_FLAG_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
export const CHAT_FLAG_LABEL_MAX_CHARS = 30;

/** ค่าเริ่มต้น 3 สี (เจ้าของ #1.3) — สีไม่ชนกับจุดสถานะการตอบสนอง (เขียว/เหลือง) · แดง = ด่วน (ธงคนละรูปทรงกับจุด) */
export const CHAT_FLAG_DEFAULTS: readonly ChatFlag[] = [
  { id: 'urgent', color: '#DC2626', label: { th: 'ด่วน', en: 'Urgent' } },
  { id: 'follow-up', color: '#2563EB', label: { th: 'ติดตามต่อ', en: 'Follow up' } },
  { id: 'key-donor', color: '#9333EA', label: { th: 'ผู้บริจาคคนสำคัญ', en: 'Key donor' } },
];

export type ChatFlagProblem =
  | 'NOT_ARRAY'
  | 'TOO_MANY'
  | 'INVALID_ITEM'
  | 'INVALID_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_COLOR'
  | 'LABEL_REQUIRED'
  | 'LABEL_TOO_LONG'
  | 'LABEL_INVALID_CHARACTERS';

export type ChatFlagsResult =
  | { ok: true; flags: ChatFlag[] }
  | { ok: false; problem: ChatFlagProblem; index: number | null; field: 'id' | 'color' | 'label.th' | 'label.en' | null };

// อักขระควบคุม (ยกเว้นไม่มี — ป้ายบรรทัดเดียว) · zero-width/bidi override กันป้ายหลอกตา
const LABEL_FORBIDDEN = /[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/u;

function checkLabel(value: unknown, required: boolean): ChatFlagProblem | null | { value: string } {
  if (value === undefined || value === null) return required ? 'LABEL_REQUIRED' : { value: '' };
  if (typeof value !== 'string') return 'INVALID_ITEM';
  const trimmed = value.trim();
  if (!trimmed) return required ? 'LABEL_REQUIRED' : { value: '' };
  if (LABEL_FORBIDDEN.test(trimmed)) return 'LABEL_INVALID_CHARACTERS';
  if (countChars(trimmed) > CHAT_FLAG_LABEL_MAX_CHARS || [...trimmed].length > CHAT_FLAG_LABEL_MAX_CHARS * MAX_CODE_POINTS_PER_CHAR) {
    return 'LABEL_TOO_LONG';
  }
  return { value: trimmed };
}

/**
 * ตรวจ + ทำให้เป็นรูปมาตรฐาน (trim ป้าย · สีตัวพิมพ์ใหญ่) — API เรียกใน `SettingsService.update()` ของ `chat.flags` (ไม่ผ่าน = 422) · เว็บเรียกก่อนกดบันทึก
 * ว่างได้ (`[]` = ไม่มีแฟล็กให้เลือก)
 */
export function validateChatFlags(value: unknown): ChatFlagsResult {
  if (!Array.isArray(value)) return { ok: false, problem: 'NOT_ARRAY', index: null, field: null };
  if (value.length > CHAT_FLAG_MAX) return { ok: false, problem: 'TOO_MANY', index: null, field: null };
  const flags: ChatFlag[] = [];
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, problem: 'INVALID_ITEM', index, field: null };
    const raw = item as { id?: unknown; color?: unknown; label?: unknown };
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    // `none` สงวนไว้ให้ตัวกรอง "ไม่มีแฟล็ก" (`CHAT_FILTER_NONE` ของ `GET /chat/threads?flag=`)
    if (!CHAT_FLAG_ID_PATTERN.test(id) || id === 'none') return { ok: false, problem: 'INVALID_ID', index, field: 'id' };
    if (seen.has(id)) return { ok: false, problem: 'DUPLICATE_ID', index, field: 'id' };
    seen.add(id);
    const color = typeof raw.color === 'string' ? raw.color.trim() : '';
    if (!CHAT_FLAG_COLOR_PATTERN.test(color)) return { ok: false, problem: 'INVALID_COLOR', index, field: 'color' };
    const label = raw.label && typeof raw.label === 'object' && !Array.isArray(raw.label) ? (raw.label as { th?: unknown; en?: unknown }) : null;
    if (!label) return { ok: false, problem: 'LABEL_REQUIRED', index, field: 'label.th' };
    const th = checkLabel(label.th, true);
    if (typeof th === 'string' || th === null) return { ok: false, problem: th ?? 'INVALID_ITEM', index, field: 'label.th' };
    const en = checkLabel(label.en, false);
    if (typeof en === 'string' || en === null) return { ok: false, problem: en ?? 'INVALID_ITEM', index, field: 'label.en' };
    flags.push({ id, color: color.toUpperCase(), label: { th: th.value, en: en.value } });
  }
  return { ok: true, flags };
}

/** อ่านค่าที่เก็บไว้แบบไม่ throw — ยังไม่มีแถว (`undefined`) = ค่าเริ่มต้น · ค่าเสีย = `[]` (ไม่เดาแฟล็กให้) */
export function readChatFlags(value: unknown): ChatFlag[] {
  if (value === undefined) return CHAT_FLAG_DEFAULTS.map((flag) => ({ ...flag, label: { ...flag.label } }));
  const result = validateChatFlags(value);
  return result.ok ? result.flags : [];
}

/** ป้ายตามภาษาของผู้ใช้ (`en` ว่าง = ใช้ `th`) */
export function chatFlagLabel(flag: ChatFlag, locale: string): string {
  return locale === 'en' && flag.label.en ? flag.label.en : flag.label.th;
}

/** อ่าน `chat.lineReadReceiptMode` แบบไม่ throw — ไม่มีแถว/ค่านอกชุด (แก้ตรง DB) = `CHAT_LINE_READ_RECEIPT_DEFAULT_MODE` */
export function readChatLineReadReceiptMode(value: unknown): ChatLineReadReceiptMode {
  return typeof value === 'string' && (CHAT_LINE_READ_RECEIPT_MODES as readonly string[]).includes(value)
    ? (value as ChatLineReadReceiptMode)
    : CHAT_LINE_READ_RECEIPT_DEFAULT_MODE;
}

/**
 * สีห้องแชท (`SV-CR-017` §1 · SV-ADR-127) — `#RRGGBB` ตัวพิมพ์ใหญ่ · ใช้เฉพาะช่องสนทนา (ช่อง 2) ของหน้า Chat
 * - `text` — ตัวอักษรในบับเบิลทั้ง 2 ฝั่ง · `donorBubble` — บับเบิลขาเข้า (ผู้บริจาค) · `staffBubble` — บับเบิลขาออก (เจ้าหน้าที่) · `boardBackground` — พื้นกระดาน
 * รูป/สติกเกอร์ไม่มีพื้นบับเบิล · ข้อความที่วางบนกระดานตรง ๆ (เวลา · ชื่อผู้ตอบ · ตัวคั่นวันที่ ฯลฯ) ใช้ `chatBoardInk(boardBackground)`
 */
export interface ChatAppearance {
  text: string;
  donorBubble: string;
  staffBubble: string;
  boardBackground: string;
}
export type ChatAppearanceField = keyof ChatAppearance;

/** ลำดับช่องในการ์ดตั้งค่า "สีห้องแชท" */
export const CHAT_APPEARANCE_FIELDS: readonly ChatAppearanceField[] = ['boardBackground', 'donorBubble', 'staffBubble', 'text'];

/** ช่อง → setting key (ตรวจด้วย `settingStringProblem` · `HEX_COLOR_RULE` ตัวเดียวกับ API) */
export const CHAT_APPEARANCE_KEYS: Readonly<Record<ChatAppearanceField, string>> = {
  text: SettingKey.CHAT_COLOR_TEXT,
  donorBubble: SettingKey.CHAT_COLOR_DONOR_BUBBLE,
  staffBubble: SettingKey.CHAT_COLOR_STAFF_BUBBLE,
  boardBackground: SettingKey.CHAT_COLOR_BOARD_BACKGROUND,
};

/**
 * ค่าเริ่มต้นแบบแอป LINE (ประมาณจากแอป — LINE ไม่ประกาศค่าทางการ · Q-124) — ปุ่ม "คืนค่าแบบ LINE" · ค่าเสีย/ไม่มีแถว · seed ของ `0043` ต้องตรงกับชุดนี้
 */
export const CHAT_APPEARANCE_DEFAULTS: Readonly<ChatAppearance> = {
  text: '#111111',
  donorBubble: '#F2F3F5',
  staffBubble: '#8DE055',
  boardBackground: '#B7CCE9',
};

/** อ่านค่าที่เก็บไว้รายช่องแบบไม่ throw — ไม่มี/ไม่ใช่ข้อความ/ผิด `#RRGGBB` = ค่าเริ่มต้นของช่องนั้น · คืนตัวพิมพ์ใหญ่เสมอ */
export function readChatAppearance(raw: Partial<Record<ChatAppearanceField, unknown>>): ChatAppearance {
  const appearance = { ...CHAT_APPEARANCE_DEFAULTS };
  for (const field of CHAT_APPEARANCE_FIELDS) {
    const key = CHAT_APPEARANCE_KEYS[field];
    const value = raw[field];
    const normalized = typeof value === 'string' ? normalizeSettingString(key, value) : '';
    if (settingStringProblem(key, normalized) === null) appearance[field] = normalized.toUpperCase();
  }
  return appearance;
}

/** สีตัวอักษรที่ลองก่อนบนกระดาน — เทาเข้ม (พื้นสว่าง) → เทาอ่อน (พื้นเข้ม) · ไม่ผ่านทั้งคู่ = ดำ/ขาว (`readableTextOn`) */
export const CHAT_BOARD_INK_CANDIDATES: readonly string[] = ['#374151', '#E5E7EB'];

/** สีของข้อความ/ชิ้นส่วนที่วางบนพื้นกระดานตรง ๆ (เวลา · ชื่อผู้ตอบ · ตัวคั่นวันที่ · สถานะกำลังส่ง ฯลฯ) — contrast ≥ 4.5:1 กับพื้นเสมอ */
export function chatBoardInk(boardBackground: string): string {
  return readableTextOn(boardBackground, CHAT_BOARD_INK_CANDIDATES);
}
