/** Error code ที่ต้องมี — TEC-03 §3.6 */
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_MUST_CHANGE_PASSWORD: 'AUTH_MUST_CHANGE_PASSWORD',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  /** OTP ไม่ถูกต้อง หมดอายุ ถูกใช้แล้ว หรือถูกยกเลิก — ใช้ข้อความกลางเดียวกัน (REQ-SEC-006) */
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  /** public auth endpoint ถูกจำกัดตาม IP/username (REQ-SEC-004/005) */
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  FORBIDDEN_NO_PERMISSION: 'FORBIDDEN_NO_PERMISSION',
  USER_GROUP_IN_USE: 'USER_GROUP_IN_USE',
  ROOT_USER_IMMUTABLE: 'ROOT_USER_IMMUTABLE',
  ROOT_GROUP_IMMUTABLE: 'ROOT_GROUP_IMMUTABLE',
  /** เพิ่ม/ย้ายผู้ใช้ที่ไม่ใช่ root เข้ากลุ่ม super admin (`root_admin`) — สงวนให้ Root Admin คนเดียว (`REQ-USR-012` · SV-ADR-035) · `details.field = userGroupId` */
  ROOT_GROUP_RESERVED: 'ROOT_GROUP_RESERVED',
  /** LINE webhook ไม่มี/ใช้ลายเซ็นที่ไม่ตรงกับ raw request body (REQ-SEC-027) */
  LINE_SIGNATURE_INVALID: 'LINE_SIGNATURE_INVALID',
  /** Messaging API ปฏิเสธ/ติดต่อไม่ได้ — ไม่ส่งรายละเอียด upstream ที่อาจมี credential ออกไป */
  LINE_MESSAGE_SEND_FAILED: 'LINE_MESSAGE_SEND_FAILED',
  /** ไม่มี template หรือข้อมูล template ผิดรูปแบบ — ป้องกัน fallback ไป hardcode ในโค้ด */
  MESSAGE_TEMPLATE_NOT_CONFIGURED: 'MESSAGE_TEMPLATE_NOT_CONFIGURED',
  /** ยังไม่ได้กรอก Channel Secret ของ OA ช่องทางนั้นในเมนูตั้งค่า */
  LINE_CHANNEL_NOT_CONFIGURED: 'LINE_CHANNEL_NOT_CONFIGURED',
  /** ยังไม่ได้ตั้งค่า SMTP ในเมนูตั้งค่า → ส่งเมลจริงไม่ได้ (REQ-SET-012) */
  MAIL_NOT_CONFIGURED: 'MAIL_NOT_CONFIGURED',
  /** ตั้งค่าแล้วแต่ SMTP server ปฏิเสธ/ติดต่อไม่ได้ — รายละเอียดอยู่ใน log ฝั่ง server เท่านั้น */
  MAIL_SEND_FAILED: 'MAIL_SEND_FAILED',
  /** ยังไม่ได้ตั้งค่า S3 ในเมนูตั้งค่า → เก็บไฟล์จริงไม่ได้ (REQ-NFR-004 · REQ-SET-006) */
  STORAGE_NOT_CONFIGURED: 'STORAGE_NOT_CONFIGURED',
  /** ตั้งค่าแล้วแต่ S3 ปฏิเสธ/ติดต่อไม่ได้ — รายละเอียดอยู่ใน log ฝั่ง server เท่านั้น */
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  /** ไฟล์ใหญ่เกิน `s3.maxUploadSizeMb` — `details.maxMb` บอกเพดานที่ตั้งไว้ (เก็บไว้ให้ระบบลูก · SV-ADR-013) */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  /** ชนิดไฟล์ไม่อยู่ในรายการที่ช่องอัปโหลดนั้นรับ — `details.accepted` บอกชนิดที่รับได้ (เก็บไว้ให้ระบบลูกที่อัปโหลดไฟล์ · SV-ADR-013) */
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  /** ขนาดภาพ (px) อยู่นอกช่วงที่ช่องอัปโหลดนั้นรับ — `details: { field, minPx, maxPx, width, height }` (ไอคอนระบบ · SV-ADR-036) */
  IMAGE_DIMENSIONS_INVALID: 'IMAGE_DIMENSIONS_INVALID',
  /** แถวค่าตั้งค่าที่ฟีเจอร์ต้องใช้ยังไม่มีใน DB (ยังไม่ได้รัน migration) — `details.key` (SV-ADR-036) */
  SETTING_NOT_INSTALLED: 'SETTING_NOT_INSTALLED',
  /** เบอร์โทรนี้มีผู้บริจาคอื่น (ที่ยังไม่ถูกลบ) ใช้อยู่ — 422 · `details: { field: 'phone', donorCode }` ให้ฟอร์มบอกรหัสของคนที่ใช้อยู่ (`REQ-DNR-*` · SV-ADR-043) */
  DONOR_PHONE_TAKEN: 'DONOR_PHONE_TAKEN',
  /** ยกเลิกการผูก LINE ของผู้บริจาคที่ไม่ได้ผูกอยู่ (ถูกยกเลิกไปแล้ว/ไม่เคยผูก) — 409 */
  DONOR_LINE_NOT_LINKED: 'DONOR_LINE_NOT_LINKED',
  /** ออกรหัสผู้บริจาคไม่สำเร็จ — รหัสที่ประกอบได้ชนกับรหัสเดิมติดกันหลายครั้ง (ตรวจคำนำหน้า/จำนวนหลักในเมนูตั้งค่า) — 409 */
  DONOR_CODE_CONFLICT: 'DONOR_CODE_CONFLICT',
  // ── หน้า LINE OA ของผู้บริจาค (LIFF · `SV-CR-003` ข้อ 2 · FT-14 · SV-ADR-044/045/046 · `T-074`) ──
  /** ไม่มี / ตรวจไม่ผ่าน / หมดอายุ — LINE ID token ใน header `X-Line-Id-Token` (401) · หน้าเว็บขอ token ใหม่แล้วลองอีกครั้ง */
  LINE_ID_TOKEN_INVALID: 'LINE_ID_TOKEN_INVALID',
  /** ติดต่อ LINE เพื่อตรวจ ID token ไม่ได้ชั่วคราว (LINE ตอบ 429/5xx · หมดเวลา) — 503 ลองใหม่ได้ */
  LINE_VERIFY_UNAVAILABLE: 'LINE_VERIFY_UNAVAILABLE',
  /** ยังไม่ได้กรอก LINE Login Channel ID ของ channel นั้นในเมนูตั้งค่า → ตรวจ ID token ไม่ได้ (503 · `details { channel, field }`) */
  LINE_LOGIN_NOT_CONFIGURED: 'LINE_LOGIN_NOT_CONFIGURED',
  /** ยังไม่ได้ตั้งค่า SMS (key · secret · ชื่อผู้ส่ง) ในเมนูตั้งค่า (503 · `details.missing`) */
  SMS_NOT_CONFIGURED: 'SMS_NOT_CONFIGURED',
  /** ผู้ให้บริการ SMS ปฏิเสธ/ติดต่อไม่ได้ (502) — รายละเอียดจากผู้ให้บริการอยู่ใน log ฝั่ง server เท่านั้น */
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  /** เบอร์ที่ใช้ขอ OTP ไม่ใช่มือถือไทย (`06`/`08`/`09` + 8 หลัก) — 422 `details.field = phone` (กัน SMS ต่างประเทศ) */
  DONOR_PHONE_NOT_MOBILE: 'DONOR_PHONE_NOT_MOBILE',
  /** OTP ผิด · หมดอายุ · ใช้แล้ว · ขอชุดใหม่แล้ว · ผิดครบจำนวน — **ข้อความกลางเดียว** (422 · แนว REQ-SEC-006) */
  DONOR_OTP_INVALID: 'DONOR_OTP_INVALID',
  /** ขอ OTP ใหม่เร็วเกิน (ส่งใหม่ได้หลัง 60 วินาที) — 429 `details { retryAfterSeconds }` */
  DONOR_OTP_COOLDOWN: 'DONOR_OTP_COOLDOWN',
  /** `verificationToken` ไม่ถูกต้อง · หมดอายุ · ใช้แล้ว · ไม่ใช่ของ LINE user นี้ (422) → เริ่มยืนยันเบอร์ใหม่ */
  DONOR_VERIFICATION_INVALID: 'DONOR_VERIFICATION_INVALID',
  /** LINE บัญชีนี้ผูกกับผู้บริจาคอยู่แล้ว (409) — ผูกซ้ำ/ขอ OTP ไม่ได้ */
  DONOR_ALREADY_LINKED: 'DONOR_ALREADY_LINKED',
  /** ผู้บริจาคที่ผูกกับ LINE บัญชีนี้ถูกระงับ (403) — ใช้หน้า LINE OA ไม่ได้ ติดต่อเจ้าหน้าที่ */
  DONOR_SUSPENDED: 'DONOR_SUSPENDED',
  /** LINE บัญชีนี้ยังไม่ได้ผูกกับผู้บริจาค (403) — ต้องผูกก่อน (เช่นส่งฟอร์มสมัคร) */
  DONOR_NOT_LINKED: 'DONOR_NOT_LINKED',
  /** ส่งฟอร์มสมัครทั้งที่ไม่ได้อยู่ในสถานะ "รอกรอกข้อมูล" (409 · กรอกแล้ว/เจ้าหน้าที่กรอกแทนแล้ว) */
  DONOR_REGISTRATION_NOT_REQUIRED: 'DONOR_REGISTRATION_NOT_REQUIRED',
  /**
   * ผูก/สร้างไม่ได้เพราะผลการตรวจเบอร์เปลี่ยนไประหว่างยืนยัน OTP กับกดยอมรับ (409 · ประเมินใหม่ใต้ล็อก) —
   * `details { outcome, message? }` = outcome ใหม่ (`PHONE_LINKED_TO_ANOTHER_LINE` · `DONOR_SUSPENDED` · `SELF_REGISTRATION_DISABLED` + ข้อความจากตั้งค่า)
   */
  DONOR_LINK_REJECTED: 'DONOR_LINK_REJECTED',
  /** ข้อความ consent ถูกแก้ระหว่างที่ผู้ใช้อ่าน (`consentSha256` ไม่ตรงฉบับปัจจุบัน · 409) → โหลดข้อความใหม่แล้วยอมรับอีกครั้ง */
  DONOR_CONSENT_OUTDATED: 'DONOR_CONSENT_OUTDATED',
  // ── ของที่ระลึก · สต็อกแบบ lot · ออเดอร์ (`SV-CR-004` · FT-15/FT-16 · SV-ADR-050 · `T-077`) ──
  /** รหัสสินค้าซ้ำ (unique รวมแถวที่ลบแล้ว) — 422 `details { field: 'code' }` */
  SOUVENIR_CODE_TAKEN: 'SOUVENIR_CODE_TAKEN',
  /** ออกรหัสสินค้าอัตโนมัติไม่สำเร็จ — รหัสที่ประกอบได้ชนกับรหัสที่กรอกเองติดกันหลายครั้ง (ตรวจคำนำหน้า/จำนวนหลักในเมนูตั้งค่า) — 409 `details { attempts }` */
  SOUVENIR_CODE_CONFLICT: 'SOUVENIR_CODE_CONFLICT',
  /** ชื่อหมวดหมู่ซ้ำกับหมวดที่ยังไม่ลบ — 422 `details { field: 'name' }` */
  SOUVENIR_CATEGORY_NAME_TAKEN: 'SOUVENIR_CATEGORY_NAME_TAKEN',
  /** ลบหมวดหมู่ที่ยังมีสินค้า (ที่ยังไม่ลบ) ผูกอยู่ — 409 `details { souvenirCount }` */
  SOUVENIR_CATEGORY_IN_USE: 'SOUVENIR_CATEGORY_IN_USE',
  /** ลบสินค้าที่ยังมีคงเหลือ > 0 หรือมีออเดอร์ DRAFT/CONFIRMED อ้างถึง — 409 `details { stockOnHand, openOrders }` */
  SOUVENIR_IN_USE: 'SOUVENIR_IN_USE',
  /** สินค้าถูกระงับ/ถูกลบ — ใส่ออเดอร์ใหม่/ยืนยันออเดอร์ที่มีสินค้านี้ไม่ได้ — 422 `details { souvenirId, code, name }` */
  SOUVENIR_SUSPENDED: 'SOUVENIR_SUSPENDED',
  /** เลข lot ซ้ำในสินค้าเดียวกัน — 422 `details { field: 'lotNo' }` */
  SOUVENIR_LOT_NO_TAKEN: 'SOUVENIR_LOT_NO_TAKEN',
  /** ลบ lot ที่ถูกตัด/ปรับยอดไปแล้ว (มี movement มากกว่าแถว RECEIVE แถวเดียว) — 409 */
  SOUVENIR_LOT_IN_USE: 'SOUVENIR_LOT_IN_USE',
  /** ไฟล์รูปไม่ใช่ png/jpg/webp · อ่านเป็นรูปไม่ได้ · เกิน `s3.maxUploadSizeMb` — 422 `details { field: 'file', accepted?, maxMb? }` */
  SOUVENIR_IMAGE_INVALID: 'SOUVENIR_IMAGE_INVALID',
  /** เพิ่มรูปเมื่อสินค้ามีรูปครบ `SOUVENIR_IMAGES_MAX` แล้ว — 422 `details { field: 'file', max }` (`T-100`) */
  SOUVENIR_IMAGES_LIMIT: 'SOUVENIR_IMAGES_LIMIT',
  /** ลำดับรูปที่ส่งมาไม่ใช่ชุด id ครบของสินค้านี้ (ขาด · เกิน · ซ้ำ · ของสินค้าอื่น) — 422 `details { field: 'imageIds', reason }` (`T-100`) */
  SOUVENIR_IMAGE_ORDER_INVALID: 'SOUVENIR_IMAGE_ORDER_INVALID',
  /** สต็อกไม่พอ — ปรับยอด lot ติดลบ หรือยืนยันออเดอร์แล้ว lot รวมไม่พอ (rollback ทั้ง transaction) — 422 `details { souvenirId, code, name, requested, available }` */
  STOCK_INSUFFICIENT: 'STOCK_INSUFFICIENT',
  /** เปลี่ยนสถานะออเดอร์ไม่ตรง `ORDER_STATUS_TRANSITIONS` (ไปสถานะเดิม) · ยกเลิกจากรายการบริจาคเมื่อออเดอร์ไม่อยู่ใน `ORDER_OPEN_STATUSES` — 409 `details { from, to }` */
  ORDER_STATUS_INVALID: 'ORDER_STATUS_INVALID',
  /**
   * แก้/ลบออเดอร์ในสถานะที่ไม่อนุญาต (SV-ADR-074) — ส่งช่องของส่วนที่ล็อก (`ORDER_EDITABLE_SECTIONS`) → 409 `details { status, section }` ·
   * สถานะที่ไม่มีส่วนแก้ได้ (SHIPPED/RECEIVED/CANCELLED) · ลบที่ไม่ใช่ DRAFT → 409 `details { status }`
   */
  ORDER_NOT_EDITABLE: 'ORDER_NOT_EDITABLE',
  /**
   * ย้อนออเดอร์ที่ออกจากรายการบริจาคออกจาก `CANCELLED` ไม่ได้ — รายการบริจาคต้นทางถูกลบ · มีออเดอร์ active ของชุดอื่น · หรือสถานะไม่รองรับ (SV-ADR-074 · SV-ADR-077) —
   * 409 `details { donationId, donationNo, status, orderId, orderNos, deleted }` (สถานะ/ออเดอร์ active ของรายการบริจาค ณ ตอนนี้ · `orderId` = ใบแรก หรือ `null`)
   */
  ORDER_DONATION_RELINK_CONFLICT: 'ORDER_DONATION_RELINK_CONFLICT',
  /** ออเดอร์ต้องมีรายการอย่างน้อย 1 รายการ — 422 `details { field: 'items' }` */
  ORDER_ITEMS_EMPTY: 'ORDER_ITEMS_EMPTY',
  /** สินค้าเดียวกันซ้ำหลายรายการในออเดอร์เดียว — 422 `details { field: 'items', souvenirId }` */
  ORDER_ITEM_DUPLICATE: 'ORDER_ITEM_DUPLICATE',
  /** ออกเลขที่ออเดอร์ไม่สำเร็จ — เลขที่ประกอบได้ชนกับเลขเดิมติดกันหลายครั้ง (ตรวจคำนำหน้า/จำนวนหลักในเมนูตั้งค่า) — 409 `details { attempts }` */
  ORDER_NO_CONFLICT: 'ORDER_NO_CONFLICT',
  /** ลบออเดอร์ที่ออกจากรายการบริจาค (`source_donation_id` · `T-108`) — 409 `details { donationId, donationNo }` · ให้ยกเลิกออเดอร์แทน (รายการบริจาคกลับเป็นยืนยัน) */
  ORDER_LINKED_TO_DONATION: 'ORDER_LINKED_TO_DONATION',
  /** อ้างอิงรายการบริจาค (`sourceDonationId`) ให้ออเดอร์ที่อ้างอิง/ออกจากรายการบริจาคอยู่แล้ว (`T-117` · SV-ADR-079) — 409 `details { donationId, donationNo }` · เปลี่ยนไม่ได้ ต้องยกเลิกออเดอร์ */
  ORDER_DONATION_ALREADY_LINKED: 'ORDER_DONATION_ALREADY_LINKED',
  // ── รายชื่อขนส่ง (`T-096` · REQ-SET-049 · ตั้งค่า → ออเดอร์) ──
  /** ชื่อขนส่งซ้ำกับแถวที่ยังไม่ลบ (ไม่สนตัวพิมพ์) — 422 `details { field: 'name', name }` */
  SHIPPING_CARRIER_NAME_TAKEN: 'SHIPPING_CARRIER_NAME_TAKEN',
  /** ลบขนส่งที่ยังมีออเดอร์ (ที่ยังไม่ลบ) อ้างอยู่ — 409 `details { orderCount }` · ให้ปิดใช้งานแทน */
  SHIPPING_CARRIER_IN_USE: 'SHIPPING_CARRIER_IN_USE',
  // ── รายการบริจาค (`SV-CR-005` ข้อ 3 · FT-17 · SV-ADR-053 · `T-084`) ──
  /** มูลค่าของที่ระลึกรวม (Σ qty × มูลค่าปัจจุบัน) เกินยอดบริจาค — 422 `details { amount, souvenirTotal }` (ข้อความทศนิยม 2 ตำแหน่ง) */
  DONATION_SOUVENIR_OVER_AMOUNT: 'DONATION_SOUVENIR_OVER_AMOUNT',
  /** สินค้าเดียวกันซ้ำหลายแถวในรายการบริจาคเดียว — 422 `details { field: 'items', souvenirId }` */
  DONATION_ITEM_DUPLICATE: 'DONATION_ITEM_DUPLICATE',
  /** ตั้งสถานะ `REJECTED` (ฟอร์ม/ปุ่มปฏิเสธ) โดยไม่มีเหตุผล — 422 `details { field: 'rejectReason' }` */
  DONATION_REJECT_REASON_REQUIRED: 'DONATION_REJECT_REASON_REQUIRED',
  /** ปุ่มของรายการบริจาคจากสถานะที่ไม่ตรง `DONATION_ACTION_TRANSITIONS` (ยืนยัน/ปฏิเสธ ≠ PENDING · ออกออเดอร์ ≠ CONFIRMED/มีออเดอร์แล้ว · ยกเลิกออเดอร์ ≠ ORDERED) — 409 `details { from, to }` */
  DONATION_STATUS_INVALID: 'DONATION_STATUS_INVALID',
  /** แก้/ลบ/อัปโหลด-ลบสลิปของรายการที่ออกออเดอร์แล้ว (`ORDERED` · `T-108`) — 409 `details { status }` (ออเดอร์ที่ผูกดูจาก `DonationView.orders` · `T-113`) · ยกเลิกออเดอร์ก่อน */
  DONATION_NOT_EDITABLE: 'DONATION_NOT_EDITABLE',
  /**
   * ไฟล์หลักฐานการโอนใช้ไม่ได้ — 422 `details { field: 'file', reason, accepted?, maxMb?, max? }` · `reason`: `REQUIRED` ไม่แนบ · `TOO_LARGE` เกิน `s3.maxUploadSizeMb` (`maxMb`) ·
   * `NOT_IMAGE` ไม่ใช่รูปและไม่ใช่ PDF (`accepted`) · `FORMAT` รูปชนิดอื่น · `DIMENSIONS` · `CORRUPT` · `TOO_MANY` ครบ `PAYMENT_SLIP_FILES_MAX` แล้ว (`max`) (`T-112`)
   */
  DONATION_SLIP_INVALID: 'DONATION_SLIP_INVALID',
  /** ออกเลขที่รายการบริจาคไม่สำเร็จ — เลขที่ประกอบได้ชนกับเลขเดิมติดกันหลายครั้ง (ตรวจคำนำหน้า/จำนวนหลักในเมนูตั้งค่า) — 409 `details { attempts }` */
  DONATION_NO_CONFLICT: 'DONATION_NO_CONFLICT',
  /** ใช้กับ validation error ทั่วไปที่ไม่มี code เฉพาะ */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** i18n key ของแต่ละ error code — frontend แปลผ่าน key นี้ (TEC-03 §3.2) */
export function errorMessageKey(code: ErrorCode): string {
  return `error.${code}`;
}
