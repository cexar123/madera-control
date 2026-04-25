// Autor: Miembro 5
// MaderaControl v1.0 - Hook de autenticacion (re-exporta useAuthContext)

import { useAuthContext } from '../context/AuthContext';

export default function useAuth() {
  return useAuthContext();
}
