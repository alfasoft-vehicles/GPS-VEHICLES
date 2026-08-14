export interface TableCache<T> {
  page: number;
  size: number;
  search: string;
  data: T;
}
