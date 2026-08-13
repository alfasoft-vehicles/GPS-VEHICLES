export interface OwnerTableItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  admon_value: number | string;
  prices_list: string;
  payment_plan: string;
  status: string;
}

export interface OwnersResponse {
  page_number: number;
  total_items: number;
  total_pages: number;
  owners: OwnerTableItem[];
}
