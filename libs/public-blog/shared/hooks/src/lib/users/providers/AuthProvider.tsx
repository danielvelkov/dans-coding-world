import { AuthContext } from '../contexts/AuthContext';
import { useAuthState } from '../useAuthState';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
