import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function PrivateRoute() {
  const { token } = useAuthStore();
  // A PAT is always required. An empty token (left over from the removed
  // guest mode) is treated the same as no token.
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
