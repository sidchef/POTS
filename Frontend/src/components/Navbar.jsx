import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from '../api/notification.api.js';
import { changePassword } from '../api/auth.api.js';

export default function Navbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);
  const pwdModalRef = useRef(null); 

   const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: null, success: false });
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdStatus({ loading: true, error: null, success: false });
    try {
      await changePassword(pwdForm);
      setPwdStatus({ loading: false, error: null, success: true });
      setTimeout(() => {
        setShowPwdModal(false);
        setPwdForm({ oldPassword: '', newPassword: '' });
        setPwdStatus({ loading: false, error: null, success: false });
      }, 2000);
    } catch (err) {
      setPwdStatus({ loading: false, error: err.response?.data?.message || 'Failed to change password', success: false });
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data.data.count);
    } catch { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = async () => {
    if (!notifOpen) {
      await fetchNotifications();
    }
    setNotifOpen(!notifOpen);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleMarkOne = async (id) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on outside click(change password)

  useEffect(() => {
    const handler = (e) => {
      if (showPwdModal && pwdModalRef.current && !pwdModalRef.current.contains(e.target)) {
        setShowPwdModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPwdModal]);

  return (
    <nav className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      {/* Left — Logo + Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">POTS</p>
          {title && <p className="text-slate-400 text-xs leading-tight">{title}</p>}
        </div>
        {subtitle && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 text-sm">{subtitle}</span>
          </>
        )}
      </div>

      {/* Right — Notifications + User + Logout */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div ref={bellRef} className="relative">
          <button onClick={handleBellClick}
            className="relative p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <p className="text-white font-semibold text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead}
                    className="text-brand-400 text-xs hover:text-brand-300">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id}
                      onClick={() => !n.isRead && handleMarkOne(n.id)}
                      className={`px-4 py-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 ${!n.isRead ? 'bg-brand-900/20' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>}
                        <div className={!n.isRead ? '' : 'ml-4'}>
                          <p className="text-white text-xs font-medium">{n.title}</p>
                          <p className="text-slate-400 text-xs mt-0.5 line-clamp-3">{n.message}</p>
                          <p className="text-slate-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="text-right hidden sm:block">
          <p className="text-white text-sm font-medium leading-tight">{user?.firstName} {user?.lastName}</p>
          <p className="text-slate-400 text-xs leading-tight">{user?.employeeId}</p>
        </div>

         {/* <-- CHANGE PASSWORD BUTTON --> */}
        <button onClick={() => setShowPwdModal(true)}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          title="Change Password">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          title="Logout">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* <-- CHANGE PASSWORD MODAL UI --> */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mt-5">
          <div ref={pwdModalRef} className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mt-20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">Change Password</h3>
              <button onClick={() => setShowPwdModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              {pwdStatus.success ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">✓</div>
                  <p className="text-green-400 font-medium">Password changed successfully!</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {pwdStatus.error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">
                      {pwdStatus.error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
                    <input type="password" required value={pwdForm.oldPassword}
                      onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                    <input type="password" required minLength="6" value={pwdForm.newPassword}
                      onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                  </div>
                  <button type="submit" disabled={pwdStatus.loading}
                    className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm transition-all mt-4">
                    {pwdStatus.loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* <-- CHNAGE PASSWORD MODAL --> */}


    </nav>
  );
}
