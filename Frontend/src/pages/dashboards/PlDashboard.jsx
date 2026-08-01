import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import { createBrm, updateBrm, submitBrm, listBrms, getBrm, assignBrmToTm, assignBrmToTspTl } from '../../api/brm.api.js';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';
import api from '../../api/axios.js'; 
import BrmDetailModal from '../../components/BrmDetailModal';
import { approveArchitecture } from '../../api/brm.api.js';



// ─── Shared UI atoms ────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)' }}>
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
    </div>
  </div>
);

const InputField = ({ label, required, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input {...props}
      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
  </div>
);

const SelectField = ({ label, required, options, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <select {...props}
      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
      <option value="">Select {label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const EMPTY_FORM = {brmNumber:'', teamName: '', category: '', title: '', description: '', priority: '' };
const CATEGORIES = ['Feature', 'Bug Fix', 'Enhancement', 'Integration', 'Infrastructure', 'Security', 'Compliance', 'Other'];
const PRIORITIES = ['High', 'Medium', 'Low'];

export default function PlDashboard() {
  const [brms, setBrms] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'actions'


  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // BRM object
  const [viewTarget, setViewTarget] = useState(null);   // full BRM detail
  const [submitTarget, setSubmitTarget] = useState(null); // BRM to submit
  const [loadingView, setLoadingView] = useState(false);
  const [showAssignTm, setShowAssignTm] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [tmList, setTmList] = useState([]);
  const [selectedTm, setSelectedTm] = useState('');
  const [showAssignTspTl, setShowAssignTspTl] = useState(false);
  const [tspTlList, setTspTlList] = useState([]);
  const [assignTspTlTarget, setAssignTspTlTarget] = useState(null);
  const [selectedTspTl, setSelectedTspTl] = useState('');


  // Forms
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await listBrms({ page, limit: 10, status: statusFilter || undefined });
      setBrms(res.data.data.brms);
      setPagination(res.data.data.pagination);
    } catch {
      showToast('Failed to load BRMs', 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { 
    // Initial fetch with spinner
    fetchBrms(true); 
    
    // Background auto-refresh every 10 seconds (no spinner)
    const interval = setInterval(() => fetchBrms(false), 60000);
    
    // Instantly refresh when the user switches back to this browser tab (no spinner)
    const onFocus = () => fetchBrms(false);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchBrms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBrm(createForm);
      showToast('BRM created successfully');
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create BRM', 'error');
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateBrm(editTarget.id, editForm);
      showToast('BRM updated successfully');
      setEditTarget(null);
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update BRM', 'error');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitBrm(submitTarget.id);
      showToast(`BRM submitted! ${res.data.data.approversNotified} approvers notified.`);
      setSubmitTarget(null);
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit BRM', 'error');
    } finally { setSubmitting(false); }
  };

  const handleViewBrm = async (id) => {
    setLoadingView(true);
    setViewTarget({ loading: true });
    try {
      const res = await getBrm(id);
      setViewTarget(res.data.data);
    } catch {
      showToast('Failed to load BRM details', 'error');
      setViewTarget(null);
    } finally { setLoadingView(false); }
  };

    const openAssignTm = async (brm) => {
    setAssignTarget(brm);
    try {
    const res = await api.get('/brms/users/by-role', { params: { role: 'TEAM_MEMBER' } }); // ⬅️ Changed URL
    setTmList(res.data.data); // ⬅️ Note: data is directly an array now
    setShowAssignTm(true);
  } catch (err) {
    showToast('Failed to load Team Members', 'error');
  }
  };

  const handleAssignTm = async (e) => {
    e.preventDefault();
    if (!selectedTm) return showToast('Please select a Team Member', 'error');
    
    setSubmitting(true);
    try {
      await assignBrmToTm(assignTarget.id, { tmId: selectedTm });
      showToast('BRM successfully assigned to TM');
      setShowAssignTm(false);
      setAssignTarget(null);
      setSelectedTm('');
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign TM', 'error');
    } finally {
      setSubmitting(false);
    }
  };


    const openAssignTspTl = async (brm) => {
    setAssignTspTlTarget(brm);
    try {
      const res = await api.get('/brms/users/by-role', { params: { role: 'TSP_TEAM_LEAD' } });
      setTspTlList(res.data.data);
      setShowAssignTspTl(true);
    } catch (err) {
      showToast('Failed to load TSP Team Leads', 'error');
    }
  };

  const handleAssignTspTl = async (e) => {
    e.preventDefault();
    if (!selectedTspTl) return showToast('Please select a TSP Team Lead', 'error');
    
    setSubmitting(true);
    try {
      await assignBrmToTspTl(assignTspTlTarget.id, { tspTlId: selectedTspTl });
      showToast('BRM successfully assigned to TSP TL');
      setShowAssignTspTl(false);
      setAssignTspTlTarget(null);
      setSelectedTspTl('');
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign TSP TL', 'error');
    } finally {
      setSubmitting(false);
    }
  };

    const handleApproveArchitecture = async (brm) => {
    if (!window.confirm(`Are you sure you want to approve the architecture for ${brm.brmNumber}? This will move it to Development phase.`)) return;
    
    setSubmitting(true);
    try {
      await approveArchitecture(brm.id);
      showToast('Architecture approved. BRM is now Ready for Development!');
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve architecture', 'error');
    } finally {
      setSubmitting(false);
    }
  };

    const handleCompleteBrm = async (brm) => {
    if (!window.confirm(`Are you sure you want to mark ${brm.brmNumber} as COMPLETED?`)) return;
    setSubmitting(true);
    try {
      await api.post(`/brms/${brm.id}/complete`);
      showToast('BRM marked as COMPLETED successfully!');
      fetchBrms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete BRM', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closingBrms = brms.filter(b => 
    b.currentStatus === 'SECURITY' && 
    b.securityScans && b.securityScans.some(s => s.status === 'COMPLETED')
  );





  const openEdit = (brm) => {
    setEditForm({
      teamName:    brm.TeamName,
      category:    brm.Category,
      title:       brm.title,
      description: brm.description || '',
      priority:    brm.priority || '',
    });
    setEditTarget(brm);
  };

  // Stats
  const statusCounts = brms.reduce((acc, b) => {
    acc[b.currentStatus] = (acc[b.currentStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-red-500/95 text-white' : 'bg-green-500/95 text-white'}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}

      <Navbar title="Product Lead Dashboard" />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">

        <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Overview Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('actions')} 
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'actions' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            BRM Management
          </button>

          <button 
            onClick={() => setActiveTab('closing')} 
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'closing' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            BRM Closing
          </button>
        </div>
        {/* ─── RENDER DASHBOARD OR ACTION ITEMS ─── */}
        {activeTab === 'overview' ? (
          <BrmDashboardView brms={brms} />
        ) : activeTab === 'actions' ? (
          <>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My BRMs</h1>
            <p className="text-slate-400 text-sm mt-0.5">Create, manage, and submit Business Requirement Models</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New BRM
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: pagination.total || 0,       color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { label: 'Draft', value: statusCounts.DRAFT || 0,     color: 'text-slate-300',  bg: 'bg-slate-600/10' },
            { label: 'Submitted', value: statusCounts.SUBMITTED || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Approved', value: statusCounts.APPROVED || 0, color: 'text-green-400',  bg: 'bg-green-500/10' },
            { label: 'Rejected', value: statusCounts.REJECTED || 0, color: 'text-red-400',    bg: 'bg-red-500/10' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-700 rounded-xl p-4`}>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All Statuses</option>
            {[
              'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED',
              'USER_STORY_CREATION', 'USER_STORIES_CREATED',
              'ARCHITECTURE_CREATION', 'ARCHITECTURE_SUBMITTED',
              'READY_FOR_DEVELOPMENT', 'READY_FOR_TASK_ALLOCATION',
              'CODING_IN_PROGRESS', 'READY_FOR_QA', 'QA', 'SECURITY', 'COMPLETED'
            ].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}

          </select>
          <span className="text-slate-500 text-sm">{pagination.total || 0} BRMs</span>
        </div>

        {/* BRM Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : brms.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-400">No BRMs yet. Create your first one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/40">
                    {['BRM Number', 'Title', 'Team / Category', 'Priority', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {brms.map((brm) => (
                    <tr key={brm.id} className="hover:bg-slate-700/20 group">
                      <td className="px-4 py-3">
                        <span className="text-brand-400 font-mono text-xs font-semibold">{brm.brmNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium max-w-[200px] truncate">{brm.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs">{brm.TeamName}</p>
                        <p className="text-slate-500 text-xs">{brm.Category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={brm.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <BrmStatusBadge status={brm.currentStatus} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(brm.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleViewBrm(brm.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all">
                            View
                          </button>
                          {brm.currentStatus === 'DRAFT' && (
                            <>
                              <button onClick={() => openEdit(brm)}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs border border-blue-500/30">
                                Edit
                              </button>
                              <button onClick={() => setSubmitTarget(brm)}
                                className="px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-xs border border-brand-500/30">
                                Send for Approval
                              </button>
                            </>
                          )}
                          {brm.currentStatus === 'REJECTED' && (
                            <>
                              <button onClick={() => openEdit(brm)}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs border border-blue-500/30">
                                Edit
                              </button>
                              <button onClick={() => setSubmitTarget(brm)}
                                className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs border border-yellow-500/30">
                                Resubmit
                              </button>
                            </>
                          )}
                          {brm.currentStatus === 'APPROVED' && (
                            <button onClick={() => openAssignTm(brm)}
                             className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs border border-emerald-500/30 transition-all">
                              Assign to TM
                              </button>
                          )}
                            {brm.currentStatus === 'USER_STORIES_CREATED' && (
                              <button onClick={() => openAssignTspTl(brm)}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs border border-purple-500/30 transition-all">
                                Assign TSP TL
                              </button>
                            )}
                            {brm.currentStatus === 'ARCHITECTURE_SUBMITTED' && (
                              <button onClick={() => handleApproveArchitecture(brm)}
                                className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs border border-orange-500/30 transition-all">
                                Approve Architecture
                              </button>
                            )}


                    

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
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs">
                ← Prev
              </button>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs">
                Next →
              </button>
            </div>
          </div>
        )}
          </>
        ) : activeTab === 'closing' ? (
          <div className="space-y-6 mt-6 animate-in fade-in duration-300">
            {/* Elegant Header Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/60 p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  
                  <h2 className="text-2xl font-bold text-white tracking-tight">BRM Closing Center</h2>
                </div>
                <p className="text-slate-400 text-sm max-w-lg">Final Verification step. These BRMs have passed all QA and Security checks and are pending your final sign-off.</p>
              </div>
              <div className="relative z-10 flex flex-col items-end">
                <span className="text-3xl font-black text-white">{closingBrms.length}</span>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Action Required
                </span>
              </div>
            </div>

            {/* Content Area */}
            {closingBrms.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl">
                <div className="w-20 h-20 mb-6 bg-slate-800 rounded-full flex items-center justify-center shadow-inner border border-slate-700">
                  <span className="text-3xl opacity-50">✨</span>
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">You're all caught up!</h3>
                <p className="text-slate-500 text-sm text-center max-w-sm">There are currently no BRMs pending final closing verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {closingBrms.map(brm => (
                  <div key={brm.id} className="group relative bg-slate-800/60 border border-slate-700 hover:border-emerald-500/40 p-5 rounded-2xl transition-all hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-6 overflow-hidden">
                    
                    {/* Hover Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    {/* BRM Info */}
                    <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-brand-400 font-mono text-xs font-bold bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/20">
                          {brm.brmNumber}
                        </span>
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Security Cleared
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-lg leading-tight mb-1">{brm.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Team: <strong className="text-slate-300">{brm.TeamName}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span>Category: <strong className="text-slate-300">{brm.Category}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="relative z-10 flex items-center gap-3 sm:w-auto w-full pt-4 sm:pt-0 border-t border-slate-700 sm:border-none">
                      <button 
                        onClick={() => handleViewBrm(brm.id)} 
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Review Full Details
                      </button>
                      <button 
                        onClick={() => handleCompleteBrm(brm)} 
                        disabled={submitting} 
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        ✓ Mark as Completed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ─── CREATE BRM MODAL ──────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create New BRM" onClose={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}>
          <form onSubmit={handleCreate} className="space-y-4">
          <InputField label="BRM Number" required value={createForm.brmNumber} placeholder="e.g. 23452"
              onChange={e => setCreateForm(f => ({ ...f, brmNumber: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Team Name" required value={createForm.teamName} placeholder="e.g. Digital Banking"
                onChange={e => setCreateForm(f => ({ ...f, teamName: e.target.value }))} />
              <SelectField label="Category" required value={createForm.category} options={CATEGORIES}
                onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <InputField label="BRM Title" required value={createForm.title} placeholder="Short descriptive title"
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={createForm.description} rows={3}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the requirement in detail..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none" />
            </div>
            <SelectField label="Priority" value={createForm.priority} options={PRIORITIES}
              onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm">
                {submitting ? 'Creating...' : 'Create BRM'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── EDIT BRM MODAL ──────────────────────────────────────────── */}
      {editTarget && (
        <Modal title={`Edit BRM — ${editTarget.brmNumber}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Team Name" required value={editForm.teamName} placeholder="e.g. Digital Banking"
                onChange={e => setEditForm(f => ({ ...f, teamName: e.target.value }))} />
              <SelectField label="Category" required value={editForm.category} options={CATEGORIES}
                onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <InputField label="BRM Title" required value={editForm.title} placeholder="Short descriptive title"
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={editForm.description} rows={3}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none" />
            </div>
            <SelectField label="Priority" value={editForm.priority} options={PRIORITIES}
              onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── SUBMIT CONFIRMATION MODAL ──────────────────────────────── */}
      {submitTarget && (
        <Modal title="Submit BRM for Approval?" onClose={() => setSubmitTarget(null)}>
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">{submitTarget.brmNumber}</p>
            <p className="text-slate-300 text-sm mb-1">"{submitTarget.title}"</p>
            <p className="text-slate-400 text-xs mb-6">
              This will notify HF and HT approvers via email and in-app notification. A 48-hour SLA timer will start.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSubmitTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm">
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── ASSIGN TO TM MODAL ────────────────────────────────────────── */}
      {showAssignTm && assignTarget && (
        <Modal title={`Assign TM to ${assignTarget.brmNumber}`} onClose={() => { setShowAssignTm(false); setAssignTarget(null); }}>
          <form onSubmit={handleAssignTm} className="space-y-5">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 mb-2">
              <p className="text-white text-sm font-medium mb-1">{assignTarget.title}</p>
              <p className="text-slate-400 text-xs">{assignTarget.TeamName} · {assignTarget.Category}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Select Team Member <span className="text-red-400">*</span>
              </label>
              <select 
                value={selectedTm} 
                onChange={(e) => setSelectedTm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                required
              >
                <option value="">Select Team Member</option>
                {tmList.map(tm => (
                  <option key={tm.id} value={tm.id}>
                    {tm.firstName} {tm.lastName} ({tm.employeeId})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowAssignTm(false); setAssignTarget(null); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !selectedTm}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}



            {/* ─── VIEW BRM DETAIL MODAL ───────────────────────────────────── */}
      <BrmDetailModal 
        target={viewTarget} 
        onClose={() => setViewTarget(null)} 
      />


                  {/* ─── ASSIGN TSP TL MODAL ─────────────────────────────────────── */}
      {showAssignTspTl && assignTspTlTarget && (
        <Modal title={`Assign TSP TL to ${assignTspTlTarget.brmNumber}`} onClose={() => { setShowAssignTspTl(false); setAssignTspTlTarget(null); }}>
          <form onSubmit={handleAssignTspTl} className="space-y-5">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 mb-2">
              <p className="text-white text-sm font-medium mb-1">{assignTspTlTarget.title}</p>
              <p className="text-slate-400 text-xs">{assignTspTlTarget.TeamName} · {assignTspTlTarget.Category}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Select TSP Team Lead <span className="text-red-400">*</span>
              </label>
              <select 
                required
                value={selectedTspTl}
                onChange={e => setSelectedTspTl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                <option value="">Select TSP Team Lead</option>
                {tspTlList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.employeeId})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowAssignTspTl(false); setAssignTspTlTarget(null); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !selectedTspTl}
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}


    </div>
  );
}
