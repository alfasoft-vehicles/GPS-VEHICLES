from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.vehicles import *
from schemas.vehicles import *

vehicles_router = APIRouter()

@vehicles_router.post('/vehicles-per-owner', tags=["Vehicles"])
async def post_vehicles(owner_id: str = None, db: Session = Depends(get_db)):
  return await vehicles_per_owner(owner_id, db)

@vehicles_router.api_route('/info', methods=['GET', 'OPTIONS'], tags=["Vehicles"])
@vehicles_router.api_route('/info/', methods=['GET', 'OPTIONS'], tags=["Vehicles"])
async def get_vehicle_info(request: Request, vehicle_plate: str = Query(None), db: Session = Depends(get_db)):
  if not vehicle_plate:
    try:
      body = await request.json()
      vehicle_plate = body.get('vehicle_plate') or body.get('plate')
    except Exception:
      pass
  return await vehicle_info(vehicle_plate, db)

@vehicles_router.get('/all', tags=["Vehicles"])
async def get_all_vehicles(pagination: VehiclePagination = Depends(), db: Session = Depends(get_db)):
  return await all_vehicles(pagination, db)