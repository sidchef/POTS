import React, { useState, useMemo } from 'react';
import KanbanView from './KanbanView';
import ListView from './ListView';
import { BrmStatusBadge, PriorityBadge } from '../BrmStatusBadge';
import { getBrm } from '../../api/brm.api.js';

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrmDashboardView({ brms }) {
  const [viewMode, setViewMode] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);

  const total = brms.length;
  const completed = brms.filter(b => b.currentStatus === 'COMPLETED').length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const critical = brms.filter(b => b.priority === 'High' || b.priority === 'Critical').length;
  const rejected = brms.filter(b => b.currentStatus === 'REJECTED').length;
  const openCount = total - completed - rejected;
  
  const filteredBrms = useMemo(() => {
    return brms.filter(brm => {
      const q = searchQuery.toLowerCase();
      return (
        brm.brmNumber?.toLowerCase().includes(q) ||
        brm.title?.toLowerCase().includes(q) ||
        brm.TeamName?.toLowerCase().includes(q)
      );
    });
  }, [brms, searchQuery]);

  const handleCardClick = async (brm) => {
    setDetailTarget({ ...brm, loading: true });
    try {
      const res = await getBrm(brm.id);
      setDetailTarget(res.data.data);
    } catch {
      setDetailTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg">
          <p className="text-slate-400 text-sm font-medium">Total Requirements</p>
          <p className="text-3xl font-bold text-white mt-2">{total}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg">
          <p className="text-slate-400 text-sm font-medium">Completed</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-3xl font-bold text-emerald-400">{completed}</p>
            <p className="text-sm text-slate-400 mb-1">{completionRate}% rate</p>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg">
          <p className="text-slate-400 text-sm font-medium">High/Critical Priority</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">{critical}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg">
          <p className="text-slate-400 text-sm font-medium">Open Requirements</p>
          <p className="text-3xl font-bold text-brand-400 mt-2">{openCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <input 
          type="text" 
          placeholder="Search by ID, Title, or Team..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
        />
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >Kanban View</button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >List View</button>
        </div>
      </div>

      {/* View Content */}
      <div className="mt-6">
        {viewMode === 'kanban'
          ? <KanbanView brms={filteredBrms} onCardClick={handleCardClick} />
          : <ListView brms={filteredBrms} onCardClick={handleCardClick} />
        }
      </div>

      {/* ─── BRM DETAIL MODAL ───────────────────────────────────────── */}
      {detailTarget && (
        <Modal
          title={detailTarget.loading ? 'Loading...' : `BRM ${detailTarget.brmNumber} — Details`}
          onClose={() => setDetailTarget(null)}>
          {detailTarget.loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Title</p><p className="text-white font-semibold">{detailTarget.title}</p></div>
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Status</p><BrmStatusBadge status={detailTarget.currentStatus} /></div>
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Team</p><p className="text-slate-300 text-sm">{detailTarget.TeamName}</p></div>
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Category</p><p className="text-slate-300 text-sm">{detailTarget.Category}</p></div>
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Priority</p><PriorityBadge priority={detailTarget.priority} /></div>
                <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Product Lead</p><p className="text-slate-300 text-sm">{detailTarget.currentPl?.firstName} {detailTarget.currentPl?.lastName}</p></div>
                {detailTarget.description && (
                  <div className="col-span-2"><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Description</p><p className="text-slate-300 text-sm leading-relaxed">{detailTarget.description}</p></div>
                )}
              </div>

              {/* Approval Cycles */}
              {detailTarget.approvalCycles?.length > 0 && (
                <div>
                  <h4 className="text-slate-300 text-sm font-semibold mb-3">Approval Cycles</h4>
                  <div className="space-y-3">
                    {detailTarget.approvalCycles.map(cycle => (
                      <div key={cycle.id} className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-xs font-semibold">Cycle #{cycle.cycleNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border font-medium
                            ${cycle.status === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/25'
                            : cycle.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                            : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'}`}>
                            {cycle.status}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {cycle.approvals.map(a => (
                            <div key={a.id} className="flex items-start justify-between text-xs">
                              <div>
                                <span className="text-slate-300 font-medium">{a.approver.firstName} {a.approver.lastName}</span>
                                <span className="text-slate-500 ml-1">({a.approverRole.replace(/_/g, ' ')})</span>
                                {a.comments && <p className="text-slate-400 mt-0.5 italic">"{a.comments}"</p>}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full border font-medium shrink-0 ml-3
                                ${a.status === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/25'
                                : a.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Stories */}
              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3">User Stories ({detailTarget.userStory?.length || 0})</h4>
                {!detailTarget.userStory?.length ? (
                  <p className="text-slate-500 text-sm text-center py-4 border border-dashed border-slate-700 rounded-xl">No user stories yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailTarget.userStory.map((story, idx) => (
                      <div key={story.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <span className="text-purple-400 font-mono text-xs font-bold shrink-0">US-{idx+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{story.title}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{story.description}</p>
                          <p className="text-slate-600 text-xs mt-1">By: {story.createdBy?.firstName} {story.createdBy?.lastName}</p>
                        </div>
                        <PriorityBadge priority={story.priority} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status History */}
              {detailTarget.history?.length > 0 && (
                <div>
                  <h4 className="text-slate-300 text-sm font-semibold mb-3">Status History</h4>
                  <div className="relative pl-4 border-l-2 border-slate-700 space-y-3">
                    {detailTarget.history.map(h => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-slate-800"></div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {h.oldStatus && <span className="text-slate-500 text-xs">{h.oldStatus.replace(/_/g, ' ')}</span>}
                              {h.oldStatus && <span className="text-slate-600 text-xs">→</span>}
                              <span className="text-white text-xs font-medium">{h.newStatus.replace(/_/g, ' ')}</span>
                            </div>
                            {h.remarks && <p className="text-slate-400 text-xs mt-0.5 italic">{h.remarks}</p>}
                            {h.changedBy && <p className="text-slate-600 text-xs mt-0.5">by {h.changedBy.firstName} {h.changedBy.lastName}</p>}
                          </div>
                          <span className="text-slate-600 text-xs shrink-0 ml-3">{new Date(h.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
