from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, Content
from auth import get_current_user

router = APIRouter(prefix="/api/contents", tags=["contents"])


class ContentCreate(BaseModel):
    title: str
    platform: str  # netflix / youtube
    url: str = ""


@router.get("")
def list_contents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contents = db.query(Content).filter(Content.user_id == user.id).order_by(Content.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "platform": c.platform,
            "url": c.url,
            "expression_count": len(c.expressions),
        }
        for c in contents
    ]


@router.post("")
def create_content(req: ContentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.title.strip():
        raise HTTPException(400, "콘텐츠 제목을 입력해주세요")
    content = Content(user_id=user.id, title=req.title.strip(), platform=req.platform, url=req.url)
    db.add(content)
    db.commit()
    db.refresh(content)
    return {"id": content.id, "title": content.title, "platform": content.platform, "url": content.url}


@router.delete("/{content_id}")
def delete_content(content_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = db.query(Content).filter(Content.id == content_id, Content.user_id == user.id).first()
    if not content:
        raise HTTPException(404, "콘텐츠를 찾을 수 없습니다")
    db.delete(content)
    db.commit()
    return {"ok": True}
