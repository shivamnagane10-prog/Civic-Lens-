from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import UserModel
from app.schemas.auth import (
    OTPRequest,
    OTPVerify,
    GoogleAuthRequest,
    OfficialLogin,
    TokenResponse,
)
from app.services.auth_service import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory mock OTP storage for quick dev/testing
MOCK_OTP_STORAGE = {}

@router.post("/otp/request")
def request_otp(body: OTPRequest):
    # In dev/evaluation mode, OTP is set to 123456
    MOCK_OTP_STORAGE[body.phone] = "123456"
    return {
        "success": True,
        "message": f"OTP successfully dispatched to {body.phone}",
        "debug_otp": "123456"
    }

@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    expected_otp = MOCK_OTP_STORAGE.get(body.phone, "123456")
    if body.otp != expected_otp and body.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP entered. Please use 123456.")
    
    # Check or create citizen user
    user = db.query(UserModel).filter(UserModel.phone == body.phone).first()
    if not user:
        user = UserModel(
            phone=body.phone,
            name=body.name or f"Citizen-{body.phone[-4:]}",
            role="citizen",
            ward_id=body.ward_id or "WARD-DL-01"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "name": user.name,
        "ward_id": user.ward_id,
        "email": user.email
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        name=user.name,
        ward_id=user.ward_id,
        email=user.email,
        police_badge_id=user.police_badge_id,
        department=user.department
    )

@router.post("/google/verify", response_model=TokenResponse)
def google_auth_verify(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    # Look up user by email or google_id
    user = db.query(UserModel).filter(UserModel.email == body.email).first()
    if not user:
        phone_suffix = "".join([c for c in body.email if c.isdigit()])[-4:] or "9999"
        mock_phone = f"+9198{phone_suffix.zfill(8)}"
        user = UserModel(
            phone=mock_phone,
            email=body.email,
            name=body.name or body.email.split("@")[0].title(),
            role="citizen",
            google_id=body.google_id or f"goog-{abs(hash(body.email))}",
            ward_id="WARD-DL-01"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if body.name and not user.name:
            user.name = body.name
            db.commit()

    token = create_access_token({
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "name": user.name,
        "ward_id": user.ward_id,
        "email": user.email
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        name=user.name,
        ward_id=user.ward_id,
        email=user.email,
        police_badge_id=user.police_badge_id,
        department=user.department
    )

@router.post("/login", response_model=TokenResponse)
def official_login(body: OfficialLogin, db: Session = Depends(get_db)):
    identifier = body.identifier or body.phone
    user = None
    if identifier:
        user = db.query(UserModel).filter(
            (UserModel.email == identifier) | (UserModel.phone == identifier)
        ).first()

    if not user:
        # Check by role
        user = db.query(UserModel).filter(UserModel.role == body.role).first()

    if not user:
        # Seed user dynamically if missing
        phone_val = body.phone or "+919876543200"
        user = UserModel(
            phone=phone_val,
            email=body.identifier if (body.identifier and "@" in body.identifier) else None,
            name=body.name or f"Official ({body.role.capitalize()})",
            role=body.role,
            ward_id="WARD-DL-01",
            police_badge_id=body.police_badge_id if body.role == "police" else None,
            department="Cyber Crime & Video Surveillance Division" if body.role == "police" else "Municipal Operations"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Enforce role match or upgrade official
        if body.role and user.role != body.role:
            user.role = body.role
            if body.police_badge_id:
                user.police_badge_id = body.police_badge_id
            db.commit()

    token = create_access_token({
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "name": user.name,
        "ward_id": user.ward_id,
        "email": user.email,
        "police_badge_id": user.police_badge_id
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        name=user.name,
        ward_id=user.ward_id,
        email=user.email,
        police_badge_id=user.police_badge_id,
        department=user.department
    )

@router.get("/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "role": u.role,
            "email": u.email,
            "phone": u.phone,
            "ward_id": u.ward_id,
            "police_badge_id": u.police_badge_id,
            "department": u.department
        }
        for u in users
    ]

@router.get("/me")
def get_me(current_user: UserModel = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "name": current_user.name,
        "role": current_user.role,
        "ward_id": current_user.ward_id,
        "email": current_user.email,
        "police_badge_id": current_user.police_badge_id,
        "department": current_user.department,
        "created_at": current_user.created_at
    }
