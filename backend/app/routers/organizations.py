from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import Organization
from app.models.hotel import Hotel
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationOut, StaffCreate, StaffOut
from app.schemas.hotel import HotelCreate, HotelOut
from app.services.auth_service import require_role, get_password_hash

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("", response_model=List[OrganizationOut])
def list_organizations(db: Session = Depends(get_db)):
    """
    List all organizations and their hotels for customer exploration and hierarchy browsing.
    """
    return db.query(Organization).all()

@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(org_id: int, db: Session = Depends(get_db)):
    """
    Get organization details and associated hotels.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization {org_id} not found."
        )
    return org

@router.get("/{org_id}/hotels", response_model=List[HotelOut])
def list_org_hotels(org_id: int, db: Session = Depends(get_db)):
    """
    List all active hotels belonging to a specific organization.
    """
    hotels = db.query(Hotel).filter(Hotel.organization_id == org_id, Hotel.status == "active").all()
    return hotels

@router.post("/{org_id}/hotels", response_model=HotelOut, status_code=status.HTTP_201_CREATED)
def add_hotel_to_org(
    org_id: int,
    hotel_in: HotelCreate,
    db: Session = Depends(get_db),
    # Strict RBAC: Admin only
    current_admin: User = Depends(require_role(["admin"]))
):
    """
    Add a new hotel under this organization.
    Strict Tenant Isolation: An Admin can ONLY manage their own organization's hotels.
    """
    if current_admin.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have administrative authority over this organization."
        )

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization {org_id} does not exist."
        )

    hotel_data = hotel_in.model_dump()
    hotel_data["organization_id"] = org_id
    hotel = Hotel(**hotel_data)
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel

@router.get("/{org_id}/staff", response_model=List[StaffOut])
def list_org_staff(
    org_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(["admin"]))
):
    """
    View all staff assigned to this organization.
    Strict Tenant Isolation: Admin can only view staff within their own organization.
    """
    if current_admin.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view staff of another organization."
        )

    staff = db.query(User).filter(
        User.organization_id == org_id,
        User.role.in_(["admin", "receptionist"])
    ).all()
    return staff

@router.post("/{org_id}/staff", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def add_receptionist_to_org(
    org_id: int,
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(["admin"]))
):
    """
    Assign/create a new receptionist under this organization.
    Strict Tenant Isolation: Admin can only assign staff to their own organization.
    """
    if current_admin.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot assign staff to another organization."
        )

    existing = db.query(User).filter(User.email == staff_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    new_staff = User(
        name=staff_in.name,
        email=staff_in.email.lower(),
        password_hash=get_password_hash(staff_in.password),
        role=staff_in.role,
        organization_id=org_id
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff
