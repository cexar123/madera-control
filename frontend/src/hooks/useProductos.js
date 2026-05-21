// Hook de listado de productos

import { useEffect, useState, useCallback } from 'react';

import { productosApi } from '../api/productos.api';

export default function useProductos(filtrosIniciales = {}) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productosApi.listar(filtros);
      setProductos(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  return { productos, loading, error, filtros, setFiltros, recargar: cargar };
}
