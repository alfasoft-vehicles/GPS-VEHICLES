from sqlalchemy import Column, DateTime, CHAR, Integer
from config.dbconnection import Base

class Grupos(Base):
  __tablename__ = 'GRUPOS'

  ID = Column(CHAR(5), nullable=False, primary_key=True)
  NOMBRE = Column(CHAR(30))
  MANEJAEXIS = Column(Integer)
  USU_CREADO = Column(CHAR(12))
  FEC_CREADO = Column(DateTime)
  USU_MODIFI = Column(CHAR(12))
  FEC_MODIFI = Column(DateTime)