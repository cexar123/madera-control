"""MaderaControl - Pruebas Unitarias del Microservicio de IA (Predicción de Stock).

CA05 - calcular_demanda_estimada(historial) [Automático]
CA06 - construir_prediccion(producto, historial) [Manual]
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from services.prediccion_service import (
    calcular_demanda_estimada,
    calcular_dias_restantes,
    determinar_nivel_alerta,
    calcular_cantidad_a_reabastecer,
    calcular_riesgo_stockout,
    construir_prediccion,
    agrupar_ventas_por_dia,
)


def _historial_constante(unidades_por_dia: int, dias: int):
    """Genera un historial de ventas con N unidades/día durante D días."""
    hoy = datetime.utcnow().date()
    return [
        {"fecha": (hoy - timedelta(days=i)).isoformat(), "cantidad": unidades_por_dia}
        for i in range(dias)
    ]


def _historial_creciente(base: int, dias: int):
    hoy = datetime.utcnow().date()
    return [
        {"fecha": (hoy - timedelta(days=i)).isoformat(), "cantidad": base + (dias - i)}
        for i in range(dias)
    ]


# =====================================================
# CA05 — calcular_demanda_estimada(historial)
# Método: Automático (asserts en bucle / parametrize)
# =====================================================
@pytest.mark.parametrize("idx,nombre,historial,prop,esperado", [
    (
        1, "Historial vacío activa modo 'aprendizaje'",
        [],
        "mensaje", "Modelo en aprendizaje"
    ),
    (
        2, "Historial < 7 días retorna método 'promedio_simple'",
        _historial_constante(5, 3),
        "metodo", "promedio_simple"
    ),
    (
        3, "Historial constante 10/día → demanda diaria ≈ 10",
        _historial_constante(10, 30),
        "demanda_diaria_promedio", 10
    ),
    (
        4, "Historial constante → tendencia 'estable'",
        _historial_constante(8, 30),
        "tendencia.nivel", "estable"
    ),
    (
        5, "Historial creciente → tendencia 'subiendo'",
        _historial_creciente(0, 30),
        "tendencia.nivel", "subiendo"
    ),
    (
        6, "Confianza > 0.30 con ≥14 días de datos consistentes",
        _historial_constante(5, 30),
        "confianza_gt", 0.30
    ),
])
def test_CA05_calcular_demanda_estimada(idx, nombre, historial, prop, esperado):
    r = calcular_demanda_estimada(historial)
    if prop == "tendencia.nivel":
        assert r["tendencia"]["nivel"] == esperado, f"CA05.{idx} - {nombre}"
    elif prop == "demanda_diaria_promedio":
        assert abs(r["demanda_diaria_promedio"] - esperado) <= 1.5, (
            f"CA05.{idx} - {nombre} got={r['demanda_diaria_promedio']}"
        )
    elif prop == "confianza_gt":
        assert r["confianza"] > esperado, f"CA05.{idx} - {nombre} got={r['confianza']}"
    else:
        assert r[prop] == esperado, f"CA05.{idx} - {nombre}"


# =====================================================
# CA06 — construir_prediccion(producto, historial)
# Método: Manual
# =====================================================
class TestCA06_ConstruirPrediccion:
    def test_CA06_1_producto_sin_movimiento(self):
        """Producto con stock pero sin historial de ventas no debe alertar."""
        producto = {"id": 1, "nombre": "Vigas 8m", "tipo_madera": "vigas",
                    "stock_actual": 25, "stock_minimo": 5}
        r = construir_prediccion(producto, [])
        assert r["alerta"] is False
        assert r["nivel_alerta"] == "normal"
        assert r["demanda_diaria_promedio"] == 0
        assert "sin movimiento" in r["recomendacion"].lower()

    def test_CA06_2_stock_critico_genera_alerta(self):
        """Stock bajo + demanda alta → nivel crítico y cantidad a reabastecer > 0."""
        producto = {"id": 2, "nombre": "Eucalipto 6m", "tipo_madera": "eucalipto",
                    "stock_actual": 5, "stock_minimo": 15}
        historial = _historial_constante(20, 30)  # 20 unidades/día
        r = construir_prediccion(producto, historial)
        assert r["nivel_alerta"] == "critico"
        assert r["alerta"] is True
        assert r["cantidad_a_reabastecer"] > 0
        assert "URGENTE" in r["recomendacion"]

    def test_CA06_3_stock_saludable_no_alerta(self):
        """Stock muy alto vs. demanda baja → nivel normal."""
        producto = {"id": 3, "nombre": "Varas 2m", "tipo_madera": "varas",
                    "stock_actual": 5000, "stock_minimo": 30}
        historial = _historial_constante(2, 30)  # 2/día
        r = construir_prediccion(producto, historial)
        assert r["nivel_alerta"] == "normal"
        assert r["alerta"] is False

    def test_CA06_4_input_maligno_stock_negativo(self):
        """Stock negativo / atributos faltantes no deben romper la predicción."""
        producto = {"id": 4, "nombre": "Tablones 3m", "stock_actual": -10}
        historial = _historial_constante(3, 15)
        r = construir_prediccion(producto, historial)
        # No lanza excepción; dias_restantes debe quedar <= 0
        assert r["dias_restantes"] <= 0
        assert r["nivel_alerta"] == "critico"

    def test_CA06_5_riesgo_stockout_entre_0_y_100(self):
        """El score de riesgo debe estar siempre entre 0 y 100, en cualquier escenario."""
        escenarios = [
            ({"id": 1, "nombre": "x", "stock_actual": 0},      _historial_constante(50, 30)),
            ({"id": 2, "nombre": "y", "stock_actual": 1000},   _historial_constante(1, 30)),
            ({"id": 3, "nombre": "z", "stock_actual": 30},     _historial_constante(10, 30)),
            ({"id": 4, "nombre": "w", "stock_actual": 0},      []),
        ]
        for p, h in escenarios:
            r = construir_prediccion(p, h)
            assert 0 <= r["riesgo_stockout"] <= 100, r

    def test_CA06_6_inyeccion_en_nombre_no_rompe(self):
        """Datos maliciosos en el campo nombre no deben romper la lógica."""
        producto = {
            "id": 9,
            "nombre": "Eucalipto'; DROP TABLE productos; --",
            "tipo_madera": "eucalipto",
            "stock_actual": 100,
            "stock_minimo": 10,
        }
        historial = _historial_constante(5, 20)
        r = construir_prediccion(producto, historial)
        # El nombre llega tal cual a la recomendación (se trata como texto, no como SQL)
        assert "DROP TABLE" in r["recomendacion"]
        assert r["producto_id"] == 9
