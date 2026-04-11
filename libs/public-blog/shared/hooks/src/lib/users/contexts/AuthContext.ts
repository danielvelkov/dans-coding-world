import { createContext } from 'react';
import { useAuthState } from '../useAuthState';

export const AuthContext = createContext<ReturnType<
  typeof useAuthState
> | null>(null);
