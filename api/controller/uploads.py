from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

load_dotenv()

upload_directory = os.getenv('DIRECTORY_DOC')

def get_static_files(file_path: str):
  full_path = os.path.join(upload_directory, file_path)
  
  if os.path.exists(full_path) and os.path.isfile(full_path):
    return FileResponse(full_path)
      
  return {
    "error": "Archivo no encontrado físicamente", 
    "ruta_armada": full_path
  }