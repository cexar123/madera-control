# Autor: Miembro 4
# MaderaControl v1.0 - Schemas Pydantic del microservicio IA

from typing import Optional, List, Literal
from pydantic import BaseModel


class ProductoStockSchema(BaseModel):
    id: int
    nombre: str
    tipo_madera: str
    stock_actual: int
    stock_minimo: int


class VentaHistorialSchema(BaseModel):
    fecha: str
    producto_id: int
    cantidad: int


class PrediccionResponseSchema(BaseModel):
    producto_id: int
    nombre: str
    tipo_madera: Optional[str] = None
    stock_actual: int
    stock_minimo: int
    demanda_estimada_semana: float
    demanda_diaria_promedio: float
    dias_restantes: float
    alerta: bool
    nivel_alerta: Literal["critico", "bajo", "normal"]
    recomendacion: str
    confianza: float


class ResumenPrediccionSchema(BaseModel):
    total_productos: int
    criticos: int
    bajos: int
    normales: int
    productos_criticos: List[PrediccionResponseSchema]
