from sqlalchemy import Column, Date, CHAR, Integer, Text, DECIMAL
from config.dbconnection import Base

class Propietarios(Base):
  __tablename__ = 'PROPIETARIOS'

  ID = Column(CHAR(4), nullable=False, primary_key=True)
  NOMBRE = Column(CHAR(50))
  RUC = Column(CHAR(30))
  ID_CIUDAD = Column(CHAR(5))
  DIRECCION = Column(CHAR(120))
  TELEFONO = Column(CHAR(20))
  TELEFONO1 = Column(CHAR(20))
  CONTACTO = Column(CHAR(40))
  REP_LEGAL = Column(CHAR(40))
  CORREO = Column(CHAR(50))
  CORREO1 = Column(CHAR(50))
  VLR_ADMON = Column(DECIMAL(8, 2))
  IVA = Column(Integer)
  DESCUENTO = Column(DECIMAL(5, 2))
  LISTA = Column(Integer)
  FEC_INGRES = Column(Date)
  FEC_FACTUR = Column(Date)
  PLANPAGO = Column(Integer)
  ESTADO = Column(Integer)
  FEC_ESTADO = Column(Date)
  ID_USUARIO = Column(CHAR(12))
  NOMUSUARIO = Column(CHAR(40))
  OBSERVA = Column(Text)
  VEHICULOS = Column(Integer)
  USU_CREADO = Column(CHAR(12))
  FEC_CREADO = Column(Date)
  USU_MODIFI = Column(CHAR(12))
  FEC_MODIFI = Column(Date)