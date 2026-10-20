/**
 * รายชื่อขนส่ง — master data ใต้เมนู "ตั้งค่า → ออเดอร์" (`T-096` · REQ-SET-049 · FT-16 ช่อง "ขนส่ง")
 * schema: `sv-api/migrations/0013_shipping_carriers.sql` · ชื่อยาวสุด = `ORDER_SHIPPING_CARRIER_MAX_LENGTH` (เท่าคอลัมน์ snapshot `orders.shipping_carrier`)
 *
 * - `GET /shipping-carriers` (settings READ_ONLY) — ทุกแถวที่ยังไม่ลบ รวมที่ปิดใช้งาน · เรียง `sortOrder, name`
 * - `GET /shipping-carriers/options` — **ทุกคนที่ login** · เฉพาะที่เปิดใช้งาน = ตัวเลือก dropdown ของฟอร์มออเดอร์/popup บันทึกจัดส่ง
 * - `POST` / `PATCH /:id` (MAINTAIN) · `DELETE /:id` (FULL · soft · มีออเดอร์อ้าง → 409 `SHIPPING_CARRIER_IN_USE` — ให้ "ปิดใช้งาน" แทน)
 * - ออเดอร์อ้างด้วย `carrierId` (`OrderCreateInput` · `OrderUpdateInput` · `OrderShipInput`) — API เขียน snapshot ชื่อลง `shippingCarrier`
 */

/** แถวในการ์ด "ขนส่ง" ของ `/settings/order` */
export interface ShippingCarrierView {
  id: string;
  name: string;
  /** ปิด = ไม่ขึ้นในตัวเลือกของออเดอร์ แต่ออเดอร์เดิมยังแสดงชื่อเดิม (snapshot) */
  isActive: boolean;
  sortOrder: number;
  /** จำนวนออเดอร์ (ที่ยังไม่ลบ) ที่เลือกขนส่งนี้ — ลบได้เมื่อ 0 */
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 1 ตัวเลือกของ `GET /shipping-carriers/options` (เปิดใช้งานเท่านั้น · เรียง `sortOrder, name`) */
export interface ShippingCarrierOption {
  id: string;
  name: string;
}

/** body ของ `POST /shipping-carriers` — `PATCH /shipping-carriers/:id` = `Partial` (ส่งเฉพาะช่องที่แก้) */
export interface ShippingCarrierInput {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}
