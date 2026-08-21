from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from controller.inspections import *
from schemas.inspections import NewInspection
from security.deps import get_current_user

inspections_router = APIRouter()

@inspections_router.get('/inspections-types', tags=["Inspections"])
async def get_inspections_types(db: Session = Depends(get_db)):
  return await inspections_types(db)

@inspections_router.post('/create-inspection', tags=["Inspections"])
async def post_create_inspection(data: NewInspection, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
  return await create_inspection(data, db, current_user)

@inspections_router.post('/upload-images/{inspection_id}', tags=["Inspections"])
async def post_upload_images(inspection_id: int, db: Session = Depends(get_db), files: list[UploadFile] = File(...)):
  return await upload_images(inspection_id, db, files)

@inspections_router.post('/upload-signature/{inspection_id}', tags=["Inspections"])
async def post_upload_signature(inspection_id: int, db: Session = Depends(get_db), signature: UploadFile = File(...)):
  return await upload_signature(inspection_id, db, signature)

@inspections_router.post('/list', tags=["Inspections"])
async def post_list_inspections(data: InspectionInfo, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
  return await inspections_list(data, db, current_user, background_tasks)

@inspections_router.get('/details/{inspection_id}', tags=["Inspections"])
async def get_inspection_details(inspection_id: int, db: Session = Depends(get_db)):
  return await inspection_details(inspection_id, db)

@inspections_router.put('/update/{inspection_id}', tags=["Inspections"])
async def put_update_inspection(inspection_id: int, data: NewInspection, db: Session = Depends(get_db)):
  return await update_inspection(inspection_id, data, db)

@inspections_router.get('/generate-pdf/{inspection_id}', tags=["Inspections"])
async def get_inspection_report(inspection_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
  return await inspection_report(inspection_id, db, current_user)

@inspections_router.post('/generate-general-pdf', tags=["Inspections"])
async def post_generate_general_report(data: InspectionInfo, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
  return await general_inspections_report(data, db, current_user)