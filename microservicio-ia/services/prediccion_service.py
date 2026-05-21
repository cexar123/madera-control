# MaderaControl v2.0 - Motor de prediccion al 100%
# Algoritmos implementados:
#   1) Serie de tiempo diaria construida a partir de los movimientos de salida
#   2) Promedio movil ponderado (mas peso a los dias recientes)
#   3) Regresion lineal (least squares) para detectar tendencia
#   4) Factor estacional por dia de semana (si hay suficiente historia)
#   5) Demanda proyectada = MA ponderada + ajuste por tendencia
#   6) Confianza basada en cobertura + consistencia (coeficiente de variacion)
#   7) Calculo de cantidad sugerida de reabastecimiento considerando lead time
#   8) Score de riesgo de stockout (0-100)
#   9) Recomendacion en lenguaje natural en espanol con contexto de tendencia

from typing import List, Dict, Optional
from datetime import datetime, timedelta

import numpy as np


LEAD_TIME_DIAS = 7
DIAS_OBJETIVO_STOCK = 14
DIAS_HISTORIAL = 30
DIAS_CRITICO = 3
DIAS_BAJO = 7
CONFIANZA_MINIMA = 0.30


# -----------------------------------------------------------------------------
# Preparacion de datos
# -----------------------------------------------------------------------------

def agrupar_ventas_por_dia(historial: List[Dict]) -> Dict[str, int]:
    por_dia: Dict[str, int] = {}
    for v in historial:
        fecha = (v.get("fecha") or "")[:10]
        cantidad = int(v.get("cantidad") or 0)
        if not fecha or cantidad <= 0:
            continue
        por_dia[fecha] = por_dia.get(fecha, 0) + cantidad
    return por_dia


def construir_serie_diaria(por_dia: Dict[str, int], dias: int = DIAS_HISTORIAL):
    hoy = datetime.utcnow().date()
    serie = []
    fechas = []
    for i in range(dias - 1, -1, -1):
        d = hoy - timedelta(days=i)
        serie.append(por_dia.get(d.isoformat(), 0))
        fechas.append(d)
    return np.array(serie, dtype=float), fechas


# -----------------------------------------------------------------------------
# Algoritmos
# -----------------------------------------------------------------------------

def calcular_tendencia(serie: np.ndarray) -> Dict:
    n = len(serie)
    if n < 7 or serie.sum() == 0:
        return {"pendiente": 0.0, "nivel": "sin_datos", "cambio_porcentual_semana": 0.0}

    x = np.arange(n, dtype=float)
    try:
        pendiente, _ = np.polyfit(x, serie, 1)
    except Exception:
        return {"pendiente": 0.0, "nivel": "sin_datos", "cambio_porcentual_semana": 0.0}

    promedio = float(serie.mean())
    if promedio <= 0.01:
        return {"pendiente": float(pendiente), "nivel": "sin_datos", "cambio_porcentual_semana": 0.0}

    cambio_relativo_diario = pendiente / promedio
    cambio_porcentual_semana = round(cambio_relativo_diario * 7 * 100, 1)

    if cambio_relativo_diario > 0.03:
        nivel = "subiendo"
    elif cambio_relativo_diario < -0.03:
        nivel = "bajando"
    else:
        nivel = "estable"

    return {
        "pendiente": float(pendiente),
        "nivel": nivel,
        "cambio_porcentual_semana": cambio_porcentual_semana
    }


def factor_dia_semana(serie: np.ndarray, fechas) -> Optional[Dict[int, float]]:
    if len(serie) < 14:
        return None

    promedio = float(serie.mean()) or 1.0
    buckets: Dict[int, list] = {i: [] for i in range(7)}
    for cantidad, fecha in zip(serie, fechas):
        buckets[fecha.weekday()].append(float(cantidad))

    factores = {}
    for dia, valores in buckets.items():
        factores[dia] = round(float(np.mean(valores)) / promedio, 2) if valores else 1.0
    return factores


def calcular_confianza(serie: np.ndarray) -> float:
    n = len(serie)
    if n == 0:
        return CONFIANZA_MINIMA
    dias_con_ventas = int((serie > 0).sum())
    cobertura = dias_con_ventas / n

    promedio = float(serie.mean())
    if promedio <= 0:
        return CONFIANZA_MINIMA
    std = float(serie.std())
    cv = std / max(promedio, 0.1)
    consistencia = max(0.0, min(1.0, 1.0 - cv / 2.0))

    confianza = 0.30 + 0.45 * consistencia + 0.25 * cobertura
    return round(min(0.95, max(CONFIANZA_MINIMA, confianza)), 2)


def calcular_demanda_estimada(historial: List[Dict]) -> Dict:
    por_dia = agrupar_ventas_por_dia(historial)

    if len(por_dia) < 7:
        promedio = (sum(por_dia.values()) / max(len(por_dia), 1)) if por_dia else 0
        return {
            "demanda_diaria_promedio": round(promedio, 2),
            "demanda_semana": round(promedio * 7, 2),
            "confianza": CONFIANZA_MINIMA,
            "mensaje": "Modelo en aprendizaje",
            "tendencia": {"pendiente": 0.0, "nivel": "sin_datos", "cambio_porcentual_semana": 0.0},
            "factor_dia_semana": None,
            "metodo": "promedio_simple"
        }

    serie, fechas = construir_serie_diaria(por_dia)

    pesos = np.arange(1, len(serie) + 1, dtype=float)
    ma_ponderada = float((serie * pesos).sum() / pesos.sum())

    tendencia = calcular_tendencia(serie)
    proyeccion_diaria = max(0.0, ma_ponderada + tendencia["pendiente"] * 3.5)
    factores = factor_dia_semana(serie, fechas)
    confianza = calcular_confianza(serie)

    return {
        "demanda_diaria_promedio": round(proyeccion_diaria, 2),
        "demanda_semana": round(proyeccion_diaria * 7, 2),
        "confianza": confianza,
        "mensaje": "OK",
        "tendencia": tendencia,
        "factor_dia_semana": factores,
        "metodo": "regresion_lineal_mas_ma_ponderada"
    }


# -----------------------------------------------------------------------------
# Reglas de negocio
# -----------------------------------------------------------------------------

def calcular_dias_restantes(stock_actual: int, demanda_diaria: float) -> float:
    if demanda_diaria <= 0:
        return 999.0
    return round(stock_actual / demanda_diaria, 1)


def determinar_nivel_alerta(dias_restantes: float) -> str:
    if dias_restantes < DIAS_CRITICO:
        return "critico"
    if dias_restantes < DIAS_BAJO:
        return "bajo"
    return "normal"


def calcular_cantidad_a_reabastecer(stock_actual: int, demanda_diaria: float,
                                     lead_time: int = LEAD_TIME_DIAS,
                                     dias_objetivo: int = DIAS_OBJETIVO_STOCK) -> int:
    if demanda_diaria <= 0:
        return 0
    stock_proyectado = max(0.0, stock_actual - demanda_diaria * lead_time)
    objetivo = demanda_diaria * dias_objetivo
    return max(0, int(np.ceil(objetivo - stock_proyectado)))


def calcular_riesgo_stockout(dias_restantes: float, confianza: float,
                              lead_time: int = LEAD_TIME_DIAS) -> int:
    if dias_restantes >= 999:
        return 0
    if dias_restantes < lead_time:
        riesgo_base = (1.0 - dias_restantes / lead_time) * 100.0
    else:
        riesgo_base = max(0.0, (1.0 - dias_restantes / 30.0) * 40.0)
    riesgo_ajustado = riesgo_base * (0.5 + confianza * 0.5)
    return int(round(min(100.0, max(0.0, riesgo_ajustado))))


def generar_recomendacion(producto: Dict, prediccion: Dict) -> str:
    nombre = producto.get("nombre", "el producto")
    stock = int(producto.get("stock_actual", 0))
    dias = prediccion["dias_restantes"]
    demanda_sem = prediccion["demanda_estimada_semana"]
    tendencia_nivel = prediccion["tendencia"]["nivel"]
    cantidad = prediccion["cantidad_a_reabastecer"]
    cambio_pct = prediccion["tendencia"].get("cambio_porcentual_semana", 0)

    if demanda_sem <= 0:
        return (f"{nombre} sin movimiento de ventas en los ultimos {DIAS_HISTORIAL} dias. "
                "Considere descontinuar el producto o lanzar una promocion.")

    if tendencia_nivel == "subiendo":
        ctx = f" Tendencia al alza ({cambio_pct:+.1f}% sem.), refuerce el stock."
    elif tendencia_nivel == "bajando":
        ctx = f" Tendencia a la baja ({cambio_pct:+.1f}% sem.), ajuste el pedido."
    else:
        ctx = ""

    if dias < DIAS_CRITICO:
        return (f"URGENTE: pedir {cantidad} unidades de {nombre} HOY. "
                f"Quedan ~{dias} dias de stock para una demanda estimada de "
                f"{demanda_sem:.0f} unidades/semana.{ctx}")
    if dias < DIAS_BAJO:
        return (f"Reabastecer {cantidad} unidades de {nombre} esta semana. "
                f"Stock actual: {stock}, demanda semanal estimada: {demanda_sem:.0f}.{ctx}")
    return (f"Stock saludable para {nombre}: {stock} unidades, "
            f"alcanza para ~{dias:.0f} dias.{ctx}")


# -----------------------------------------------------------------------------
# Punto de entrada usado por los routers
# -----------------------------------------------------------------------------

def construir_prediccion(producto: Dict, historial: List[Dict]) -> Dict:
    estimacion = calcular_demanda_estimada(historial)
    demanda_diaria = estimacion["demanda_diaria_promedio"]

    stock_actual = int(producto.get("stock_actual", 0))
    dias_restantes = calcular_dias_restantes(stock_actual, demanda_diaria)
    nivel = determinar_nivel_alerta(dias_restantes)
    cantidad_pedir = calcular_cantidad_a_reabastecer(stock_actual, demanda_diaria)
    riesgo = calcular_riesgo_stockout(dias_restantes, estimacion["confianza"])

    prediccion = {
        "producto_id": producto.get("id"),
        "nombre": producto.get("nombre"),
        "tipo_madera": producto.get("tipo_madera"),
        "stock_actual": stock_actual,
        "stock_minimo": int(producto.get("stock_minimo", 0)),
        "demanda_estimada_semana": estimacion["demanda_semana"],
        "demanda_diaria_promedio": demanda_diaria,
        "dias_restantes": dias_restantes,
        "alerta": nivel in ("critico", "bajo"),
        "nivel_alerta": nivel,
        "confianza": estimacion["confianza"],
        "tendencia": estimacion["tendencia"],
        "factor_dia_semana": estimacion.get("factor_dia_semana"),
        "cantidad_a_reabastecer": cantidad_pedir,
        "riesgo_stockout": riesgo,
        "metodo": estimacion["metodo"]
    }
    prediccion["recomendacion"] = generar_recomendacion(producto, prediccion)
    return prediccion
