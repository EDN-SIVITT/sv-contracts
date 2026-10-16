/**
 * Master data ที่อยู่ไทย (จังหวัด / อำเภอ / ตำบล / รหัสไปรษณีย์) — พอร์ตจาก HST `hst-contracts/src/api/addresses.ts`
 * `SV-CR-003` · `T-072` · SV-ADR-043 · ข้อมูลจาก migration `0005_thai_addresses.sql` (id = รหัสราชการ)
 * ใช้ร่วมกันระหว่าง API (`/addresses/*`) และฟอร์มที่อยู่ฝั่งเว็บ (ที่อยู่จัดส่งของที่ระลึกของผู้บริจาค)
 */

/** ความยาวคำค้นขั้นต่ำของช่องค้นหาที่อยู่ — สั้นกว่านี้ผลลัพธ์กว้างเกินจะช่วยผู้ใช้ */
export const ADDRESS_SEARCH_MIN_LENGTH = 2;

/** จำนวนผลลัพธ์ของช่องค้นหาที่อยู่ — เป็นเพดานของ dropdown ไม่ใช่ pagination */
export const ADDRESS_SEARCH_DEFAULT_LIMIT = 20;
export const ADDRESS_SEARCH_MAX_LIMIT = 50;

/** รหัสไปรษณีย์ไทย 5 หลัก — เติมจากตำบลให้เอง แต่ผู้ใช้แก้ได้ (ตำบลบางแห่งมีหลายรหัส) */
export const THAI_POSTCODE_PATTERN = /^\d{5}$/;

/** หนึ่งระดับของ cascade dropdown (จังหวัด / อำเภอ / ตำบล) */
export interface AddressOption {
  id: string;
  nameTh: string;
  nameEn: string;
}

/** ตำบลมีรหัสไปรษณีย์ติดมาด้วยเสมอ เพื่อเติมช่องรหัสไปรษณีย์ให้เอง */
export interface SubdistrictOption extends AddressOption {
  postcode: string;
}

/** ผลลัพธ์ของช่องค้นหาเดียว — เติมที่อยู่ได้ครบชุดจากแถวเดียว (ตำบล + อำเภอ + จังหวัด + รหัสไปรษณีย์) */
export interface AddressSearchResult {
  subdistrictId: string;
  subdistrictNameTh: string;
  subdistrictNameEn: string;
  districtId: string;
  districtNameTh: string;
  districtNameEn: string;
  provinceId: string;
  provinceNameTh: string;
  provinceNameEn: string;
  postcode: string;
}
