// Autor: Miembro 5
// MaderaControl v1.0 - Badge de estado

const styles = {
  ok: 'bg-green-100 text-green-800',
  alerta: 'bg-orange-100 text-orange-800',
  critico: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  gris: 'bg-gray-100 text-gray-700'
};

export default function Badge({ children, color = 'info', className = '' }) {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md ${styles[color] || styles.info} ${className}`}>
      {children}
    </span>
  );
}
