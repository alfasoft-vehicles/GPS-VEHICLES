from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from models.marcas import Marcas

async def get_brands_list(db: Session):
  try:
    brands = db.query(Marcas).all()
    response = [
      {
        "id": b.ID.strip() if b.ID else "",
        "name": b.NOMBRE.strip() if b.NOMBRE else "",
      }
      for b in brands
    ]
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)
