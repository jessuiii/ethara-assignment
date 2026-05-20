import os
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Strip pgbouncer parameter from query as asyncpg does not accept it
if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)
    query_params.pop("pgbouncer", None)
    new_query = urlencode(query_params, doseq=True)
    parsed = parsed._replace(query=new_query)
    DATABASE_URL = urlunparse(parsed)

# asyncpg requires postgresql+asyncpg:// scheme
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("NODE_ENV") != "production",
    pool_size=5,
    max_overflow=0,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
