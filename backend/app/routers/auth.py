from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserOut, Token
from app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    revoke_token,
    oauth2_scheme
)
from app.services.rate_limiter import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new customer account.
    CRITICAL SECURITY FIX: Public registration strictly forces role="customer"
    and organization_id=None server-side. Staff accounts must be provisioned
    by an authorized Org Admin via /api/organizations/{id}/staff.
    """
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed: An account with this email address already exists."
        )

    # Strictly hardcode customer role and None organization for self-service registration
    user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        password_hash=get_password_hash(user_in.password),
        role="customer",
        organization_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login_json(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Standard JSON login endpoint returning JWT access token with rate limiting and secure cookies.
    """
    # Rate limiting protection against brute-force and credential stuffing
    enforce_rate_limit(request=request, email=credentials.email)

    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    # Set httpOnly cookie for XSS defense-in-depth
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() in ["production", "prod", "staging"],
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return Token(access_token=access_token, token_type="bearer", user=user)

@router.post("/token", response_model=Token)
def login_form(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login for Swagger UI with rate limiting.
    """
    enforce_rate_limit(request=request, email=form_data.username)

    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() in ["production", "prod", "staging"],
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return Token(access_token=access_token, token_type="bearer", user=user)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get profile information of the currently authenticated user.
    """
    return current_user

@router.post("/logout")
def logout(
    response: Response,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Invalidates the current session token by adding its jti to the RevokedToken denylist.
    """
    revoke_token(db, token)
    response.delete_cookie("access_token_cookie")
    return {"message": "Successfully logged out. Session token has been revoked."}
