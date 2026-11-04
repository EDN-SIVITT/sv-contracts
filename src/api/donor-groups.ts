import type { DonationActorView } from './donations';
import type { DonorLineStatus, DonorStatus } from './donors';
import type { ApiListResponse } from './response';

/**
 * กลุ่มผู้บริจาค (e-Donation) — `SV-CR-016` §4 · FT-21 `REQ-DGR-*` · SV-ADR-121/122 · `T-173` (API) · `T-174` (เว็บ)
 * ผู้บริจาค 1 คน = 1 กลุ่ม (`donors.donor_group_id` · NULL = ไม่มีกลุ่ม) · มีกลุ่ม default ได้ 0–1 กลุ่ม (unique generated `default_key`)
 * enum / view / ตัวช่วยที่ API (`/donor-groups` · `/donors/group-options`) และหน้าเว็บใช้ร่วมกัน — ห้ามประกาศซ้ำฝั่งใดฝั่งหนึ่ง
 */

/** ความยาวสูงสุดของช่องกรอก — ตรงกับคอลัมน์ใน `0040_donor_groups.sql` (DOM-04) */
export const DONOR_GROUP_NAME_MAX_LENGTH = 100;
export const DONOR_GROUP_DESCRIPTION_MAX_LENGTH = 500;

/** สี `#RRGGBB` (รับตัวเล็ก/ใหญ่ · เก็บตัวใหญ่ด้วย `normalizeDonorGroupColor`) */
export const DONOR_GROUP_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * ชุดสีเริ่มต้นของฟอร์ม (โทน 600 — ตัดกับพื้นขาวและพื้นมืดได้ · ตัวอักษรขาวบน chip อ่านออก) · เลือกสีอื่นเองได้ตาม `DONOR_GROUP_COLOR_PATTERN`
 * ฟอร์มสร้างใหม่เลือกสีแรกที่ยังไม่มีกลุ่มใช้ (ครบแล้ว = สีแรก) — ไม่มีผลกับ API (ส่ง `color` มาเสมอ)
 */
export const DONOR_GROUP_COLORS = [
  '#2563EB',
  '#0D9488',
  '#16A34A',
  '#CA8A04',
  '#EA580C',
  '#DC2626',
  '#DB2777',
  '#9333EA',
  '#4F46E5',
  '#64748B',
] as const;
export const DONOR_GROUP_DEFAULT_COLOR: string = DONOR_GROUP_COLORS[0];

/** `' #2563eb '` → `'#2563EB'` · ไม่ใช่ `#RRGGBB` → `null` (ใช้ตัวเดียวกันทั้ง API และฟอร์มเว็บ) */
export function normalizeDonorGroupColor(input: string): string | null {
  const value = input.trim();
  return DONOR_GROUP_COLOR_PATTERN.test(value) ? value.toUpperCase() : null;
}

// ── ไอคอนที่อัปโหลด (เก็บแบบไอคอนช่องทางติดต่อ · SV-ADR-121) ──────────────────────────────────────────

/** ย่อเป็นจัตุรัส 128×128 แบบ contain พื้นโปร่ง (PNG) ผ่าน sharp — **ไม่รับ SVG** (ตรวจชนิดจากเนื้อไฟล์) */
export const DONOR_GROUP_ICON_PX = 128;
export const DONOR_GROUP_ICON_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** ขนาดไฟล์สูงสุด (`SV-CR-016` §4) — เกิน = 413 `FILE_TOO_LARGE { maxMb }` (และไม่เกิน `s3.maxUploadSizeMb` ของเมนูตั้งค่า) */
export const DONOR_GROUP_ICON_MAX_BYTES = 1024 * 1024;
/** ขนาดภาพต้นฉบับต่อด้านที่รับ — นอกช่วง = 422 `IMAGE_DIMENSIONS_INVALID` (เท่าไอคอนช่องทางติดต่อ) */
export const DONOR_GROUP_ICON_SOURCE_MIN_PX = 16;
export const DONOR_GROUP_ICON_SOURCE_MAX_PX = 8000;
/** `icon_version` = hex 8 ตัว สุ่มใหม่ทุกครั้งที่อัปโหลด → URL `?v=` เปลี่ยน */
export const DONOR_GROUP_ICON_VERSION_LENGTH = 8;
/**
 * path ของ route proxy บน origin ของเว็บ (`sv-web/src/app/donor-group-icon/[file]/route.ts` · `T-174`) — `[file]` = id กลุ่ม ·
 * ส่ง cookie ต่อไป `GET /donor-groups/:id/icon?v=` (ต้อง login + `donors` หรือ `donor_groups` ≥ READ_ONLY · **ไม่มีทางสาธารณะ**)
 */
export const DONOR_GROUP_ICON_PATH = '/donor-group-icon/';

/** URL ไอคอนที่อัปโหลดบน origin ของเว็บ (`<img src>` ของ CMS) */
export function donorGroupIconUrl(id: string, version: string): string {
  return `${DONOR_GROUP_ICON_PATH}${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`;
}

// ── ตัวกรอง / ลำดับ ─────────────────────────────────────────────────────────────────────────────────

/** ค่าพิเศษของตัวกรอง `groupId` ใน `GET /donors` และลิงก์ "ยังไม่มีกลุ่ม" (`/donors?groupId=none`) */
export const DONOR_GROUP_FILTER_NONE = 'none';

/** ลำดับของ `GET /donor-groups` (`?sort=`) — ไม่ส่ง = `name_asc` · **กลุ่ม default อยู่บนสุดเสมอ** แล้วค่าเท่ากันเรียง `name, id` ต่อ */
export const DonorGroupSort = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  DONORS_DESC: 'donors_desc',
  DONORS_ASC: 'donors_asc',
  UPDATED_DESC: 'updated_desc',
} as const;
export type DonorGroupSort = (typeof DonorGroupSort)[keyof typeof DonorGroupSort];

// ── view ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * อ้างถึงกลุ่ม (chip สี + ไอคอน) — ช่อง `group` ของผู้บริจาค (list/view) · ตัวเลือกในฟอร์ม (`GET /donors/group-options`) · Dashboard `donorGroups`
 * `iconUrl` = `donorGroupIconUrl()` · `null` = ไม่มีไอคอน (แสดงจุดสีแทน)
 */
export interface DonorGroupRef {
  id: string;
  name: string;
  /** `#RRGGBB` ตัวใหญ่ */
  color: string;
  iconUrl: string | null;
  isDefault: boolean;
}

/** ตัวเลือกในฟอร์มผู้บริจาค (เมนูผู้บริจาค + Chat ช่อง 3) — `GET /donors/group-options` เรียง default ก่อน แล้วชื่อ (สิทธิ์ `donors` ≥ READ_ONLY) */
export type DonorGroupOptionView = DonorGroupRef;

/** แถวของ `GET /donor-groups` */
export interface DonorGroupListItemView extends DonorGroupRef {
  description: string | null;
  /** ผู้บริจาค (ที่ยังไม่ลบ) ในกลุ่ม — ลิงก์ `/donors?groupId=<id>` */
  donorCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: DonationActorView | null;
  updatedBy: DonationActorView | null;
}

/** แถบสรุปบนหน้า list — นับผู้บริจาคที่ยังไม่ลบ · `grouped + ungrouped = totalDonors` · ไม่ขึ้นกับ `q`/หน้า */
export interface DonorGroupSummary {
  totalDonors: number;
  grouped: number;
  /** ลิงก์ `/donors?groupId=none` */
  ungrouped: number;
}

/** response ของ `GET /donor-groups` — envelope list กลาง + `summary` ระดับบนสุด (แบบ `DonationListResponse`) */
export interface DonorGroupListResponse extends ApiListResponse<DonorGroupListItemView> {
  summary: DonorGroupSummary;
}

/** ตัวเลขของหน้า view — `donationTotal`/`donationCount` = รายรับรวมทุกช่วง (`DONATION_COUNTED_STATUSES`) ของผู้บริจาคที่อยู่ในกลุ่ม ณ ตอนนี้ */
export interface DonorGroupStats {
  donorCount: number;
  /** ผู้บริจาคในกลุ่มที่ผูก LINE (= `/donors?groupId=<id>&lineStatus=LINKED`) */
  withLineCount: number;
  /** ต้องมีสิทธิ์ `donations` ≥ READ_ONLY — ไม่มี = `null` (ไม่ query) · DECIMAL เป็นข้อความ `"1234.00"` */
  donationTotal: string | null;
  donationCount: number | null;
}

/** หน้า view (`GET /donor-groups/:id`) */
export interface DonorGroupView extends DonorGroupListItemView {
  stats: DonorGroupStats;
}

/** แถวของ `GET /donor-groups/:id/donors` (ต้องมีสิทธิ์ `donors` ≥ READ_ONLY ด้วย) — ลิงก์ `/donors/:id` */
export interface DonorGroupMemberView {
  id: string;
  donorCode: string;
  /** `null` = สมัครเองแต่ยังไม่กรอกชื่อ */
  fullName: string | null;
  /** ตัวเลขล้วน — แสดงด้วย `formatThaiPhone()` */
  phone: string;
  status: DonorStatus;
  lineStatus: DonorLineStatus;
  /** cache ของผู้บริจาค (= คอลัมน์เดียวกับ list ผู้บริจาค) */
  donationCount: number;
  donationTotal: string;
  createdAt: string;
}

// ── input ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * body ของ `POST /donor-groups` — `name` trim แล้วไม่ว่าง ≤ 100 · ไม่ซ้ำกับกลุ่มที่ยังไม่ลบ (ไม่สนตัวพิมพ์) → 422 `DONOR_GROUP_NAME_TAKEN` ·
 * `description` ว่าง/`null` = ไม่มี · `color` ตาม `DONOR_GROUP_COLOR_PATTERN` (เก็บตัวใหญ่) ·
 * `isDefault: true` = สร้างเป็น default เลย (ตัวเดิมถูกเลิกใน transaction เดียว) — เปลี่ยนภายหลังใช้ `PUT`/`DELETE /donor-groups/:id/default` เท่านั้น
 */
export interface DonorGroupCreateInput {
  name: string;
  description?: string | null;
  color: string;
  isDefault?: boolean;
}
/** body ของ `PATCH /donor-groups/:id` — ส่งเฉพาะช่องที่แก้ · **ไม่มี `isDefault`** (ส่งมา = 400) */
export type DonorGroupUpdateInput = Partial<Omit<DonorGroupCreateInput, 'isDefault'>>;

/** ผลของ `DELETE /donor-groups/:id` — `movedDonors` = ผู้บริจาคที่กลายเป็น "ไม่มีกลุ่ม" (ใน transaction เดียวกับการลบ) */
export interface DonorGroupDeleteResult {
  id: string;
  deleted: true;
  movedDonors: number;
  /** กลุ่มที่ลบเป็น default (หลังลบ = ไม่มี default) */
  wasDefault: boolean;
}
