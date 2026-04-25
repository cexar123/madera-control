# Autor: Miembro 4
# MaderaControl v1.0 - Endpoints HTTP del microservicio IA
# Consulta el backend Node.js (reenviando el JWT del usuario)
# y aplica el motor de prediccion para devolver recomendaciones.

import os
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Header

from services.prediccion_service import construir_prediccion

router = APIRouter()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
HTTP_TIMEOUT = 10.0


def _build_headers(authorization: Optional[str]) -> dict:
    headers = {"X-Service": "ia-microservice"}
    if authorization:
        headers["Authorization"] = authorization
    return headers


async def _fetch_resumen_stock(authorization: Optional[str]) -> List[dict]:
    """Llama al backend Node.js para traer el resumen de stock actual."""
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(
                f"{BACKEND_URL}/api/inventario/resumen",
                headers=_build_headers(authorization)
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo consultar el backend: {str(e)}"
        )


async def _fetch_movimientos_producto(producto_id: int, authorization: Optional[str]) -> List[dict]:
    """Trae los movimientos de salida (ventas) de los ultimos 30 dias."""
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(
                f"{BACKEND_URL}/api/inventario/movimientos",
                params={"producto_id": producto_id, "tipo": "salida"},
                headers=_build_headers(authorization)
            )
            r.raise_for_status()
            movimientos = r.json()
    except httpx.HTTPError:
        return []

    return [
        {
            "fecha": m.get("created_at"),
            "producto_id": m.get("producto_id"),
            "cantidad": m.get("cantidad", 0)
        }
        for m in movimientos
    ]


@router.get("/stock-critico")
async def obtener_stock_critico(authorization: Optional[str] = Header(None)):
    """Lista todos los productos con su prediccion de stock."""
    productos = await _fetch_resumen_stock(authorization)
    predicciones = []

    for p in productos:
        historial = await _fetch_movimientos_producto(p["id"], authorization)
        prediccion = construir_prediccion(p, historial)
        predicciones.append(prediccion)

    predicciones.sort(key=lambda x: x["dias_restantes"])
    return predicciones


@router.get("/producto/{producto_id}")
async def prediccion_producto(producto_id: int, authorization: Optional[str] = Header(None)):
    """Prediccion detallada para un producto especifico, con proyeccion de 30 dias."""
    productos = await _fetch_resumen_stock(authorization)
    producto = next((p for p in productos if p["id"] == producto_id), None)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    historial = await _fetch_movimientos_producto(producto_id, authorization)
    prediccion = construir_prediccion(producto, historial)

    demanda_diaria = prediccion["demanda_diaria_promedio"]
    proyeccion = []
    stock_proyectado = producto["stock_actual"]
    for dia in range(1, 31):
        stock_proyectado = max(0, stock_proyectado - demanda_diaria)
        proyeccion.append({
            "dia": dia,
            "stock_proyectado": round(stock_proyectado, 2)
        })

    return {
        **prediccion,
        "proyeccion_30_dias": proyeccion
    }


@router.get("/resumen")
async def resumen_predicciones(authorization: Optional[str] = Header(None)):
    """Cuenta cuantos productos hay en cada nivel de alerta."""
    productos = await _fetch_resumen_stock(authorization)
    predicciones = []

    for p in productos:
        historial = await _fetch_movimientos_producto(p["id"], authorization)
        predicciones.append(construir_prediccion(p, historial))

    criticos = [p for p in predicciones if p["nivel_alerta"] == "critico"]
    bajos = [p for p in predicciones if p["nivel_alerta"] == "bajo"]
    normales = [p for p in predicciones if p["nivel_alerta"] == "normal"]

    return {
        "total_productos": len(predicciones),
        "criticos": len(criticos),
        "bajos": len(bajos),
        "normales": len(normales),
        "productos_criticos": criticos
    }
