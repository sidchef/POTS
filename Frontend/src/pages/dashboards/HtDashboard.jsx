import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import { getMyPendingApprovals, approveBrm, rejectBrm } from '../../api/brm.api.js';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)' }}>
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h3 className="text-white font-semibold">{title}</h3>
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

export default function HtDashboard() {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteModal, setVoteModal] = useState(null);
  const [comments, setComments] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyPendingApprovals();
      setPendingApprovals(res.data.data);
    } catch {
      showToast('Failed to load pending approvals', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleVote = async () => {
    if (voteModal.decision === 'REJECTED' && !comments.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const fn = voteModal.decision === 'APPROVED' ? approveBrm : rejectBrm;
      const res = await fn(voteModal.brm.id, { comments });
      showToast(res.data.message);
      setVoteModal(null);
      setComments('');
      fetchPending();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setSubmitting(false); }
  };

  const openVote = (brm, decision) => { setVoteModal({ brm, decision }); setComments(''); };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500/95 text-white' : 'bg-green-500/95 text-white'}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}

      <Navbar title="Head Technology Dashboard" />

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and approve or reject submitted BRMs</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Pending Review</p>
            <p className="text-2xl font-bold mt-1 text-cyan-400">{pendingApprovals.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">SLA Window</p>
            <p className="text-lg font-bold mt-1 text-white">48 hrs</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Your Role</p>
            <p className="text-lg font-bold mt-1 text-cyan-300">Head Technology</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="text-center py-20 bg-slate-800 border border-slate-700 rounded-xl">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold">All caught up!</p>
            <p className="text-slate-400 text-sm mt-1">No BRMs pending your review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((approval) => {
              const brm = approval.brm;
              const dueDate = new Date(approval.cycle?.startedAt);
              dueDate.setHours(dueDate.getHours() + 48);
              const hoursLeft = Math.max(0, Math.floor((dueDate - new Date()) / (1000 * 60 * 60)));
              const isUrgent = hoursLeft < 12;

              return (
                <div key={approval.id} className={`bg-slate-800 border rounded-xl p-5 ${isUrgent ? 'border-red-500/40' : 'border-slate-700'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-brand-400 font-mono text-xs font-semibold">{brm.brmNumber}</span>
                        <BrmStatusBadge status={brm.currentStatus} />
                        <PriorityBadge priority={brm.priority} />
                        {isUrgent && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">⚠ Urgent — {hoursLeft}h left</span>}
                      </div>
                      <h4 className="text-white font-semibold text-base">{brm.title}</h4>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>Cycle #{approval.cycle?.cycleNumber}</p>
                      <p className="mt-0.5">SLA Due: {dueDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Team', value: brm.TeamName },
                      { label: 'Category', value: brm.Category },
                      { label: 'PL', value: `${brm.currentPl.firstName} ${brm.currentPl.lastName}` },
                      { label: 'Submitted', value: brm.submittedAt ? new Date(brm.submittedAt).toLocaleDateString() : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-900/50 rounded-lg p-2.5">
                        <p className="text-slate-500 text-xs uppercase tracking-wide font-medium">{label}</p>
                        <p className="text-slate-200 text-sm mt-0.5 font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-700">
                    <button onClick={() => openVote(brm, 'APPROVED')}
                      className="flex-1 py-2 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-semibold text-sm flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approve
                    </button>
                    <button onClick={() => openVote(brm, 'REJECTED')}
                      className="flex-1 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {voteModal && (
        <Modal title={voteModal.decision === 'APPROVED' ? '✓ Approve BRM' : '✕ Reject BRM'}
          onClose={() => { setVoteModal(null); setComments(''); }}>
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border text-sm ${voteModal.decision === 'APPROVED' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              <p className="font-semibold">{voteModal.brm.brmNumber} — {voteModal.brm.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Comments {voteModal.decision === 'REJECTED' && <span className="text-red-400">*</span>}
              </label>
              <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
                placeholder={voteModal.decision === 'REJECTED' ? 'Required: Reason for rejection...' : 'Optional: Additional comments...'}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setVoteModal(null); setComments(''); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">Cancel</button>
              <button onClick={handleVote} disabled={submitting}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 text-white ${voteModal.decision === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting ? 'Submitting...' : `Confirm ${voteModal.decision === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
