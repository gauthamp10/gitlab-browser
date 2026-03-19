import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function PrivateRoute() {
  const { token } = useAuthStore();
  // token === null  → user has never set up the app → redirect to login
  // token === ''    → guest mode (no PAT, public repos only) → allow through
  // token === 'glpat-...' → authenticated → allow through
  if (token === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
