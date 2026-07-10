import React, { useState, useMemo } from 'react';
import KanbanView from './KanbanView';
import ListView from './ListView';
import { BrmStatusBadge, PriorityBadge } from '../BrmStatusBadge';
import { getBrm } from '../../api/brm.api.js';
import BrmDetailModal from '../BrmDetailModal';


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
      <BrmDetailModal 
        target={detailTarget} 
        onClose={() => setDetailTarget(null)} 
      />

    </div>
  );
}
