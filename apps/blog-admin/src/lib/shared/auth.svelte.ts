import { AuthStateManager } from '@dans-coding-world/blog-admin-data-access-auth';
import { getContext, setContext } from 'svelte';

export { AuthStateManager } from '@dans-coding-world/blog-admin-data-access-auth';

export const AUTH_CONTEXT_KEY = Symbol('auth');

export function getAuth() {
	return getContext<AuthStateManager>(AUTH_CONTEXT_KEY);
}

export function setAuth(authStateManager: AuthStateManager) {
	return setContext<AuthStateManager>(AUTH_CONTEXT_KEY, authStateManager);
}
