export interface Vehicle {
  id: string;
  plate: string;
  owner_id?: string;
  owner_name: string;
  type_id?: string;
  type_name: string;
  status_id?: string;
  status_name: string;
  payment_plan: string;
  cuoadmon: string | number;
  installation_method: string;
  gps_status: string;
  gps_serial: string;
  cel_serial: string;
  cel_num: string;
}

export interface VehiclesResponse {
  page_number: number;
  total_items: number;
  total_pages: number;
  items: Vehicle[];
}
