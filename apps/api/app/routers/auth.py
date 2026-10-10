from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import UserModel
from app.schemas.auth import OTPRequest, OTPVerify, OfficialLogin, TokenResponse
from app.services.auth_service import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory mock OTP storage for quick dev/testing
MOCK_OTP_STORAGE = {}

@router.post("/otp/request")
def request_otp(body: OTPRequest):
    # In dev/mock mode, we set OTP to 123456
    MOCK_OTP_STORAGE[body.phone] = "123456"
    return {
        "success": True,
        "message": "OTP sent successfully to " + body.phone,
        "debug_otp": "123456"  # Convenience for development / review
    }

@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    expected_otp = MOCK_OTP_STORAGE.get(body.phone, "123456")
    if body.otp != expected_otp and body.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check or create user
    user = db.query(UserModel).filter(UserModel.phone == body.phone).first()
    if not user:
        user = UserModel(
            phone=body.phone,
            name=body.name or f"Citizen-{body.phone[-4:]}",
            role=body.role or "citizen",
            ward_id=body.ward_id or "WARD-01"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "name": user.name,
        "ward_id": user.ward_id
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        name=user.name,
        ward_id=user.ward_id
    )

@router.post("/login", response_model=TokenResponse)
def official_login(body: OfficialLogin, db: Session = Depends(get_db)):
    # Look up or seed official user
    user = db.query(UserModel).filter(UserModel.phone == body.phone).first()
    if not user:
        user = UserModel(
            phone=body.phone,
            name=body.name or f"Official ({body.role.capitalize()})",
            role=body.role,
            ward_id="WARD-01"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update role if logging in with official credential
        if user.role != body.role:
            user.role = body.role
            db.commit()

    token = create_access_token({
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "name": user.name,
        "ward_id": user.ward_id
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        name=user.name,
        ward_id=user.ward_id
    )

@router.get("/me")
def get_me(current_user: UserModel = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "name": current_user.name,
        "role": current_user.role,
        "ward_id": current_user.ward_id,
        "created_at": current_user.created_at
    }
