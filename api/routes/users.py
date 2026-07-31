from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from security.deps import get_current_user
from config.dbconnection import get_db
from controller.users import user_info

users_router = APIRouter()

@users_router.get('/info', tags=["Users"])
async def get_user_info(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
  return await user_info(db, current_user)