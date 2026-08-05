from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, cast, Integer
from sqlalchemy.orm import Session
from models.vehiculos import Vehiculos
from models.marcas import Marcas
from models.colores import Colores
from models.tiposvehiculos import TiposVehiculos
from models.propietarios import Propietarios
from models.estados import Estados
from schemas.vehicles import *

# ---------------------------------------------------------------------------------------------------------------

async def vehicles_per_owner(owner_id: str, db: Session):
  try:
    query = db.query(
      Vehiculos.ID,
      Vehiculos.PLACA,
      Marcas.NOMBRE.label('Brand'),
      Vehiculos.MODELO,
      Vehiculos.ID_PROPIE.label('Owner_id'),
      Propietarios.NOMBRE.label('Owner_name'),
    ).outerjoin(Marcas, Vehiculos.ID_MARCA == Marcas.ID)\
     .outerjoin(Propietarios, Vehiculos.ID_PROPIE == Propietarios.ID)\
     .outerjoin(Estados, Vehiculos.ID_ESTADO == Estados.ID)

    if owner_id and owner_id.strip() != "":
      query = query.filter(Vehiculos.ID_PROPIE == owner_id)
    
    vehicles = query.all()

    if not vehicles:
      return JSONResponse(content={"message": "No vehicles found"}, status_code=404)
         
    response = [
      {
        'id': vehicle.ID,
        'plate': vehicle.PLACA, 
        'brand': vehicle.Brand,
        'model': vehicle.MODELO,
        'owner_name': vehicle.Owner_name,
      } for vehicle in vehicles
    ]
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def vehicle_info(vehicle_plate: str, db: Session):
  try:
    result = db.query(
      Vehiculos,
      Marcas.ID.label('Brand_id'),
      Marcas.NOMBRE.label('Brand'),
      Colores.NOMBRE.label('Color'),
      TiposVehiculos.NOMBRE.label('Vehicle_type'),
      Propietarios.NOMBRE.label('Owner_name'),
      Estados.NOMBRE.label('Status'),
    ).outerjoin(Marcas, Vehiculos.ID_MARCA == Marcas.ID)\
     .outerjoin(Colores, Vehiculos.ID_COLOR == Colores.ID)\
     .outerjoin(TiposVehiculos, Vehiculos.ID_TIPOVEH == TiposVehiculos.ID)\
     .outerjoin(Propietarios, Vehiculos.ID_PROPIE == Propietarios.ID)\
     .outerjoin(Estados, Vehiculos.ID_ESTADO == Estados.ID)\
     .filter(Vehiculos.PLACA == vehicle_plate).first()

    if not result:
      return JSONResponse(content={"message": "No vehicle found"}, status_code=404)

    v, brand_id, brand_name, color_name, vtype_name, owner_name, status_name = result

    plan_pago = getattr(v, 'PLANPAGO', None)
    payment_plan = 'Quincenal' if plan_pago == 1 else 'Mensual' if plan_pago == 2 else 'Anual' if plan_pago == 3 else 'No definido'

    forma_insta = getattr(v, 'FORMAINSTA', None)
    installation_method = 'Rastreo' if forma_insta == 1 else 'Corta Corriente' if forma_insta == 2 else 'Bomba Gasolina' if forma_insta == 3 else 'Ninguno'

    prend_apag = getattr(v, 'PREND_APAG', None)

    response = {
      'id': getattr(v, 'ID', ''),
      'plate': getattr(v, 'PLACA', ''),
      'brand': (brand_name or getattr(v, 'NOMMARCA', '') or '').strip(),
      'brand_id': (brand_id or getattr(v, 'ID_MARCA', '') or '').strip(),
      'gps_brand_id': (brand_id or getattr(v, 'ID_MARCA', '') or '').strip(),
      'model': getattr(v, 'MODELO', ''),
      'color': (color_name or getattr(v, 'NOMCOLOR', '') or '').strip(),
      'vehicle_type': (vtype_name or getattr(v, 'NOMTIPOVEH', '') or '').strip(),
      'owner_id': getattr(v, 'ID_PROPIE', ''),
      'owner_name': (owner_name or getattr(v, 'NOMPROPIE', '') or '').strip(),
      'status': (status_name or getattr(v, 'NOMESTADO', '') or '').strip(),
      'status_date': getattr(v, 'FEC_ESTADO', None),
      'payment_plan': payment_plan,
      'cuo_admon': getattr(v, 'CUO_ADMON', 0),
      'iva': getattr(v, 'IVA', 0),
      'installation_method': installation_method,
      'prend_apag': 'Prendido' if prend_apag == 1 else 'Apagado',
      'prend_apag_date': getattr(v, 'FEC_PREAPA', None),
      'gps_serial': getattr(v, 'GPS_SERIAL', ''),
      'cel_serial': getattr(v, 'CEL_SERIAL', ''),
      'cel_num': getattr(v, 'CEL_NUMERO', ''),
      'comments': getattr(v, 'COMENTARIO', ''),
      'observations': getattr(v, 'OBSERVA', ''),
      'date_created': getattr(v, 'FEC_CREADO', None)
    }

    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

async def all_vehicles(pagination: VehiclePagination, db: Session):
  try:
    if pagination.page_number < 1 or pagination.page_size < 1:
      return JSONResponse(content={"message": "Invalid page number or page size"}, status_code=400)

    query = db.query(
      Vehiculos.ID,
      Vehiculos.PLACA,
      Vehiculos.ID_TIPOVEH,
      Vehiculos.ID_ESTADO,
      Vehiculos.ID_PROPIE,
      Vehiculos.PLANPAGO,
      Vehiculos.CUO_ADMON,
      Vehiculos.FORMAINSTA,
      Vehiculos.PREND_APAG,
      Vehiculos.GPS_SERIAL,
      Vehiculos.CEL_SERIAL,
      Vehiculos.CEL_NUMERO,
      TiposVehiculos.NOMBRE.label('type_name'),
      Estados.NOMBRE.label('status_name'),
      Propietarios.NOMBRE.label('owner_name'),
    ).outerjoin(TiposVehiculos, Vehiculos.ID_TIPOVEH == TiposVehiculos.ID
    ).outerjoin(Estados, Vehiculos.ID_ESTADO == Estados.ID
    ).outerjoin(Propietarios, Vehiculos.ID_PROPIE == Propietarios.ID).order_by(cast(Vehiculos.ID, Integer)).all()

    vehicles = [
      {
        'id': vehicle.ID,
        'plate': vehicle.PLACA, 
        'owner_id': vehicle.ID_PROPIE,
        'owner_name': vehicle.owner_name if vehicle.owner_name else '',
        'type_id': vehicle.ID_TIPOVEH,
        'type_name': vehicle.type_name if vehicle.type_name else '',
        'status_id': vehicle.ID_ESTADO,
        'status_name': vehicle.status_name if vehicle.status_name else '',
        'payment_plan': 'Quincenal' if vehicle.PLANPAGO == 1 else 'Mensual' if vehicle.PLANPAGO == 2 else 'Anual' if vehicle.PLANPAGO == 3 else 'No definido',
        'cuoadmon': vehicle.CUO_ADMON if vehicle.CUO_ADMON else '',
        'installation_method': 'Rastreo' if vehicle.FORMAINSTA == 1 else 'Corta Corriente' if vehicle.FORMAINSTA == 2 else 'Bomba Gasolina' if vehicle.FORMAINSTA == 3 else 'Ninguno',
        'gps_status': 'Prendido' if vehicle.PREND_APAG == 1 else 'Apagado',
        'gps_serial': vehicle.GPS_SERIAL if vehicle.GPS_SERIAL else '',
        'cel_serial': vehicle.CEL_SERIAL if vehicle.CEL_SERIAL else '',
        'cel_num': vehicle.CEL_NUMERO if vehicle.CEL_NUMERO else '',
      } for vehicle in query
    ]

    if pagination.search and pagination.search.strip():
      search_term = pagination.search.strip().lower()
      def matches(vehicle):
        for key, value in vehicle.items():
          if value is None:
            continue
          if search_term in str(value).lower():
            return True
        return False
      vehicles = [vehicle for vehicle in vehicles if matches(vehicle)]

    total_items = len(vehicles)
    total_pages = (total_items + pagination.page_size - 1) // pagination.page_size if total_items else 0

    offset = (pagination.page_number - 1) * pagination.page_size

    vehicles = vehicles[offset:offset + pagination.page_size]

    response = {
        'page_number': pagination.page_number,
        'total_items': total_items,
        'total_pages': total_pages,
        'items': vehicles
      }

    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)