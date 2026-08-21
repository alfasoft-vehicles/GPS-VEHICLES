from pydantic import BaseModel
from typing import Optional

class NewInspection(BaseModel):
  vehicle_id: str
  inspection_type_id: str
  gps_brand_id: Optional[str] = ""
  gps_serial: str
  celular_number: str
  celular_serial: str
  installation_way: str
  description: str
  notes: Optional[str]
  plate: Optional[str] = ""
  owner_name: Optional[str] = ""
  owner_id: Optional[str] = ""
  is_unregistered_vehicle: Optional[bool] = False
  is_unregistered_owner: Optional[bool] = False

class InspectionInfo(BaseModel):
  owner: Optional[str] = None
  vehicle_id: Optional[str] = None
  initial_date: Optional[str] = None
  final_date: Optional[str] = None