from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import cast, Integer
from models.inventario import Inventarios
from schemas.inventory import *

async def all_stock(pagination: InventoryPagination, db: Session):
  try:
    if pagination.page_number < 1 or pagination.page_size < 1:
      return JSONResponse(content={"error": "Page number and page size must be greater than 0"}, status_code=400)

    query = db.query(Inventarios).order_by(cast(Inventarios.ID, Integer)).all()

    items = [
      {
        'id': item.ID, 
        'code': item.CODIGO,
        'barcode': item.COD_BARRAS,
        'name': item.NOMBRE,
        'presentation': item.PRESENTA,
        'group_id': item.ID_GRUPO,
        'group_name': item.NOMGRUPO,
        'brand_id': item.ID_MARCA,
        'brand_name': item.NOMMARCA,
        'location': item.UBICACION,
        'stock': item.EXISTENCIA,
        'cost': item.COSTO,
        'total': item.TOTAL,
        'sale_price': item.PR_VENTA,
        'status': 'Activo' if item.ESTADO == 1 else 'Suspendido' if item.ESTADO == 2 else 'Retirado' if item.ESTADO == 3 else '',
      } for item in query
    ]

    if pagination.search and pagination.search.strip():
      search_term = pagination.search.strip().lower()
      def matches(item):
        for key, value in item.items():
          if value is None:
            continue
          if search_term in str(value).lower():
            return True
        return False
      items = [item for item in items if matches(item)]

    total_items = len(items)
    total_pages = (total_items + pagination.page_size - 1) // pagination.page_size if total_items else 0

    offset = (pagination.page_number - 1) * pagination.page_size

    items = items[offset:offset + pagination.page_size]
         
    response = {
      'page_number': pagination.page_number,
      'total_items': total_items,
      'total_pages': total_pages,
      'items': items
    }
    
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)