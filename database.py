import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use DATABASE_URL (Vercel Postgres / Neon) if available, otherwise SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Neon/Vercel Postgres: fix scheme for SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "lingo_snap.db")
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import User, Content, Expression
    Base.metadata.create_all(bind=engine)


def seed_data_for_user(user_id: int, db):
    """Import data.json expressions for a new user's first content."""
    from models import Content, Expression

    # Only seed if user has no contents yet
    if db.query(Content).filter(Content.user_id == user_id).count() > 0:
        return

    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    if not os.path.exists(data_path):
        return

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    expressions = data.get("expressions", [])
    if not expressions:
        return

    content = Content(
        user_id=user_id,
        title="Emily in Paris",
        platform="netflix",
        url=""
    )
    db.add(content)
    db.flush()

    for expr in expressions:
        db.add(Expression(
            content_id=content.id,
            expression=expr["expression"],
            korean_meaning=expr["korean_meaning"],
            korean_explanation=expr.get("korean_explanation", ""),
            usage_examples=json.dumps(expr.get("usage_examples", []), ensure_ascii=False),
            season=expr.get("source", {}).get("season", 1),
            episode=expr.get("source", {}).get("episode", 1),
            scene_note=expr.get("source", {}).get("scene_note", ""),
            tags=json.dumps(expr.get("tags", []), ensure_ascii=False),
            difficulty=expr.get("difficulty", "intermediate"),
            review_count=0
        ))

    db.commit()
