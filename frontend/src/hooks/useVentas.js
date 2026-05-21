// Hook de listado de ventas

import { useEffect, useState, useCallback } from 'react';

import { ventasApi } from '../api/ventas.api';

export default function useVentas(filtrosIniciales = {}) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ventasApi.listar(filtros);
      setVentas(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  return { ventas, loading, error, filtros, setFiltros, recargar: cargar };
}
