// Autor: Miembro 5
// MaderaControl v1.0 - Boton reutilizable con variantes

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  onClick,
  ...rest
}) {
  const base = 'px-4 py-2 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-critico text-white hover:bg-red-700',
    success: 'bg-ok text-white hover:bg-green-700',
    ghost: 'text-primary hover:bg-primary/10'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
