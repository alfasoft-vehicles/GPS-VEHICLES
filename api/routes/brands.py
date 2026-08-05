from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.brands import get_brands_list

brands_router = APIRouter()

@brands_router.get('/brands-list', tags=["Brands"])
async def brands_list(db: Session = Depends(get_db)):
  return await get_brands_list(db)
