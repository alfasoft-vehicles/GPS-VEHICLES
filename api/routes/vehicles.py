from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.vehicles import *
from schemas.vehicles import *

vehicles_router = APIRouter()

@vehicles_router.post('/vehicles-per-owner/', tags=["Vehicles"])
async def post_vehicles(owner_id: str = None, db: Session = Depends(get_db)):
  return await vehicles_per_owner(owner_id, db)

@vehicles_router.get('/info/', tags=["Vehicles"])
async def get_vehicle_info(vehicle_plate: str = Query(...), db: Session = Depends(get_db)):
  return await vehicle_info(vehicle_plate, db)

@vehicles_router.get('/all/', tags=["Vehicles"])
async def get_all_vehicles(pagination: VehiclePagination = Depends(), db: Session = Depends(get_db)):
  return await all_vehicles(pagination, db)