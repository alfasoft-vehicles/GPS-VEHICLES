export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  brand_id?: string;
  gps_brand_id?: string;
  model: string;
  color?: string;
  vehicle_type?: string;
  owner_id?: string;
  owner_name?: string;
  service?: string;
  status?: string;
  cuo_admon?: number;
  iva?: number;
  prend_apag?: number;
  gps_serial?: string;
  cel_serial?: string;
  cel_num?: string;
  date_created?: string;
}
