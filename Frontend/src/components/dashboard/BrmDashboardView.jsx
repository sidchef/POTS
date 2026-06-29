import React, { useState, useMemo } from 'react';
import KanbanView from './KanbanView';
import ListView from './ListView';

export default function BrmDashboardView({ brms }) {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics calculations
  const total = brms.length;
  const completed = brms.filter(b => b.currentStatus === 'COMPLETED').length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const critical = brms.filter(b => b.priority === 'High' || b.priority === 'Critical').length;
  const rejected = brms.filter(b => b.currentStatus === 'REJECTED').length;
  const openCount = total - completed - rejected;
  
  // Filtered BRMs based on search
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
          >
            Kanban View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            List View
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="mt-6">
        {viewMode === 'kanban' ? (
          <KanbanView brms={filteredBrms} />
        ) : (
          <ListView brms={filteredBrms} />
        )}
      </div>
    </div>
  );
}
