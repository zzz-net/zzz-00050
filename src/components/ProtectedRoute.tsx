import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { roleLabels, type UserRole } from '../types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap: Record<UserRole, string> = {
      resident: '/resident/dashboard',
      dispatcher: '/dispatcher/dashboard',
      repair: '/repair/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <>{children}</>;
}

export function getDefaultRoute(role: UserRole): string {
  const map: Record<UserRole, string> = {
    resident: '/resident/dashboard',
    dispatcher: '/dispatcher/dashboard',
    repair: '/repair/dashboard',
    admin: '/admin/dashboard',
  };
  return map[role];
}
