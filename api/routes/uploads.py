from controller.uploads import get_static_files
from fastapi import APIRouter

uploads_router = APIRouter(tags=["Uploads"])

@uploads_router.get("/{file_path:path}")
def serve_static_files(file_path: str):
  return get_static_files(file_path)