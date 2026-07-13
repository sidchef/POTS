import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

// --- Role badge colors ---
const roleColors = {
  SUPER_ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  PRODUCT_LEAD: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  HEAD_FUNCTIONAL: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  HEAD_TECHNOLOGY: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  TEAM_MEMBER: 'bg-green-500/20 text-green-300 border-green-500/30',
  TSP_TEAM_LEAD: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  TSP_TEAM_MEMBER: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  TSP_QA: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  TSP_SECURITY: 'bg-red-500/20 text-red-300 border-red-500/30',
  BUSINESS_TEAM: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

// --- Reusable Modal wrapper ---
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(4px)' }}>
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// --- Input component ---
const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
    />
  </div>
);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEditRole, setShowEditRole] = useState(null);     // holds user object
  const [showResetPw, setShowResetPw] = useState(null);      // holds user object

  // Create user form
  const [createForm, setCreateForm] = useState({
    employeeId: '', firstName: '', lastName: '', email: '', roleNames: [],
  });

  // Edit role form
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch {
      showToast('Failed to fetch users', 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers(true);
    const interval = setInterval(() => fetchUsers(false), 10000);
    const onFocus = () => fetchUsers(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchUsers]);

  useEffect(() => {
    api.get('/admin/roles').then((r) => setRoles(r.data.data));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Create user
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', createForm);
      showToast('User created successfully');
      setShowCreate(false);
      setCreateForm({ employeeId: '', firstName: '', lastName: '', email: '', roleNames: [] });
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  // Toggle active status
  const handleToggleStatus = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive: !u.isActive });
      showToast(`User ${!u.isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Change role
  const handleChangeRole = async () => {
    try {
      await api.patch(`/admin/users/${showEditRole.id}/role`, { roleNames: selectedRoles });
      showToast('Role updated successfully');
      setShowEditRole(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role', 'error');
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    try {
      await api.post(`/admin/users/${showResetPw.id}/reset-password`, { newPassword });
      showToast('Password reset successfully');
      setShowResetPw(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  const toggleRoleSelection = (roleName) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}

      {/* Top Navigation */}
      <nav className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">POTS</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 text-sm">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-400 text-xs">{user?.employeeId}</p>
          </div>
          <button onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage all POTS users and their roles</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New User
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: pagination.total || 0, color: 'text-blue-400' },
            { label: 'Active', value: users.filter(u => u.isActive).length, color: 'text-green-400' },
            { label: 'Inactive', value: users.filter(u => !u.isActive).length, color: 'text-red-400' },
            { label: 'Total Roles', value: roles.length, color: 'text-purple-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or employee ID..."
            className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          >
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    {['Employee', 'Email', 'Roles', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-700/30 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 font-semibold text-xs">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-slate-400 text-xs">{u.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r.id} className={`px-2 py-0.5 rounded-full text-xs border font-medium ${roleColors[r.name] || 'bg-slate-600/30 text-slate-300 border-slate-600'}`}>
                              {r.name.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleStatus(u)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${u.isActive ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/30'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => { setShowEditRole(u); setSelectedRoles(u.roles.map(r => r.name)); }}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 border border-blue-500/30">
                            Change Role
                          </button>
                          <button
                            onClick={() => setShowResetPw(u)}
                            className="px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 border border-yellow-500/30">
                            Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
            <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users)</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white">
                Previous
              </button>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} required placeholder="John" />
              <Input label="Last Name" value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} required placeholder="Doe" />
            </div>
            <Input label="Employee ID" value={createForm.employeeId} onChange={e => setCreateForm(f => ({ ...f, employeeId: e.target.value }))} required placeholder="EMP-0001" />
            <Input label="Email" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required placeholder="john@pots.com" />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assign Roles</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {roles.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${createForm.roleNames.includes(r.name) ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                    <input type="checkbox" checked={createForm.roleNames.includes(r.name)}
                      onChange={() => setCreateForm(f => ({ ...f, roleNames: f.roleNames.includes(r.name) ? f.roleNames.filter(x => x !== r.name) : [...f.roleNames, r.name] }))}
                      className="hidden" />
                    {r.name.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm">Create User</button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditRole && (
        <Modal title={`Change Role — ${showEditRole.firstName} ${showEditRole.lastName}`} onClose={() => setShowEditRole(null)}>
          <p className="text-slate-400 text-sm mb-4">Select one or more roles to assign:</p>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6">
            {roles.map((r) => (
              <label key={r.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedRoles.includes(r.name) ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                <input type="checkbox" checked={selectedRoles.includes(r.name)} onChange={() => toggleRoleSelection(r.name)} className="hidden" />
                <span className={`w-3 h-3 rounded border flex items-center justify-center ${selectedRoles.includes(r.name) ? 'bg-brand-500 border-brand-500' : 'border-slate-500'}`}>
                  {selectedRoles.includes(r.name) && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                </span>
                {r.name.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowEditRole(null)} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">Cancel</button>
            <button onClick={handleChangeRole} className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm">Save Changes</button>
          </div>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPw && (
        <Modal title={`Reset Password — ${showResetPw.firstName} ${showResetPw.lastName}`} onClose={() => { setShowResetPw(null); setNewPassword(''); }}>
          <p className="text-slate-400 text-sm mb-4">Set a new password for this user. They will need to change it after logging in.</p>
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowResetPw(null); setNewPassword(''); }} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">Cancel</button>
            <button onClick={handleResetPassword} className="flex-1 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold text-sm">Reset Password</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
