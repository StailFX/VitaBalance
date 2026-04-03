from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Provide a transactional database session.

    Uses begin() to wrap the session in an explicit transaction:
    - Auto-commits on successful completion
    - Auto-rolls back on any exception
    This eliminates the need for manual commit() calls in routers/services.
    """
    async with async_session() as session:
        async with session.begin():
            yield session
