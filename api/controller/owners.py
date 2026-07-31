from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import cast, Integer
from models.propietarios import Propietarios
from models.ciudades import Ciudades
from schemas.owner import *

# ---------------------------------------------------------------------------------------------------------------

async def owners_list(db: Session):
  try:
    owners = db.query(Propietarios).all()

    if not owners:
      return JSONResponse(content={"message": "No owners found"}, status_code=404)
         
    response = [
      {
        'id': owner.ID, 
        'name': owner.NOMBRE
      } for owner in owners
    ]
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def all_owners(pagination: OwnerPagination, db: Session):
  try:
    if pagination.page_number < 1 or pagination.page_size < 1:
      return JSONResponse(content={"error": "Page number and page size must be greater than 0"}, status_code=400)

    query = db.query(Propietarios).order_by(cast(Propietarios.ID, Integer)).all()

    owners = [
      {
        'id': owner.ID, 
        'name': owner.NOMBRE,
        'phone': owner.TELEFONO,
        'email': owner.CORREO,
        'admon_value': owner.VLR_ADMON,
        'prices_list': 'Venta' if owner.LISTA == 1 else 'Costo' if owner.LISTA == 2 else '',
        'payment_plan': 'Quincenal' if owner.PLANPAGO == 1 else 'Mensual' if owner.PLANPAGO == 2 else 'Anual' if owner.PLANPAGO == 3 else '',
        'status': 'Activo' if owner.ESTADO == 1 else 'Suspendido' if owner.ESTADO == 2 else 'Retirado' if owner.ESTADO == 3 else '',
      } for owner in query
    ]

    if pagination.search and pagination.search.strip():
      search_term = pagination.search.strip().lower()
      def matches(owner):
        for key, value in owner.items():
          if value is None:
            continue
          if search_term in str(value).lower():
            return True
        return False
      owners = [owner for owner in owners if matches(owner)]

    total_items = len(owners)
    total_pages = (total_items + pagination.page_size - 1) // pagination.page_size if total_items else 0

    offset = (pagination.page_number - 1) * pagination.page_size

    owners = owners[offset:offset + pagination.page_size]
         
    response = {
      'page_number': pagination.page_number,
      'total_items': total_items,
      'total_pages': total_pages,
      'owners': owners
    }
    
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def owner_info(owner_id: str, db: Session):
  try:
    owner = db.query(
      Propietarios.ID, Propietarios.NOMBRE, Propietarios.RUC, Propietarios.ID_CIUDAD, Propietarios.DIRECCION,
      Propietarios.TELEFONO, Propietarios.TELEFONO1, Propietarios.CONTACTO, Propietarios.REP_LEGAL,
      Propietarios.CORREO, Propietarios.CORREO1, Propietarios.PLANPAGO, Propietarios.FEC_FACTUR, Propietarios.LISTA, 
      Propietarios.VLR_ADMON, Propietarios.IVA, Propietarios.DESCUENTO, Propietarios.ESTADO,
      Propietarios.FEC_ESTADO, Propietarios.ID_USUARIO, Propietarios.NOMUSUARIO, Propietarios.OBSERVA,
      Ciudades.NOMBRE.label('city_name')
    ).join(Ciudades, Propietarios.ID_CIUDAD == Ciudades.ID
    ).filter(Propietarios.ID == owner_id).first()

    if not owner:
      return JSONResponse(content={"message": "Owner not found"}, status_code=404)

    response = {
      'id': owner.ID,
      'name': owner.NOMBRE,
      'ruc': owner.RUC,
      'city_id': owner.ID_CIUDAD,
      'city_name': owner.city_name if owner.city_name else '',
      'address': owner.DIRECCION,
      'phone': owner.TELEFONO,
      'phone1': owner.TELEFONO1,
      'contact': owner.CONTACTO,
      'legal_representative': owner.REP_LEGAL,
      'email': owner.CORREO,
      'email1': owner.CORREO1,
      'payment_plan': 'Quincenal' if owner.PLANPAGO == 1 else 'Mensual' if owner.PLANPAGO == 2 else 'Anual' if owner.PLANPAGO == 3 else '',
      'invoice_date': owner.FEC_FACTUR if owner.FEC_FACTUR else '',
      'admon_value': owner.VLR_ADMON,
      'ITBMS': owner.IVA,
      'discount': owner.DESCUENTO,
      'prices_list': 'Venta' if owner.LISTA == 1 else 'Costo' if owner.LISTA == 2 else '',
      'status': 'Activo' if owner.ESTADO == 1 else 'Suspendido' if owner.ESTADO == 2 else 'Retirado' if owner.ESTADO == 3 else '',
      'status_date': owner.FEC_ESTADO if owner.FEC_ESTADO else '',
      'auditor_id': owner.ID_USUARIO,
      'auditor_name': owner.NOMUSUARIO,
      'notes': owner.OBSERVA
    }

    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)