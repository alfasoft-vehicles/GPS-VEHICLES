import uuid
from pathlib import Path

from fastapi.responses import JSONResponse, FileResponse
from fastapi.encoders import jsonable_encoder
from fastapi import UploadFile, File, BackgroundTasks
from typing import List
from sqlalchemy.orm import Session
from models.tiposinspeccion import TiposInspeccion
from models.inspecciones import Inspecciones
from models.vehiculos import Vehiculos
from models.propietarios import Propietarios
from models.usuarios import Usuarios
from models.estados import Estados
from models.marcas import Marcas
from schemas.inspections import NewInspection, InspectionInfo
from utils.inspections import update_expired_inspections
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from utils.pdf import html2pdf
import pytz
import os
import shutil
import jinja2
import asyncio
import tempfile
from dotenv import load_dotenv

load_dotenv()

upload_directory = os.getenv('DIRECTORY_DOC')
route_api = os.getenv('ROUTE_API')
PDF_THREAD_POOL = ThreadPoolExecutor(max_workers=2)

# ---------------------------------------------------------------------------------------------------------------

async def inspections_types(db: Session):
  try:
    inspections = db.query(TiposInspeccion.ID, TiposInspeccion.NOMBRE).all()

    if not inspections:
      return JSONResponse(content={"message": "No inspection types found"}, status_code=404)
         
    response = [
      {
        'id': inspection.ID,
        'name': inspection.NOMBRE
      } for inspection in inspections
    ]
    return JSONResponse(content=jsonable_encoder(response), status_code=200)
  except Exception as e:
    return JSONResponse(content={"error": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def create_inspection(data: NewInspection, db: Session, current_user: dict):
  try:
    is_unregistered_vehicle = bool(data.is_unregistered_vehicle or not data.vehicle_id)
    is_unregistered_owner = bool(data.is_unregistered_owner)

    if is_unregistered_vehicle:
      vehicle_id = ""
      plate = (data.plate or "").strip().upper()
      if is_unregistered_owner:
        owner_id = ""
        owner_name = (data.owner_name or "").strip()
      else:
        owner_id = (data.owner_id or "").strip()
        if owner_id:
          owner_db = db.query(Propietarios).filter(Propietarios.ID == owner_id).first()
          owner_name = owner_db.NOMBRE.strip() if owner_db and owner_db.NOMBRE else (data.owner_name or "").strip()
        else:
          owner_name = (data.owner_name or "").strip()
      
      inspection_type = db.query(TiposInspeccion).filter(TiposInspeccion.ID == "01").first()
      inspection_type_id = "01"
      inspection_type_name = inspection_type.NOMBRE.strip() if inspection_type else "Revision General"
    else:
      vehicle = db.query(Vehiculos).filter(Vehiculos.ID == data.vehicle_id).first()
      if not vehicle:
        return JSONResponse(content={"message": "Vehicle not found"}, status_code=404)

      owner = db.query(Propietarios).filter(Propietarios.ID == vehicle.ID_PROPIE).first()
      if not owner:
        return JSONResponse(content={"message": "Owner not found"}, status_code=404)
      
      inspection_type = db.query(TiposInspeccion).filter(TiposInspeccion.ID == data.inspection_type_id).first()
      if not inspection_type:
        return JSONResponse(content={"message": "Inspection type not found"}, status_code=404)
      
      vehicle_id = vehicle.ID
      plate = vehicle.PLACA
      owner_id = vehicle.ID_PROPIE
      owner_name = owner.NOMBRE
      inspection_type_id = inspection_type.ID
      inspection_type_name = inspection_type.NOMBRE
    
    user_id = current_user.get("codigo")
    user = db.query(Usuarios).filter(Usuarios.ID == user_id).first()
    
    panama_timezone = pytz.timezone('America/Panama')
    now_in_panama = datetime.now(panama_timezone)
    date = now_in_panama.strftime("%Y-%m-%d")
    time = now_in_panama.strftime("%I:%M:%S %p")

    brand = db.query(Marcas).filter(Marcas.ID == data.gps_brand_id).first() if data.gps_brand_id else None
    brand_name = brand.NOMBRE.strip() if brand and brand.NOMBRE else ""

    new_inspection = Inspecciones(
      FECHA=date,
      HORA=time,
      ID_VEHICULO=vehicle_id,
      PLACA=plate,
      PROPIETARIO=owner_id,
      NOMPROPI=owner_name,
      TIPO_INSPEC=inspection_type_id,
      NOMINSPEC=inspection_type_name,
      ID_MARCA=data.gps_brand_id if data.gps_brand_id else "",
      NOMMARCA=brand_name,
      GPS_SERIAL=data.gps_serial,
      CEL_NUMERO=data.celular_number,
      CEL_SERIAL=data.celular_serial,
      FORMA_INSTALACION=data.installation_way,
      DESCRIPCION=data.description,
      OBSERVA=data.notes if data.notes else "",
      USUARIO=user.ID if user else "",
      NOMUSUARIO=user.NOMBRE if user else "",
      ESTADO="PEN",
      FEC_CREADO=now_in_panama.strftime("%Y-%m-%d %H:%M:%S")
    )

    db.add(new_inspection)
    db.commit()

    return JSONResponse(content={"id": new_inspection.ID}, status_code=201)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

async def upload_images(inspection_id: int, db: Session, images: List[UploadFile] = File(...)):
  try:
    inspection = db.query(Inspecciones).filter(Inspecciones.ID == inspection_id).first()
    if not inspection:
      return JSONResponse(content={"message": "Inspection not found"}, status_code=404)

    vehicle_id = (inspection.ID_VEHICULO or "").strip()

    available_slots = []
    for i in range(1, 9):
      column_name = f"FOTO{i:02d}"
      if not getattr(inspection, column_name):
        available_slots.append(column_name)

    if not available_slots:
      return JSONResponse(
        content={"message": "No hay espacios disponibles para guardar más fotos."},
        status_code=400
      )
        
    if vehicle_id:
      full_inspection_path = os.path.join(upload_directory, "vehicles", vehicle_id, "inspections", str(inspection_id))
      db_base_path = os.path.join("vehicles", vehicle_id, "inspections", str(inspection_id))
    else:
      full_inspection_path = os.path.join(upload_directory, "unregistered", str(inspection_id))
      db_base_path = os.path.join("unregistered", str(inspection_id))

    os.makedirs(full_inspection_path, exist_ok=True)

    saved_count = 0
    for slot_name, image in zip(available_slots, images):
      _, ext = os.path.splitext(image.filename)
      new_filename = f"{slot_name.lower()}{ext}"
      
      full_file_path = os.path.join(full_inspection_path, new_filename)
      with open(full_file_path, "wb") as buffer:
          shutil.copyfileobj(image.file, buffer)
      
      relative_db_path = os.path.join(db_base_path, new_filename)
      normalized_path = relative_db_path.replace("\\", "/") 
      setattr(inspection, slot_name, normalized_path) 
      saved_count += 1

    panama_timezone = pytz.timezone('America/Panama')
    now_in_panama = datetime.now(panama_timezone)
    date = now_in_panama.strftime("%Y-%m-%d")
    time = now_in_panama.strftime("%I:%M:%S %p")

    inspection.FECHA = date
    inspection.HORA = time
    inspection.ESTADO = "FIN"
    inspection.NRO_FOTOS = saved_count

    db.commit()

    message = f"{saved_count} de {len(images)} imágenes fueron guardadas."
    if len(images) > saved_count:
      message += f" {len(images) - saved_count} fueron descartadas por falta de espacio."

    return JSONResponse(content={"message": message}, status_code=201)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def upload_signature(inspection_id: int, db: Session, signature: UploadFile = File(...)):
  try:
    inspection = db.query(Inspecciones).filter(Inspecciones.ID == inspection_id).first()
    if not inspection:
      return JSONResponse(content={"message": "Inspection not found"}, status_code=404)
    
    if inspection.FIRMA:
      return JSONResponse(content={"message": "Ya existe una firma para esta inspección."}, status_code=400)
    
    vehicle_id = (inspection.ID_VEHICULO or "").strip()

    if vehicle_id:
      full_signature_path = os.path.join(upload_directory, "vehicles", vehicle_id, "inspections", str(inspection_id))
      db_base_path = os.path.join("vehicles", vehicle_id, "inspections", str(inspection_id))
    else:
      full_signature_path = os.path.join(upload_directory, "unregistered", str(inspection_id))
      db_base_path = os.path.join("unregistered", str(inspection_id))

    os.makedirs(full_signature_path, exist_ok=True)

    _, ext = os.path.splitext(signature.filename)
    new_filename = f"firma{ext}"
    
    full_file_path = os.path.join(full_signature_path, new_filename)
    with open(full_file_path, "wb") as buffer:
      shutil.copyfileobj(signature.file, buffer)
    
    relative_db_path = os.path.join(db_base_path, new_filename)
    normalized_path = relative_db_path.replace("\\", "/") 
    inspection.FIRMA = normalized_path 

    db.commit()

    return JSONResponse(content={"message": "Signature uploaded successfully"}, status_code=201)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

async def inspections_list(data: InspectionInfo, db: Session, current_user: dict):
  try:
    filters = []

    if data.initial_date != '' and data.final_date != '':
        filters.append(Inspecciones.FECHA >= data.initial_date)
        filters.append(Inspecciones.FECHA <= data.final_date)
    
    if data.owner != '':
        filters.append(Inspecciones.PROPIETARIO == data.owner)
    
    if data.vehicle_id != '':
        filters.append(Inspecciones.ID_VEHICULO == data.vehicle_id)

    if not filters:
      inspections = db.query(Inspecciones).order_by(Inspecciones.FECHA.desc(), Inspecciones.HORA.desc()).all()
    else:
      inspections = db.query(Inspecciones).filter(*filters).order_by(Inspecciones.FECHA.desc(), Inspecciones.HORA.desc()).all()

    if not inspections:
      return JSONResponse(content={"message": "No inspections found"}, status_code=404)

    await update_expired_inspections(db, inspections_list=inspections)

    inspections_types = db.query(TiposInspeccion).all()

    inspections_dict = {inspection.ID: inspection.NOMBRE for inspection in inspections_types}

    owners_dict = {owner.ID: owner.NOMBRE for owner in db.query(Propietarios).all()}

    inspections_data = []

    for inspection in inspections:
      photos = []
      for i in range(1, 9): 
        photo_field = f"FOTO{i:02d}"
        photo_value = getattr(inspection, photo_field, "")
        if photo_value and photo_value.strip(): 
          photo_url = f"{route_api}uploads/{photo_value}"
          photos.append(photo_url)

      signature_url = f"{route_api}uploads/{inspection.FIRMA}" if inspection.FIRMA and inspection.FIRMA.strip() else ''

      can_edit = 1 if (inspection.ESTADO == "PEN" and current_user.get("codigo") and str(inspection.USUARIO) == current_user.get("codigo")) else 0

      user = db.query(Usuarios).filter(Usuarios.ID == str(inspection.USUARIO)).first()
      
      owner_display = owners_dict.get(inspection.PROPIETARIO) if inspection.PROPIETARIO and inspection.PROPIETARIO.strip() else (inspection.NOMPROPI or "")

      inspections_data.append({
        "id": inspection.ID,
        "date": inspection.FECHA.strftime('%d-%m-%Y') + ' ' + inspection.HORA.strftime('%H:%M') if inspection.FECHA and inspection.HORA else None,
        "id_inspection_type": inspection.TIPO_INSPEC,
        "inspection_type": inspections_dict.get(inspection.TIPO_INSPEC, inspection.NOMINSPEC or ""),
        "details": inspection.DESCRIPCION,
        "vehicle_id": inspection.ID_VEHICULO or "",
        "plate": inspection.PLACA or "",
        "owner_id": inspection.PROPIETARIO or "",
        "owner": owner_display,
        "status": inspection.ESTADO,
        "can_edit": can_edit,
        "photos": photos,
        "signature": [signature_url],
        "user": user.NOMBRE if user else "",
      })

    if not inspections_data:
      return JSONResponse(content={"message": "No inspections found"}, status_code=404)
    return JSONResponse(content=jsonable_encoder(inspections_data), status_code=200)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)
  finally:
    db.close()

# ---------------------------------------------------------------------------------------------------------------

async def inspection_details(inspection_id: int, db: Session):
  try:
    inspection = db.query(Inspecciones).filter(Inspecciones.ID == inspection_id).first()
    if not inspection:
      return JSONResponse(content={"message": "Inspection not found"}, status_code=404)

    await update_expired_inspections(db, inspections_list=[inspection])

    vehicle_id = (inspection.ID_VEHICULO or "").strip()
    vehicle = None
    vehicle_status = ""
    if vehicle_id:
      vehicle = db.query(Vehiculos).filter(Vehiculos.ID == vehicle_id).first()
      if vehicle:
        status = db.query(Estados).filter(Estados.ID == vehicle.ID_ESTADO).first()
        vehicle_status = status.ID + ' - ' + status.NOMBRE if status else ''

    owner_id = (inspection.PROPIETARIO or "").strip()
    owner_name = inspection.NOMPROPI or ""
    if owner_id:
      owner = db.query(Propietarios).filter(Propietarios.ID == owner_id).first()
      if owner and owner.NOMBRE:
        owner_name = owner.NOMBRE
    
    inspection_type = db.query(TiposInspeccion).filter(TiposInspeccion.ID == inspection.TIPO_INSPEC).first()
    inspection_type_name = (inspection.TIPO_INSPEC + ' - ' + inspection_type.NOMBRE) if inspection_type else (inspection.NOMINSPEC or "")

    photos = []
    for i in range(1, 9): 
      photo_field = f"FOTO{i:02d}"
      photo_value = getattr(inspection, photo_field, "")
      if photo_value and photo_value.strip(): 
        photo_url = f"{route_api}uploads/{photo_value}"
        photos.append(photo_url)

    user = db.query(Usuarios).filter(Usuarios.ID == str(inspection.USUARIO)).first()
    brand = db.query(Marcas).filter(Marcas.ID == str(inspection.ID_MARCA)).first() if inspection.ID_MARCA else None
    
    inspection_data = {
      "id": inspection.ID,
      "date": inspection.FECHA.strftime('%d-%m-%Y') if inspection.FECHA else None,
      "time": inspection.HORA.strftime('%H:%M') if inspection.HORA else None,
      "owner": owner_id,
      "owner_name": owner_name,
      "inspection_type": inspection_type_name,
      "vehicle_id": vehicle_id,
      "plate": inspection.PLACA or (vehicle.PLACA if vehicle else ""),
      "vehicle_status": vehicle_status,
      "gps_brand_id": inspection.ID_MARCA.strip() if inspection.ID_MARCA else "",
      "gps_brand": inspection.NOMMARCA.strip() if inspection.NOMMARCA else (brand.NOMBRE.strip() if brand else ""),
      "gps_serial": inspection.GPS_SERIAL if inspection.GPS_SERIAL else "",
      "celular_number": inspection.CEL_NUMERO if inspection.CEL_NUMERO else "",
      "celular_serial": inspection.CEL_SERIAL if inspection.CEL_SERIAL else "",
      "installation_way": inspection.FORMA_INSTALACION if inspection.FORMA_INSTALACION else "",
      "description": inspection.DESCRIPCION,
      "notes": inspection.OBSERVA if inspection.OBSERVA else "",
      "status": inspection.ESTADO,
      "user": user.NOMBRE if user else "",
      "photos": photos,
      "signature": 1 if inspection.FIRMA and inspection.FIRMA.strip() else 0
    }

    return JSONResponse(content=jsonable_encoder(inspection_data), status_code=200)
  except Exception as e:
    return JSONResponse(content={"message": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

async def update_inspection(inspection_id: int, data: NewInspection, db: Session):
  try:
    inspection = db.query(Inspecciones).filter(Inspecciones.ID == inspection_id).first()
    if not inspection:
      return JSONResponse(content={"message": "Inspection not found"}, status_code=404)

    if inspection.ESTADO != "PEN":
      return JSONResponse(content={"message": "Only inspections in PENDING status can be edited."}, status_code=400)

    inspection_type = db.query(TiposInspeccion).filter(TiposInspeccion.ID == data.inspection_type_id).first()
    if not inspection_type:
      return JSONResponse(content={"message": "Inspection type not found"}, status_code=404)

    brand = db.query(Marcas).filter(Marcas.ID == data.gps_brand_id).first() if data.gps_brand_id else None
    brand_name = brand.NOMBRE.strip() if brand and brand.NOMBRE else ""

    inspection.TIPO_INSPEC = inspection_type.ID
    inspection.NOMINSPEC = inspection_type.NOMBRE
    inspection.ID_MARCA = data.gps_brand_id if data.gps_brand_id else ""
    inspection.NOMMARCA = brand_name
    inspection.GPS_SERIAL = data.gps_serial
    inspection.CEL_NUMERO = data.celular_number
    inspection.CEL_SERIAL = data.celular_serial
    inspection.FORMA_INSTALACION = data.installation_way
    inspection.DESCRIPCION = data.description
    inspection.OBSERVA = data.notes if data.notes else ""

    db.commit()

    return JSONResponse(content={"message": "Inspection updated successfully"}, status_code=200)
  except Exception as e:
    db.rollback()
    return JSONResponse(content={"message": str(e)}, status_code=500)

# ---------------------------------------------------------------------------------------------------------------

async def inspection_report(inspection_id: int, db: Session, current_user: dict):
  try:
    inspection = db.query(Inspecciones).filter(Inspecciones.ID == inspection_id).first()
    if not inspection:
      return JSONResponse(content={"message": "Inspection not found"}, status_code=404)
    
    inspection_type = db.query(TiposInspeccion).filter(TiposInspeccion.ID == inspection.TIPO_INSPEC).first()

    vehicle = db.query(Vehiculos).filter(Vehiculos.ID == inspection.ID_VEHICULO).first()

    status = db.query(Estados).filter(Estados.ID == vehicle.ID_ESTADO).first()
    vehicle_status = status.ID + ' - ' + status.NOMBRE if status else ''

    user_id = current_user.get("codigo")
    user_name = db.query(Usuarios).filter(Usuarios.ID == user_id).first()
    brand = db.query(Marcas).filter(Marcas.ID == str(inspection.ID_MARCA)).first() if inspection.ID_MARCA else None

    photos = []
    for i in range(1, 9): 
      photo_field = f"FOTO{i:02d}"
      photo_value = getattr(inspection, photo_field, "")
      if photo_value and photo_value.strip(): 
        photo_url = f"{route_api}uploads/{photo_value}"
        photos.append(photo_url)

    signature_url = f"{route_api}uploads/{inspection.FIRMA}" if inspection.FIRMA and inspection.FIRMA.strip() else ''
    
    inspection_data = {
      "id": inspection.ID,
      "date": inspection.FECHA.strftime('%d-%m-%Y') if inspection.FECHA else None,
      "hour": inspection.HORA.strftime('%H:%M') if inspection.HORA else None,
      "owner": inspection.PROPIETARIO,
      "owner_name": inspection.NOMPROPI,
      "inspection_type": inspection.TIPO_INSPEC + ' - ' + inspection_type.NOMBRE if inspection_type else "",
      "vehicle_id": inspection.ID_VEHICULO,
      "plate": vehicle.PLACA,
      "vehicle_status": vehicle_status,
      "gps_brand_id": inspection.ID_MARCA.strip() if inspection.ID_MARCA else "",
      "gps_brand": inspection.NOMMARCA.strip() if inspection.NOMMARCA else (brand.NOMBRE.strip() if brand else ""),
      "gps_serial": inspection.GPS_SERIAL if inspection.GPS_SERIAL else "",
      "celular_number": inspection.CEL_NUMERO if inspection.CEL_NUMERO else "",
      "celular_serial": inspection.CEL_SERIAL if inspection.CEL_SERIAL else "",
      "installation_way": inspection.FORMA_INSTALACION if inspection.FORMA_INSTALACION else "",
      "description": inspection.DESCRIPCION,
      "notes": inspection.OBSERVA if inspection.OBSERVA else "",
      "status": inspection.ESTADO,
      "inspection_user": inspection.NOMUSUARIO if inspection.NOMUSUARIO else "",
      "photos": photos if photos else [],
      "signature": signature_url if signature_url else "",
    }

    panama_timezone = pytz.timezone('America/Panama')
    now_in_panama = datetime.now(panama_timezone)
    date = now_in_panama.strftime("%d/%m/%Y")
    hour = now_in_panama.strftime("%I:%M:%S %p")

    title = 'Control Inspecciones de GPS'
    logo_path = Path(__file__).resolve().parent.parent / 'assets' / 'LogoEmpresa.jpg'
    data_view = {
      'inspection': inspection_data,
      'date': date,
      'hour': hour,
      'user': user_name.NOMBRE if user_name else "",
      'title': title,
      'logo_url': logo_path.resolve().as_uri()
    }

    headers = {
      "Content-Disposition": "attachment; filename=inspeccion.pdf"
    }

    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    header_file = "header.html"
    footer_file = "footer.html"
    template = template_env.get_template("inspection_report.html")
    header = template_env.get_template(header_file)
    footer = template_env.get_template(footer_file)
    output_text = template.render(data_view=data_view)
    output_header = header.render(data_view=data_view)
    output_footer = footer.render(data_view=data_view)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as html_file:
      html_path = html_file.name
      html_file.write(output_text)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as header_file:
      header_path = header_file.name
      header_file.write(output_header)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as footer_file:
      footer_path = footer_file.name
      footer_file.write(output_footer)

      date_str = now_in_panama.strftime("%Y%m%d")
      short_uuid = uuid.uuid4().hex[:8]
      pdf_filename = f"{vehicle.PLACA}_{date_str}_{short_uuid}.pdf"
      temp_dir = os.path.join(upload_directory, 'temp')
      os.makedirs(temp_dir, exist_ok=True)
      pdf_path = os.path.join(temp_dir, pdf_filename)
      pdf_path = pdf_path.replace("\\", "/")
      pdf_url = f"{route_api}uploads/temp/{pdf_filename}"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
      PDF_THREAD_POOL,
      html2pdf,
      title,
      html_path,
      pdf_path,
      header_path,
      footer_path
    )

    background_tasks = BackgroundTasks()
    background_tasks.add_task(os.remove, html_path)
    background_tasks.add_task(os.remove, header_path)
    background_tasks.add_task(os.remove, footer_path)

    return JSONResponse(
        content={"inspection_pdf": pdf_url}, 
        status_code=200,
        background=background_tasks
    )

  except Exception as e:
    return JSONResponse(content={"message": str(e)}, status_code=500)
  
# ---------------------------------------------------------------------------------------------------------------

async def general_inspections_report(data: InspectionInfo, db: Session, current_user: dict):
  try:
    filters = []

    if data.initial_date != '' and data.final_date != '':
      filters.append(Inspecciones.FECHA >= data.initial_date)
      filters.append(Inspecciones.FECHA <= data.final_date)
    
    if data.owner != '':
      filters.append(Inspecciones.PROPIETARIO == data.owner)
    
    if data.vehicle_id != '':
        filters.append(Inspecciones.ID_VEHICULO == data.vehicle_id)

    inspections = db.query(Inspecciones).filter(*filters).order_by(Inspecciones.FECHA.desc(), Inspecciones.HORA.desc()).all()

    if not inspections:
      return JSONResponse(content={"message": "No inspections found"}, status_code=404)

    await update_expired_inspections(db, inspections_list=inspections)

    user_id = current_user.get("codigo")
    user_name = db.query(Usuarios).filter(Usuarios.ID == user_id).first()

    filtered_inspections = []
    for inspection in inspections:
      if inspection.ESTADO == "PEN":
        if user_id and str(inspection.USUARIO) == user_id:
          filtered_inspections.append(inspection)
      else:
        filtered_inspections.append(inspection)

    inspections = filtered_inspections

    inspections_types = db.query(TiposInspeccion).all()
    inspections_dict = {inspection.ID: inspection.NOMBRE for inspection in inspections_types}
    owners_dict = {owner.ID: owner.NOMBRE for owner in db.query(Propietarios).all()}

    inspections_data = []
    for inspection in inspections:
      
      inspections_data.append({
        "id": inspection.ID,
        "date": inspection.FECHA.strftime('%d-%m-%Y') + ' ' + inspection.HORA.strftime('%H:%M') if inspection.FECHA and inspection.HORA else None,
        "id_inspection_type": inspection.TIPO_INSPEC,
        "inspection_type": inspections_dict.get(inspection.TIPO_INSPEC, ""),
        "details": inspection.DESCRIPCION,
        "vehicle_id": inspection.ID_VEHICULO,
        "plate": inspection.PLACA,
        "owner_id": inspection.PROPIETARIO,
        "owner_name": owners_dict.get(inspection.PROPIETARIO, ""),
        "status": "FINALIZADA" if inspection.ESTADO == "FIN" else ("PENDIENTE" if inspection.ESTADO == "PEN" else ("SUSPENDIDA" if inspection.ESTADO == "SUS" else inspection.ESTADO)),
        "user": inspection.NOMUSUARIO if inspection.NOMUSUARIO else "",
      })

    inspections_data.sort(key=lambda x: x['id'])

    total_inspections = len(inspections_data)

    panama_timezone = pytz.timezone('America/Panama')
    now_in_panama = datetime.now(panama_timezone)
    today = now_in_panama.date()
    date = now_in_panama.strftime("%d/%m/%Y")
    hour = now_in_panama.strftime("%I:%M:%S %p")

    title = 'Reporte General de Inspecciones'
    data_view = {
      'title': title,
      'inspections': inspections_data,
      'total_inspections': total_inspections,
      'date': date,
      'hour': hour,
      'user': user_name.NOMBRE if user_name else "",
      'dates_range': {
        'initial_date': datetime.strptime(data.initial_date, "%Y-%m-%d").strftime("%d/%m/%Y") if data.initial_date else "",
        'final_date': datetime.strptime(data.final_date, "%Y-%m-%d").strftime("%d/%m/%Y") if data.final_date else ""
      }
    }

    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    header_file = "header.html"
    footer_file = "footer.html"
    template = template_env.get_template("general_inspection_report.html")
    header = template_env.get_template(header_file)
    footer = template_env.get_template(footer_file)
    output_text = template.render(data_view=data_view)
    output_header = header.render(data_view=data_view)
    output_footer = footer.render(data_view=data_view)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as html_file:
      html_path = html_file.name
      html_file.write(output_text)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as header_file:
      header_path = header_file.name
      header_file.write(output_header)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as footer_file:
      footer_path = footer_file.name
      footer_file.write(output_footer)

      date_str = now_in_panama.strftime("%Y%m%d")
      short_uuid = uuid.uuid4().hex[:8]
      pdf_filename = f"reporte_{date_str}_{short_uuid}.pdf"
      temp_dir = os.path.join(upload_directory, 'temp')
      os.makedirs(temp_dir, exist_ok=True)
      pdf_path = os.path.join(temp_dir, pdf_filename)
      pdf_path = pdf_path.replace("\\", "/")
      pdf_url = f"{route_api}uploads/temp/{pdf_filename}"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
      PDF_THREAD_POOL,
      html2pdf,
      title,
      html_path,
      pdf_path,
      header_path,
      footer_path
    )

    background_tasks = BackgroundTasks()
    background_tasks.add_task(os.remove, html_path)
    background_tasks.add_task(os.remove, header_path)
    background_tasks.add_task(os.remove, footer_path)

    return JSONResponse(
        content={"inspection_pdf": pdf_url}, 
        status_code=200,
        background=background_tasks
    )

  except Exception as e:
    return JSONResponse(content={"message": str(e)}, status_code=500)