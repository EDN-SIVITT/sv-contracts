# @sv/contracts

Shared enum / permission key / error code / DTO type ระหว่าง `sv-api` และ `sv-web` ของ **SV-BASE** (repo นี้ = ระบบลูก e-Donation — SV-ADR-042)
มีไว้กันปัญหา enum ไม่ตรงกันระหว่างฝั่ง API กับเว็บ (แนวคิดเดียวกับ HST — ADR-001 ของต้นแบบ)

## กฎการใช้งาน

1. **enum / key ที่ใช้ทั้งสองฝั่งต้อง import จาก package นี้เท่านั้น** — ห้ามประกาศซ้ำใน `sv-api` / `sv-web`
2. ห้ามใส่ business logic ที่ต้องพึ่ง DB / network — package นี้เป็น pure TypeScript
3. แก้ไฟล์ใน `src/` แล้วต้อง `npm run build` ก่อน typecheck `sv-api` / `sv-web` (ทั้งสองอ่านจาก `dist/` —
   `scripts/ensure-contracts.mjs` ของแต่ละฝั่ง rebuild ให้อัตโนมัติเมื่อ `dist/` เก่ากว่า `src/`)

## เนื้อหา

| ไฟล์ | เนื้อหา |
|---|---|
| `brand.ts` | `APP_BRAND` (`name` · `shortName` — `e-Donation` / `ED` ตั้งแต่ `T-071`) — ชื่อแบรนด์ฝั่ง API จุดเดียว: หัวเรื่อง/เนื้อหาอีเมล · หัว export · หัวไฟล์ SQL ของ runner (SV-ADR-018) · ค่าสำรองเมื่อ DB ยังไม่มีชื่อ |
| `permissions/index.ts` | `PermissionSubject` (7 เมนู: dashboard · donors (e-Donation) · chat · system_users · user_groups · audit_logs · settings) · `PermissionLevel` (NONE · READ_ONLY · MAINTAIN · FULL) · `satisfiesLevel()` · `PermissionMap` |
| `enums/audit.ts` | `AuditAction` (9: LOGIN · LOGOUT · FORGOT_PASSWORD · CHANGE_PASSWORD · ACCOUNT_LOCKED · CREATE · UPDATE · DELETE · EXPORT) |
| `enums/security.ts` | `PasswordPolicy` + `PASSWORD_POLICY_RULES` (เกณฑ์แต่ละระดับ) · `checkPasswordPolicy()` (ตัวตรวจรหัสกับเกณฑ์ตัวเดียวของ API + ฟอร์มเว็บ — SV-ADR-027) · `AuthRateLimitScope` |
| `enums/line.ts` | `LineChannel` (`MAIN` — SV-ADR-006) · `LINE_CHANNELS` · `MessageTemplateKey` (`welcome`) · `lineChannelFromPath()` · `lineWebhookPath()` |
| `enums/chat.ts` | `ChatMessageDirection` · `ChatMessageType` |
| `enums/attachment.ts` | `StorageDriver` · `ATTACHMENT_MIME_EXTENSION` — ที่ StorageService (S3) ใช้ (SV-ADR-013) |
| `api/errors.ts` | `ErrorCode` (29 — รวม `DONOR_PHONE_TAKEN` · `DONOR_LINE_NOT_LINKED` · `DONOR_CODE_CONFLICT`) · `errorMessageKey()` → `error.<CODE>` ใน locale ของเว็บ |
| `api/response.ts` | response envelope (`ApiSuccessResponse` · `ApiListResponse` · `ApiErrorBody`) · `PAGINATION_OPTIONS` · `API_BASE_PATH` |
| `api/settings.ts` | `SettingGroup` (line · s3 · mail · security · general · donor) · `SettingKey` · `SETTING_NUMBER_BOUNDS` · `SETTING_STRING_RULES` (+ `pattern`) · `settingStringProblem()` · `lineSettingKey()` · `LINE_SETTING_FIELDS` |
| `api/message-templates.ts` | engine ของข้อความอัตโนมัติ: `MESSAGE_TEMPLATE_DEFINITIONS` · `validateMessageTemplateContent()` · `renderMessageTemplateField()` · ช่อง `optional` (ว่าง = ไม่ส่ง) |
| `api/chat.ts` | view type ของ Chat (`ChatThreadListItemView` · `ChatThreadView` · `ChatMessageView`) · `hasChatMessageContent()` |
| `api/donors.ts` | ผู้บริจาค (e-Donation · `T-072`): `DonorStatus` · `DonorLineStatus` · `DonorRegistrationChannel` · `DonorAddressFormat` · view/input type · `normalizeThaiPhone()` · `isThaiMobilePhone()` · `formatThaiPhone()` · `formatDonorCode()` · ค่าคงที่ `DONOR_*` |
| `api/addresses.ts` | ข้อมูลที่อยู่ไทย (พอร์ตจาก HST): `AddressOption` · `SubdistrictOption` · `AddressSearchResult` · `ADDRESS_SEARCH_*` · `THAI_POSTCODE_PATTERN` |

## เพิ่มของใหม่ (ระบบลูก)

- เปลี่ยนชื่อระบบ → แก้ `APP_BRAND` ที่นี่ + `app.name` / `app.shortName` / `app.description` ใน locale ทั้ง th/en ของเว็บ
- เมนูใหม่ → เพิ่ม key ใน `PermissionSubject` + `nav.<key>` ใน locale ทั้ง th/en
- LINE channel ใหม่ → เพิ่มสมาชิกใน `LineChannel` + settings 4 แถว `line.<channel>.*` + label `chat.channel.<CH>` / `settings.lineChannel.<CH>`
- ข้อความอัตโนมัติใหม่ → เพิ่ม key ใน `MessageTemplateKey` + แถวใน `MESSAGE_TEMPLATE_DEFINITIONS` + seed ใน migration + locale `settings.messages.template.<slug>.*`
- error code ใหม่ → เพิ่มใน `ErrorCode` + `error.<CODE>` ใน locale (`check:locales` ของเว็บดักให้ถ้าลืม)

สูตรละเอียดพร้อมคำสั่งตรวจ: [`docs/40-technical/11-extend-recipes.md`](../docs/40-technical/11-extend-recipes.md) (สูตร LINE channel ทดลองจริงแล้วใน `T-053`)

## Build

```bash
npm install
npm run build      # → dist/
npm run typecheck
```

## การใช้จาก package อื่น

repo เดียว 3 package (SV-ADR-002) — `sv-api` และ `sv-web` อ้างถึงด้วย `"@sv/contracts": "file:../sv-contracts"`
Dockerfile ของทั้งสองใช้ root ของ repo เป็น build context แล้ว build package นี้ก่อน
