from sqlalchemy.orm import Session
from security.jwt_handler import create_access_token, create_refresh_token, decode_refresh_token
from schemas.login import LoginRequest
from models.usuarios import Usuarios

# ---------------------------------------------------------------------------------------------------------------

async def process_login(data: LoginRequest, db: Session):
    try:
        user = db.query(Usuarios).filter(Usuarios.ID == data.username).first()
        
        if not user:
            return {'error': 'Usuario no encontrado', 'status_code': 404}
        if user.CONTRASEÑA != data.password:
            return {'error': 'Contraseña incorrecta', 'status_code': 401}
        if user.ESTADO == 0:
            return {'error': 'Usuario inactivo', 'status_code': 403}

        user_data_payload = {"codigo": user.ID}

        access_token = create_access_token(user_data_payload)
        refresh_token = create_refresh_token(user_data_payload)

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'status_code': 200
        }
    except Exception as e:
        return {'error': str(e), 'status_code': 500}

# ---------------------------------------------------------------------------------------------------------------

async def refresh_access_token(refresh_token: str):
    try:
        if not refresh_token:
            return {'error': 'Refresh token missing', 'status_code': 401}
        
        user_data = decode_refresh_token(refresh_token)

        if "error" in user_data:
            return {'error': user_data['error'], 'status_code': 401}
        
        new_payload = {"codigo": user_data['codigo']}
        new_access_token = create_access_token(new_payload)
        new_refresh_token = create_refresh_token(new_payload)

        return {
            'access_token': new_access_token,
            'new_refresh_token': new_refresh_token,
            'status_code': 200
        }
    except Exception as e:
        return {'error': str(e), 'status_code': 500}