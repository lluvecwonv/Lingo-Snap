import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from database import get_db
from models import User, Content, Expression
from auth import get_current_user
from gpt_service import generate_expression_data, generate_structure_data

router = APIRouter(prefix="/api", tags=["expressions"])


class ExpressionCreate(BaseModel):
    expression: str
    korean_meaning: str
    korean_explanation: str = ""
    detail_explanation: str = ""
    usage_examples: list = []
    season: int = 1
    episode: int = 1
    scene_note: str = ""
    tags: list = []
    difficulty: str = "intermediate"


class ExpressionUpdate(ExpressionCreate):
    pass


class GenerateRequest(BaseModel):
    expression: str
    platform: str = ""


def _check_content_access(content_id: int, user: User, db: Session) -> Content:
    content = db.query(Content).filter(Content.id == content_id, Content.user_id == user.id).first()
    if not content:
        raise HTTPException(404, "콘텐츠를 찾을 수 없습니다")
    return content


@router.get("/contents/{content_id}/expressions")
def list_expressions(
    content_id: int,
    search: str = Query("", alias="search"),
    season: int = Query(0, alias="season"),
    episode: int = Query(0, alias="episode"),
    difficulty: str = Query("", alias="difficulty"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_content_access(content_id, user, db)

    q = db.query(Expression).filter(Expression.content_id == content_id)
    if season:
        q = q.filter(Expression.season == season)
    if episode:
        q = q.filter(Expression.episode == episode)
    if difficulty:
        q = q.filter(Expression.difficulty == difficulty)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Expression.expression.ilike(like)) |
            (Expression.korean_meaning.ilike(like)) |
            (Expression.korean_explanation.ilike(like)) |
            (Expression.tags.ilike(like))
        )

    expressions = q.order_by(Expression.id.desc()).all()
    return [e.to_dict() for e in expressions]


@router.post("/contents/{content_id}/expressions")
def create_expression(
    content_id: int,
    req: ExpressionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_content_access(content_id, user, db)

    expr = Expression(
        content_id=content_id,
        expression=req.expression,
        korean_meaning=req.korean_meaning,
        korean_explanation=req.korean_explanation,
        detail_explanation=req.detail_explanation,
        usage_examples=json.dumps(req.usage_examples, ensure_ascii=False),
        season=req.season,
        episode=req.episode,
        scene_note=req.scene_note,
        tags=json.dumps(req.tags, ensure_ascii=False),
        difficulty=req.difficulty,
    )
    db.add(expr)
    db.commit()
    db.refresh(expr)
    return expr.to_dict()


@router.put("/contents/{content_id}/expressions/{expr_id}")
def update_expression(
    content_id: int,
    expr_id: int,
    req: ExpressionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_content_access(content_id, user, db)
    expr = db.query(Expression).filter(Expression.id == expr_id, Expression.content_id == content_id).first()
    if not expr:
        raise HTTPException(404, "표현을 찾을 수 없습니다")

    expr.expression = req.expression
    expr.korean_meaning = req.korean_meaning
    expr.korean_explanation = req.korean_explanation
    expr.detail_explanation = req.detail_explanation
    expr.usage_examples = json.dumps(req.usage_examples, ensure_ascii=False)
    expr.season = req.season
    expr.episode = req.episode
    expr.scene_note = req.scene_note
    expr.tags = json.dumps(req.tags, ensure_ascii=False)
    expr.difficulty = req.difficulty
    db.commit()
    db.refresh(expr)
    return expr.to_dict()


@router.delete("/contents/{content_id}/expressions/{expr_id}")
def delete_expression(
    content_id: int,
    expr_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_content_access(content_id, user, db)
    expr = db.query(Expression).filter(Expression.id == expr_id, Expression.content_id == content_id).first()
    if not expr:
        raise HTTPException(404, "표현을 찾을 수 없습니다")
    db.delete(expr)
    db.commit()
    return {"ok": True}


@router.get("/contents/{content_id}/expressions/random")
def random_expression(
    content_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_content_access(content_id, user, db)
    expr = db.query(Expression).filter(Expression.content_id == content_id).order_by(func.random()).first()
    if not expr:
        raise HTTPException(404, "표현이 없습니다")
    return expr.to_dict()


@router.get("/expressions/random")
def global_random_expression(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Random expression from ALL user contents."""
    user_content_ids = [c.id for c in db.query(Content).filter(Content.user_id == user.id).all()]
    if not user_content_ids:
        raise HTTPException(404, "콘텐츠가 없습니다")
    expr = db.query(Expression).filter(Expression.content_id.in_(user_content_ids)).order_by(func.random()).first()
    if not expr:
        raise HTTPException(404, "표현이 없습니다")
    result = expr.to_dict()
    # Include content title for display
    content = db.query(Content).filter(Content.id == expr.content_id).first()
    result["content_title"] = content.title if content else ""
    return result


@router.post("/generate")
def generate(req: GenerateRequest, user: User = Depends(get_current_user)):
    if not req.expression.strip():
        raise HTTPException(400, "영어 표현을 입력해주세요")
    try:
        result = generate_expression_data(req.expression.strip(), req.platform)
        return result
    except Exception as e:
        raise HTTPException(502, f"GPT 생성 오류: {str(e)}")


@router.post("/generate-structure")
def generate_structure(req: GenerateRequest, user: User = Depends(get_current_user)):
    if not req.expression.strip():
        raise HTTPException(400, "영어 문장을 입력해주세요")
    try:
        result = generate_structure_data(req.expression.strip(), req.platform)
        return result
    except Exception as e:
        raise HTTPException(502, f"GPT 생성 오류: {str(e)}")
