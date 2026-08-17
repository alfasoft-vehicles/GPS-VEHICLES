from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from typing import Optional
from schemas.login import LoginRequest, TokenResponse, RefreshTokenRequest, MessageResponse
from controller.login import process_login, refresh_access_token
from sqlalchemy.orm import Session
from config.dbconnection import get_db
from config.settings import settings

login_router = APIRouter()

@login_router.post('/login', tags=["Users"], response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    login_result = await process_login(data, db)

    if 'error' in login_result:
        raise HTTPException(
            status_code=login_result['status_code'],
            detail=login_result['error']
        )
    
    response.set_cookie(
        key="refresh_token",
        value=login_result['refresh_token'],
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH,
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
    )

    return TokenResponse(
        access_token=login_result['access_token']
    )

# ---------------------------------------------------------------------------------------------------------------

@login_router.post('/refresh-token', tags=["Users"], response_model=TokenResponse)
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias="refresh_token"),
    data: Optional[RefreshTokenRequest] = None
):
    token_to_use = refresh_token or (data.refresh_token if data else None)

    if not token_to_use:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token no encontrado"
        )

    result = await refresh_access_token(token_to_use)

    if 'error' in result:
        response.delete_cookie(
            key="refresh_token",
            path=settings.COOKIE_PATH,
            httponly=True,
            samesite=settings.COOKIE_SAMESITE,
            secure=settings.COOKIE_SECURE
        )
        raise HTTPException(
            status_code=result['status_code'],
            detail=result['error']
        )
    
    if 'new_refresh_token' in result:
        response.set_cookie(
            key="refresh_token",
            value=result['new_refresh_token'],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path=settings.COOKIE_PATH,
            max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
        )

    return TokenResponse(
        access_token=result['access_token']
    )

# ---------------------------------------------------------------------------------------------------------------

@login_router.post('/logout', tags=["Users"], response_model=MessageResponse)
async def logout(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path=settings.COOKIE_PATH,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE
    )
    return MessageResponse(message="Sesión cerrada correctamente")