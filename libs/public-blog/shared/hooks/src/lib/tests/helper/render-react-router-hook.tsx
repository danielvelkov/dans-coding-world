import { renderHook } from '@testing-library/react';
import {
  Location,
  MemoryRouter,
  NavigateFunction,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import '@testing-library/jest-dom';

// Helper to capture URL location
export let currentLocation: Location;

const LocationTracker = () => {
  currentLocation = useLocation();
  return null;
};

export let navigate: NavigateFunction;

const Navigation = () => {
  navigate = useNavigate();
  return null;
};

export function renderReactRouterHook<T>(
  hook: () => T,
  initialEntries: string[] = ['/']
) {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
        <LocationTracker></LocationTracker>
        <Navigation></Navigation>
      </MemoryRouter>
    ),
  });
}

export default renderReactRouterHook;
