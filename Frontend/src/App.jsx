import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import PlaceholderDashboard from './pages/dashboards/PlaceholderDashboard';
import PlDashboard from './pages/dashboards/PlDashboard';
import HfDashboard from './pages/dashboards/HfDashboard';
import HtDashboard from './pages/dashboards/HtDashboard';
import TmDashboard from './pages/dashboards/TmDashboard';
import TspTlDashboard from './pages/dashboards/TspTlDashboard';
import TspTmDashboard from './pages/dashboards/TspTmDashboard';
import { ThemeProvider } from './context/ThemeContext';






// Each role can ONLY access their own dashboard path
const roleRoutes = [
  { path: '/qa',       roles: ['TSP_QA'] },
  { path: '/security', roles: ['TSP_SECURITY'] },
  { path: '/bt',       roles: ['BUSINESS_TEAM'] },
];

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Super Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Role dashboards */}
          <Route path="/pl" element={
          <ProtectedRoute allowedRoles={['PRODUCT_LEAD']}>
          <PlDashboard />
          </ProtectedRoute>
          } />
          <Route path="/hf" element={
          <ProtectedRoute allowedRoles={['HEAD_FUNCTIONAL']}>
          <HfDashboard />
          </ProtectedRoute>
          }  />
          <Route path="/ht" element={
          <ProtectedRoute allowedRoles={['HEAD_TECHNOLOGY']}>
          <HtDashboard />
          </ProtectedRoute>
          } />
          <Route path="/tm" element={
            <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
              <TmDashboard />
            </ProtectedRoute>
          } />
          <Route path="/tsp-tl" element={
            <ProtectedRoute allowedRoles={['TSP_TEAM_LEAD']}>
              <TspTlDashboard />
            </ProtectedRoute>
          } />
          <Route path="/tsp-tm" element={
            <ProtectedRoute allowedRoles={['TSP_TEAM_MEMBER']}>
              <TspTmDashboard />
            </ProtectedRoute>
          } />







          {/* Role dashboards — each restricted to its own role */}
          {roleRoutes.map(({ path, roles }) => (
            <Route key={path} path={path} element={
              <ProtectedRoute allowedRoles={roles}>
                <PlaceholderDashboard />
              </ProtectedRoute>
            } />
          ))}

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-brand-500">404</h1>
                <p className="text-slate-400 mt-2">Page not found</p>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
