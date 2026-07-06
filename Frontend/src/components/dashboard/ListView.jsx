import React from 'react';
import { BrmStatusBadge, PriorityBadge } from '../BrmStatusBadge';

export default function ListView({ brms, onCardClick }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-semibold">
              <th className="p-4">ID</th>
              <th className="p-4">Requirement</th>
              <th className="p-4">Status</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Team</th>
              <th className="p-4">Created Date</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {brms.map(brm => (
              <tr
                key={brm.id}
                onClick={() => onCardClick(brm)}
                className="hover:bg-slate-700/40 transition-colors cursor-pointer group">
                <td className="p-4 text-sm font-mono font-medium text-slate-300 whitespace-nowrap group-hover:text-brand-400 transition-colors">{brm.brmNumber}</td>
                <td className="p-4">
                  <div className="text-sm font-medium text-white mb-1">{brm.title}</div>
                  <div className="text-xs text-slate-400">{brm.Category}</div>
                </td>
                <td className="p-4"><BrmStatusBadge status={brm.currentStatus} /></td>
                <td className="p-4"><PriorityBadge priority={brm.priority || 'Medium'} /></td>
                <td className="p-4 text-sm text-slate-300">{brm.TeamName}</td>
                <td className="p-4 text-sm text-slate-400 whitespace-nowrap">
                  {new Date(brm.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-slate-600 group-hover:text-slate-300 text-xs transition-colors whitespace-nowrap">
                  View details →
                </td>
              </tr>
            ))}
            {brms.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  No requirements found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
