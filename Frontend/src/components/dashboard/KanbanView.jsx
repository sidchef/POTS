import React from 'react';
import { BrmStatusBadge, PriorityBadge } from '../BrmStatusBadge';

export default function KanbanView({ brms }) {
  // Map statuses exactly as discussed
  const openBrms = brms.filter(b => b.currentStatus !== 'COMPLETED' && b.currentStatus !== 'REJECTED');
  const doneBrms = brms.filter(b => b.currentStatus === 'COMPLETED');
  const blockedBrms = brms.filter(b => b.currentStatus === 'REJECTED');

  const Column = ({ title, brmsList, dotColor }) => (
    <div className="flex-1 min-w-[320px] bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 flex flex-col h-[700px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
          <h3 className="font-semibold text-slate-200">{title}</h3>
        </div>
        <span className="bg-slate-800 text-slate-400 text-xs py-1 px-2.5 rounded-full font-medium">
          {brmsList.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {brmsList.map(brm => (
          <div key={brm.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm hover:border-slate-500 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-slate-400">{brm.brmNumber}</span>
              <BrmStatusBadge status={brm.currentStatus} />
            </div>
            <h4 className="text-sm font-medium text-white mb-3 line-clamp-2">{brm.title}</h4>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md">{brm.TeamName}</span>
              <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md">{brm.Category}</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
              <PriorityBadge priority={brm.priority || 'Medium'} />
              <span className="text-xs text-slate-400">
                {new Date(brm.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        {brmsList.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
            No requirements here
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      <Column title="Open" brmsList={openBrms} dotColor="bg-blue-500" />
      <Column title="Done" brmsList={doneBrms} dotColor="bg-emerald-500" />
      <Column title="Rejected" brmsList={blockedBrms} dotColor="bg-red-500" />
    </div>
  );
}
