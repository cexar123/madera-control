# Autor: Miembro 4
# MaderaControl v1.0 - Logica de prediccion de stock
# Implementa promedio ponderado de las ultimas semanas, calculo de
# dias restantes y nivel de alerta para cada producto.

from typing import List, Dict
from datetime import datetime, timedelta

import numpy as np


CONFIANZA_MINIMA = 0.3


def _agrupar_ventas_por_dia(historial: List[Dict]) -> Dict[str, int]:
    """Agrupa el historial de ventas por dia para el producto consultado."""
    por_dia: Dict[str, int] = {}
    for v in historial:
        fecha = v.get("fecha")
        cantidad = int(v.get("cantidad", 0))
        if not fecha:
            continue
        dia = fecha[:10]
        por_dia[dia] = por_dia.get(dia, 0) + cantidad
    return por_dia


def calcular_demanda_estimada(historial: List[Dict]) -> Dict:
    """
    Calcula la demanda semanal esperada usando promedio ponderado:
    los dias mas recientes pesan mas que los antiguos.

    Si hay menos de 7 dias con ventas, retorna confianza 0.3 y
    el mensaje 'Modelo en aprendizaje'.
    """
    por_dia = _agrupar_ventas_por_dia(historial)

    if len(por_dia) < 7:
        promedio_diario = (
            sum(por_dia.values()) / max(len(por_dia), 1) if por_dia else 0.0
        )
        return {
            "demanda_diaria_promedio": round(promedio_diario, 2),
            "demanda_semana": round(promedio_diario * 7, 2),
            "confianza": CONFIANZA_MINIMA,
            "mensaje": "Modelo en aprendizaje",
        }

    hoy = datetime.utcnow().date()
    cantidades = []
    pesos = []
    for i in range(30):
        dia = (hoy - timedelta(days=i)).isoformat()
        cantidades.append(por_dia.get(dia, 0))
        # Los dias mas recientes pesan mas (decay lineal)
        pesos.append(max(1.0, 30 - i))

    cantidades_arr = np.array(cantidades, dtype=float)
    pesos_arr = np.array(pesos, dtype=float)

    promedio_ponderado = float(np.sum(cantidades_arr * pesos_arr) / np.sum(pesos_arr))
    demanda_semana = promedio_ponderado * 7

    dias_con_ventas = sum(1 for c in cantidades if c > 0)
    confianza = min(0.95, 0.5 + (dias_con_ventas / 30) * 0.5)

    return {
        "demanda_diaria_promedio": round(promedio_ponderado, 2),
        "demanda_semana": round(demanda_semana, 2),
        "confianza": round(confianza, 2),
        "mensaje": "OK",
    }


def calcular_dias_restantes(stock_actual: int, demanda_diaria: float) -> float:
    if demanda_diaria <= 0:
        return 999.0
    return round(stock_actual / demanda_diaria, 1)


def determinar_nivel_alerta(dias_restantes: float) -> str:
    if dias_restantes < 3:
        return "critico"
    if dias_restantes < 7:
        return "bajo"
    return "normal"


def generar_recomendacion(producto: Dict, dias_restantes: float, demanda_semana: float) -> str:
    nombre = producto.get("nombre", "el producto")
    stock = producto.get("stock_actual", 0)

    if demanda_semana <= 0:
        return (
            f"{nombre} no presenta movimiento de ventas reciente. "
            "Revisar si se debe descontinuar o promocionar."
        )

    if dias_restantes < 3:
        sugerido = max(50, int(round(demanda_semana * 2)))
        return (
            f"URGENTE: Reabastecer al menos {sugerido} unidades de {nombre} "
            f"de inmediato. Quedan aprox. {dias_restantes} dias de stock con "
            f"una demanda estimada de {demanda_semana:.0f} unidades por semana."
        )

    if dias_restantes < 7:
        sugerido = max(30, int(round(demanda_semana * 1.5)))
        return (
            f"Se recomienda reabastecer aprox. {sugerido} unidades de {nombre} "
            f"esta semana. Stock actual: {stock} unidades, demanda semanal "
            f"estimada: {demanda_semana:.0f} unidades."
        )

    return (
        f"Stock saludable para {nombre}: {stock} unidades, "
        f"alcanza para {dias_restantes:.0f} dias segun la demanda estimada."
    )


def construir_prediccion(producto: Dict, historial: List[Dict]) -> Dict:
    estimacion = calcular_demanda_estimada(historial)
    demanda_diaria = estimacion["demanda_diaria_promedio"]
    demanda_semana = estimacion["demanda_semana"]

    stock_actual = int(producto.get("stock_actual", 0))
    dias_restantes = calcular_dias_restantes(stock_actual, demanda_diaria)
    nivel = determinar_nivel_alerta(dias_restantes)
    recomendacion = generar_recomendacion(producto, dias_restantes, demanda_semana)

    return {
        "producto_id": producto.get("id"),
        "nombre": producto.get("nombre"),
        "tipo_madera": producto.get("tipo_madera"),
        "stock_actual": stock_actual,
        "stock_minimo": int(producto.get("stock_minimo", 0)),
        "demanda_estimada_semana": demanda_semana,
        "demanda_diaria_promedio": demanda_diaria,
        "dias_restantes": dias_restantes,
        "alerta": nivel in ("critico", "bajo"),
        "nivel_alerta": nivel,
        "recomendacion": recomendacion,
        "confianza": estimacion["confianza"],
    }
