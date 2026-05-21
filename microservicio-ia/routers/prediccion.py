# MaderaControl v2.0 - Endpoints HTTP del microservicio IA
# Consulta el backend Node.js (reenviando el JWT del usuario)
# y aplica el motor de prediccion para devolver:
#   - Predicciones por producto con nivel de alerta
#   - Cantidades sugeridas de reabastecimiento (lead time + dias objetivo)
#   - Tendencias (subiendo / estable / bajando)
#   - Score de riesgo de stockout (0-100)
#   - Top clientes (analiza ventas reales del backend)

import os
from typing import List, Optional, Dict
from collections import defaultdict

import httpx
from fastapi import APIRouter, HTTPException, Header, Query

from services.prediccion_service import construir_prediccion

router = APIRouter()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
HTTP_TIMEOUT = 15.0


# -----------------------------------------------------------------------------
# Helpers HTTP al backend (siempre reenvian el JWT del usuario)
# -----------------------------------------------------------------------------

def _build_headers(authorization: Optional[str]) -> dict:
    headers = {"X-Service": "ia-microservice"}
    if authorization:
        headers["Authorization"] = authorization
    return headers


async def _fetch_resumen_stock(authorization: Optional[str]) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(
                f"{BACKEND_URL}/api/inventario/resumen",
                headers=_build_headers(authorization)
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503,
                            detail=f"No se pudo consultar el backend: {str(e)}")


async def _fetch_movimientos_producto(producto_id: int, authorization: Optional[str]) -> List[dict]:
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


async def _fetch_ventas(authorization: Optional[str]) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(
                f"{BACKEND_URL}/api/ventas",
                headers=_build_headers(authorization)
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503,
                            detail=f"No se pudo consultar el backend: {str(e)}")


async def _predicciones_de_todos(authorization: Optional[str]) -> List[dict]:
    productos = await _fetch_resumen_stock(authorization)
    predicciones = []
    for p in productos:
        historial = await _fetch_movimientos_producto(p["id"], authorization)
        predicciones.append(construir_prediccion(p, historial))
    return predicciones


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/stock-critico")
async def obtener_stock_critico(authorization: Optional[str] = Header(None)):
    """Lista TODOS los productos con su prediccion ordenados por urgencia."""
    predicciones = await _predicciones_de_todos(authorization)
    predicciones.sort(key=lambda x: (x["dias_restantes"], -x["riesgo_stockout"]))
    return predicciones


@router.get("/producto/{producto_id}")
async def prediccion_producto(producto_id: int,
                              authorization: Optional[str] = Header(None)):
    """Prediccion detallada para un producto + proyeccion 30 dias."""
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
        proyeccion.append({"dia": dia, "stock_proyectado": round(stock_proyectado, 2)})

    return {**prediccion, "proyeccion_30_dias": proyeccion}


@router.get("/resumen")
async def resumen_predicciones(authorization: Optional[str] = Header(None)):
    """Resumen agregado para la pantalla principal."""
    predicciones = await _predicciones_de_todos(authorization)

    criticos = [p for p in predicciones if p["nivel_alerta"] == "critico"]
    bajos = [p for p in predicciones if p["nivel_alerta"] == "bajo"]
    normales = [p for p in predicciones if p["nivel_alerta"] == "normal"]

    riesgo_promedio = (
        round(sum(p["riesgo_stockout"] for p in predicciones) / len(predicciones))
        if predicciones else 0
    )
    confianza_promedio = (
        round(sum(p["confianza"] for p in predicciones) / len(predicciones), 2)
        if predicciones else 0
    )

    return {
        "total_productos": len(predicciones),
        "criticos": len(criticos),
        "bajos": len(bajos),
        "normales": len(normales),
        "riesgo_promedio": riesgo_promedio,
        "confianza_promedio": confianza_promedio,
        "productos_criticos": criticos
    }


@router.get("/recomendaciones-compra")
async def recomendaciones_compra(authorization: Optional[str] = Header(None)):
    """Lista de productos que se recomienda reabastecer (urgentes + bajos)."""
    predicciones = await _predicciones_de_todos(authorization)
    a_reabastecer = [p for p in predicciones if p["cantidad_a_reabastecer"] > 0]
    a_reabastecer.sort(key=lambda x: (-x["riesgo_stockout"], x["dias_restantes"]))
    total_unidades = sum(p["cantidad_a_reabastecer"] for p in a_reabastecer)
    return {
        "total_productos": len(a_reabastecer),
        "total_unidades_sugeridas": total_unidades,
        "productos": a_reabastecer
    }


@router.get("/tendencias")
async def tendencias(authorization: Optional[str] = Header(None)):
    """Devuelve los productos agrupados por tendencia (subiendo, estable, bajando)."""
    predicciones = await _predicciones_de_todos(authorization)
    grupos = {"subiendo": [], "estable": [], "bajando": [], "sin_datos": []}
    for p in predicciones:
        nivel = p["tendencia"]["nivel"]
        grupos.setdefault(nivel, []).append({
            "producto_id": p["producto_id"],
            "nombre": p["nombre"],
            "tipo_madera": p["tipo_madera"],
            "cambio_porcentual_semana": p["tendencia"].get("cambio_porcentual_semana", 0),
            "demanda_semana": p["demanda_estimada_semana"]
        })
    # Ordenar cada grupo por magnitud del cambio
    for k in grupos:
        grupos[k].sort(key=lambda x: abs(x["cambio_porcentual_semana"]), reverse=True)
    return grupos


@router.get("/top-clientes")
async def top_clientes(limite: int = Query(10, ge=1, le=50),
                       authorization: Optional[str] = Header(None)):
    """Analiza las ventas confirmadas y devuelve el top de clientes por monto."""
    ventas = await _fetch_ventas(authorization)
    agrupado: Dict[str, dict] = defaultdict(lambda: {
        "cliente": None, "ruc": None, "compras": 0,
        "monto_total": 0.0, "ticket_promedio": 0.0
    })
    for v in ventas:
        if v.get("estado") != "confirmada":
            continue
        nombre = v.get("cliente_razon_social") or "Cliente sin nombre"
        ruc = v.get("cliente_ruc")
        key = f"{nombre}|{ruc or ''}"
        bucket = agrupado[key]
        bucket["cliente"] = nombre
        bucket["ruc"] = ruc
        bucket["compras"] += 1
        bucket["monto_total"] += float(v.get("total") or 0)

    resultado = []
    for bucket in agrupado.values():
        if bucket["compras"] > 0:
            bucket["ticket_promedio"] = round(bucket["monto_total"] / bucket["compras"], 2)
            bucket["monto_total"] = round(bucket["monto_total"], 2)
            resultado.append(bucket)

    resultado.sort(key=lambda x: x["monto_total"], reverse=True)
    return resultado[:limite]
