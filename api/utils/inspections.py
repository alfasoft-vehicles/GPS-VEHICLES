import os
import shutil
from datetime import datetime
import pytz
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from config.dbconnection import SessionLocal
from models.inspecciones import Inspecciones
from models.vehiculos import Vehiculos

load_dotenv()
upload_directory = os.getenv('DIRECTORY_DOC')

# ---------------------------------------------------------------------------------------------------------------

async def update_expired_inspections(db: Session, inspections_list: list = None):
  """
  Función auxiliar para actualizar inspecciones pendientes que han expirado a estado suspendido.
  
  Args:
      db: Sesión de base de datos
      inspections_list: Lista de inspecciones ya consultadas (opcional)
  
  Returns:
      int: Número de inspecciones actualizadas
  """
  try:
    panama_timezone = pytz.timezone('America/Panama')
    current_date = datetime.now(panama_timezone).date()
    
    updated_inspections = 0
    
    if inspections_list:
      inspections_to_update = inspections_list
    else:
      inspections_to_update = db.query(Inspecciones).filter(
          Inspecciones.ESTADO == "PEN"
      ).all()
    
    for inspection in inspections_to_update:
      if (inspection.ESTADO == "PEN" and 
        inspection.FECHA and 
        inspection.FECHA < current_date):
        inspection.ESTADO = "SUS"
        updated_inspections += 1
    
    if updated_inspections > 0:
      db.commit()
    
    return updated_inspections
      
  except Exception as e:
    db.rollback()
    print(f"Error updating expired inspections: {str(e)}")
    return 0
  
async def update_all_expired_inspections(db: Session):
  """Endpoint dedicado para actualizar todas las inspecciones expiradas """
  try:
    updated_count = await update_expired_inspections(db)
    
    return JSONResponse(content={
      "message": f"Actualizadas {updated_count} inspecciones",
      "updated_count": updated_count
    }, status_code=200)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

def migrate_unregistered_inspections_task():
  """
  Tarea en segundo plano para migrar inspecciones con vehículos no registrados.
  Valida si el vehículo ya fue creado en BD, asocia su ID_VEHICULO y mueve las fotos a la carpeta correspondiente.
  """
  db: Session = SessionLocal()
  try:
    unregistered_inspections = db.query(Inspecciones).filter(
      (Inspecciones.ID_VEHICULO == "") | (Inspecciones.ID_VEHICULO.is_(None))
    ).all()

    for inspection in unregistered_inspections:
      clean_plate = (inspection.PLACA or "").strip().upper()
      if not clean_plate:
        continue

      vehicle = db.query(Vehiculos).filter(Vehiculos.PLACA == clean_plate).first()
      if vehicle and vehicle.ID:
        vehicle_id = str(vehicle.ID).strip()
        inspection.ID_VEHICULO = vehicle_id

        if not (inspection.PROPIETARIO and inspection.PROPIETARIO.strip()) and vehicle.ID_PROPIE:
          inspection.PROPIETARIO = vehicle.ID_PROPIE
          if vehicle.NOMPROPIE:
            inspection.NOMPROPI = vehicle.NOMPROPIE

        if upload_directory:
          old_inspection_dir = os.path.join(upload_directory, "unregistered", str(inspection.ID))
          new_inspection_dir = os.path.join(upload_directory, "vehicles", vehicle_id, "inspections", str(inspection.ID))

          if os.path.exists(old_inspection_dir):
            os.makedirs(os.path.dirname(new_inspection_dir), exist_ok=True)
            if not os.path.exists(new_inspection_dir):
              shutil.move(old_inspection_dir, new_inspection_dir)
            else:
              for item in os.listdir(old_inspection_dir):
                s = os.path.join(old_inspection_dir, item)
                d = os.path.join(new_inspection_dir, item)
                shutil.move(s, d)
              try:
                os.rmdir(old_inspection_dir)
              except Exception:
                pass

        for i in range(1, 9):
          photo_attr = f"FOTO{i:02d}"
          photo_val = getattr(inspection, photo_attr, None)
          if photo_val and "unregistered/" in photo_val:
            setattr(inspection, photo_attr, photo_val.replace("unregistered/", f"vehicles/{vehicle_id}/inspections/"))

        if inspection.FIRMA and "unregistered/" in inspection.FIRMA:
          inspection.FIRMA = inspection.FIRMA.replace("unregistered/", f"vehicles/{vehicle_id}/inspections/")

        db.commit()
  except Exception as e:
    print(f"Error in migrate_unregistered_inspections_task: {e}")
    db.rollback()
  finally:
    db.close()