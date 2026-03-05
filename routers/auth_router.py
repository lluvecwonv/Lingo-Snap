from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, seed_data_for_user
from models import User
from auth import hash_password, verify_password, create_session_token, get_current_user, SESSION_MAX_AGE

router = APIRouter(prefix="/api", tags=["auth"])


class AuthRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
def register(req: AuthRequest, db: Session = Depends(get_db)):
    if len(req.username) < 2:
        raise HTTPException(400, "아이디는 2자 이상이어야 합니다")
    if len(req.password) < 4:
        raise HTTPException(400, "비밀번호는 4자 이상이어야 합니다")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "이미 존재하는 아이디입니다")

    user = User(username=req.username, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed initial data for new user
    seed_data_for_user(user.id, db)

    token = create_session_token(user.id)
    resp = JSONResponse({"user_id": user.id, "username": user.username})
    resp.set_cookie("session", token, max_age=SESSION_MAX_AGE, httponly=True, samesite="lax")
    return resp


@router.post("/login")
def login(req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "아이디 또는 비밀번호가 틀렸습니다")

    token = create_session_token(user.id)
    resp = JSONResponse({"user_id": user.id, "username": user.username})
    resp.set_cookie("session", token, max_age=SESSION_MAX_AGE, httponly=True, samesite="lax")
    return resp


@router.post("/logout")
def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("session")
    return resp


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"user_id": user.id, "username": user.username}
