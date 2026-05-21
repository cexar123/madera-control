// Alerta visual reutilizable

const styles = {
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  exito: 'bg-green-50 border-green-300 text-green-800',
  advertencia: 'bg-orange-50 border-orange-300 text-orange-800',
  error: 'bg-red-50 border-red-300 text-red-800'
};

export default function Alert({ children, tipo = 'info', titulo, className = '' }) {
  return (
    <div className={`border-l-4 rounded-md px-4 py-3 ${styles[tipo] || styles.info} ${className}`}>
      {titulo && <div className="font-semibold mb-1">{titulo}</div>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
