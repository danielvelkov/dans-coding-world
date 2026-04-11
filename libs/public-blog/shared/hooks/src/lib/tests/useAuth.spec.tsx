import { renderReactQueryHook } from './helper/render-react-query-hook';
import useAuth from '../users/useAuth';

describe('useAuth', () => {
  const renderUseAuthHook = () => renderReactQueryHook(useAuth);

  it('throws an error when provider is missing', () => {
    expect(renderUseAuthHook).toThrow(/used within .* AuthProvider/i);
  });
});
