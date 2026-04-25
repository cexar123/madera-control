// Autor: Miembro 5
// MaderaControl v1.0 - Indicador de carga

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex justify-center items-center py-6 ${className}`}>
      <span className={`${sizes[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}
