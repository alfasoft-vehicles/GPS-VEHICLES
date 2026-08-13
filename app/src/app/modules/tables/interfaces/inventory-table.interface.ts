export interface InventoryTableItem {
  id: number | string;
  code: string;
  barcode: string;
  name: string;
  presentation: string;
  group_id?: number | string;
  group_name: string;
  brand_id?: number | string;
  brand_name: string;
  location: string;
  stock: number;
  cost: number;
  total: number;
  sale_price: number;
  status: string;
}

export interface InventoryResponse {
  page_number: number;
  total_items: number;
  total_pages: number;
  items: InventoryTableItem[];
}
