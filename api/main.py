from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routes.login import login_router
from routes.vehicles import vehicles_router
from routes.owners import owners_router
from routes.inspections import inspections_router
from routes.users import users_router
from routes.uploads import uploads_router
from routes.brands import brands_router
from security.deps import get_current_user
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()
# app = FastAPI(root_path="/api-gps", docs_url=None, redoc_url=None, openapi_url=None)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
  print(f"Error de validación en {request.url}: {exc.errors()}")
  return JSONResponse(
      status_code=422,
      content={"message": "Error de validación", "details": exc.errors()},
  )

# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     print(f"Error 500 crítico en {request.url}:")
#     traceback.print_exc()
    
#     return JSONResponse(
#         status_code=500,
#         content={
#             "message": "Error interno del servidor",
#             "error_type": type(exc).__name__,
#             "details": str(exc)
#         },
#     )

app.include_router(login_router, prefix="/users")
app.include_router(uploads_router, prefix="/uploads")
app.include_router(users_router, prefix="/users", dependencies=[Depends(get_current_user)])
app.include_router(vehicles_router, prefix="/vehicles", dependencies=[Depends(get_current_user)])
app.include_router(owners_router, prefix="/owners", dependencies=[Depends(get_current_user)])
app.include_router(inspections_router, prefix="/inspections", dependencies=[Depends(get_current_user)])
app.include_router(brands_router, prefix="/brands", dependencies=[Depends(get_current_user)])

@app.get("/", dependencies=[Depends(get_current_user)])
def main():
  return {"Hello": "World"}
