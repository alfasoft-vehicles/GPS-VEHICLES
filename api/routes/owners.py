from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.owners import *
from schemas.owner import *

owners_router = APIRouter()

@owners_router.get('', tags=["Owners"])
async def get_owners(db: Session = Depends(get_db)):
  return await owners_list(db)

@owners_router.get('/all', tags=["Owners"])
async def get_all_owners(pagination: OwnerPagination = Depends(), db: Session = Depends(get_db)):
  return await all_owners(pagination, db)

@owners_router.get('/info/{owner_id}', tags=["Owners"])
async def get_owner_info(owner_id: str, db: Session = Depends(get_db)):
  return await owner_info(owner_id, db)

@owners_router.get('/basic-info/{owner_id}', tags=["Owners"])
async def get_owner_basic_info(owner_id: str, db: Session = Depends(get_db)):
  return await owner_basic_info(owner_id, db)