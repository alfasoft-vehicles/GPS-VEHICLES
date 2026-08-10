from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.inventory import *
from schemas.inventory import *

inventory_router = APIRouter()

@inventory_router.get('/', tags=["Inventory"])
async def get_stock(pagination: InventoryPagination = Depends(), db: Session = Depends(get_db)):
  return await all_stock(pagination, db)

@inventory_router.get('/info/{item_id}/', tags=["Inventory"])
async def get_item_info(item_id: int, db: Session = Depends(get_db)):
  return await item_info(item_id, db)