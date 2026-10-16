import type { ErrorCode } from './errors';

/** TEC-03 §3.2 */
export interface ApiMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  traceId: string;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiMeta;
  traceId: string;
}

export interface ApiErrorBody {
  code: ErrorCode | string;
  messageKey: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
  traceId: string;
}

/** TEC-03 §3.3 · REQ-NFR-002 [MUST] — ค่า default อ่านจาก settings ห้าม hardcode */
export const PAGINATION_OPTIONS = [20, 50, 100] as const;
export type PaginationOption = (typeof PAGINATION_OPTIONS)[number];

export function isPaginationOption(value: number): value is PaginationOption {
  return (PAGINATION_OPTIONS as readonly number[]).includes(value);
}

export const API_BASE_PATH = '/api/v1';
