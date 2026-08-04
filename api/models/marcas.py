from sqlalchemy import Column, DateTime, CHAR
from config.dbconnection import Base

class Marcas(Base):
  __tablename__ = 'MARCAS'

  ID = Column(CHAR(2), nullable=False, primary_key=True)
  NOMBRE = Column(CHAR(30))
  ESTADO = Column(CHAR(1))
  FEC_ESTADO = Column(DateTime)
  USU_CREADO = Column(CHAR(12))
  FEC_CREADO = Column(DateTime)
  USU_MODIFI = Column(CHAR(12))
  FEC_MODIFI = Column(DateTime)