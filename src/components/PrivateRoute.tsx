import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function PrivateRoute() {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
