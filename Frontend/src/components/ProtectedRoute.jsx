import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role → dashboard path mapping
export const getRoleDashboard = (roles) => {
  if (roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('PRODUCT_LEAD')) return '/pl';
  if (roles.includes('HEAD_FUNCTIONAL')) return '/hf';
  if (roles.includes('HEAD_TECHNOLOGY')) return '/ht';
  if (roles.includes('TEAM_MEMBER')) return '/tm';
  if (roles.includes('TSP_TEAM_LEAD')) return '/tsp-tl';
  if (roles.includes('TSP_TEAM_MEMBER')) return '/tsp-tm';
  if (roles.includes('TSP_QA')) return '/qa';
  if (roles.includes('TSP_SECURITY')) return '/security';
  if (roles.includes('BUSINESS_TEAM')) return '/bt';
  return '/login';
};

// Protects routes — redirects to login if not authenticated
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.some((r) => user.roles.includes(r))) {
    // User is logged in but doesn't have the right role
    return <Navigate to={getRoleDashboard(user.roles)} replace />;
  }

  return children;
};

export default ProtectedRoute;
