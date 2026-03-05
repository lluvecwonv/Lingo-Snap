import json
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    contents = relationship("Content", back_populates="user", cascade="all, delete-orphan")


class Content(Base):
    __tablename__ = "contents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    platform = Column(String(20), nullable=False)  # netflix / youtube
    url = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="contents")
    expressions = relationship("Expression", back_populates="content", cascade="all, delete-orphan")


class Expression(Base):
    __tablename__ = "expressions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    content_id = Column(Integer, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False)
    expression = Column(Text, nullable=False)
    korean_meaning = Column(Text, nullable=False)
    korean_explanation = Column(Text, default="")
    detail_explanation = Column(Text, default="")
    usage_examples = Column(Text, default="[]")  # JSON string
    season = Column(Integer, default=1)
    episode = Column(Integer, default=1)
    scene_note = Column(Text, default="")
    tags = Column(Text, default="[]")  # JSON string
    difficulty = Column(String(20), default="intermediate")
    date_added = Column(Date, default=date.today)
    review_count = Column(Integer, default=0)
    content = relationship("Content", back_populates="expressions")

    def to_dict(self):
        return {
            "id": self.id,
            "content_id": self.content_id,
            "expression": self.expression,
            "korean_meaning": self.korean_meaning,
            "korean_explanation": self.korean_explanation,
            "detail_explanation": self.detail_explanation or "",
            "usage_examples": json.loads(self.usage_examples) if self.usage_examples else [],
            "season": self.season,
            "episode": self.episode,
            "scene_note": self.scene_note,
            "tags": json.loads(self.tags) if self.tags else [],
            "difficulty": self.difficulty,
            "date_added": str(self.date_added) if self.date_added else None,
            "review_count": self.review_count,
        }
