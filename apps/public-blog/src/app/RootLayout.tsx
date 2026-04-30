import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import GlobalLoadingOverlay from './GlobalLoadingOverlay';
import { Outlet } from 'react-router-dom';

function RootLayout() {
  const { isRefreshing } = useAuth();

  if (isRefreshing) return <GlobalLoadingOverlay visible />;

  return <Outlet />;
}

export default RootLayout;
