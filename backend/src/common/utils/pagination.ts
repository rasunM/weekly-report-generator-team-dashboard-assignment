import { Request } from "express";

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Shared by every list endpoint (reports history, dashboard report list, users list, projects list)
// per the assignment's "Pagination and/or filtering on any endpoint returning a list" requirement -
// one implementation instead of repeating page/pageSize parsing in every controller.
export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawPageSize = parseInt(String(req.query.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function paginated<T>(items: T[], totalCount: number, params: PaginationParams) {
  return {
    items,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
    },
  };
}
