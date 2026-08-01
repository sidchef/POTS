import { useState, useEffect } from 'react';
import { getBrmMetrics } from '../api/brm.api.js';

const StatCard = ({ label, value, sub, color = 'text-white', bg = 'bg-slate-800', icon }) => (
  <div className={`${bg} border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-1`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
      {icon && <span className="text-xl">{icon}</span>}
    </div>
    <p className={`text-3xl font-black ${color}`}>{value}</p>
    {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
  </div>
);

const SeverityBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-semibold ${color}`}>{label}</span>
        <span className="text-slate-400">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${
          label === 'CRITICAL' ? 'bg-red-500' :
          label === 'HIGH'     ? 'bg-orange-500' :
          label === 'MEDIUM'   ? 'bg-yellow-500' : 'bg-blue-500'
        }`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default function BrmMetricsTab() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getBrmMetrics()
      .then(res => {
        setMetrics(res.data.data);
        if (res.data.data.length > 0) setSelected(res.data.data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
    </div>
  );

  if (metrics.length === 0) return (
    <div className="py-24 flex flex-col items-center justify-center bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl mt-6">
      <span className="text-4xl mb-4 opacity-40">📊</span>
      <h3 className="text-lg font-semibold text-slate-300 mb-1">No Metrics Yet</h3>
      <p className="text-slate-500 text-sm text-center max-w-sm">Metrics are calculated automatically once a BRM is marked as Completed by the Product Lead.</p>
    </div>
  );

  const m = selected;

  return (
    <div className="flex gap-6 mt-6 min-h-[600px]">
      {/* Sidebar BRM List */}
      <div className="w-72 flex-shrink-0 space-y-2">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">Completed BRMs</p>
        {metrics.map(metric => (
          <button
            key={metric.id}
            onClick={() => setSelected(metric)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all ${
              selected?.id === metric.id
                ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <p className="text-xs font-mono font-bold mb-0.5">{metric.brm.brmNumber}</p>
            <p className="text-sm font-semibold truncate">{metric.brm.title}</p>
            <p className="text-xs text-slate-500 mt-1">{metric.totalDurationDays} days total</p>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {m && (
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/60 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-56 h-56 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-brand-400 font-mono text-xs font-bold bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/20">
                    {m.brm.brmNumber}
                  </span>
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ COMPLETED
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{m.brm.title}</h2>
                <p className="text-slate-400 text-sm">{m.brm.TeamName} · {m.brm.Category}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white">{m.totalDurationDays}</p>
                <p className="text-slate-400 text-xs">Total Days</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Approval SLA" value={`${m.approvalSlaHours}h`} sub={m.approvalBreached ? '⚠ SLA Breached' : '✓ Within SLA'} color={m.approvalBreached ? 'text-red-400' : 'text-emerald-400'} icon="⏱" />
            <StatCard label="Resubmissions" value={m.approvalResubmissions} sub="Approval cycles" color="text-yellow-400" icon="🔄" />
            <StatCard label="Architecture SLA" value={`${m.architectureSlaHours}h`} sub={m.architectureBreached ? '⚠ SLA Breached' : '✓ Within SLA'} color={m.architectureBreached ? 'text-red-400' : 'text-emerald-400'} icon="🏗" />
            <StatCard label="Total Tasks" value={`${m.completedTasks}/${m.totalTasks}`} sub="Tasks Completed" color="text-blue-400" icon="✅" />
          </div>

          {/* Tasks + QA + Security Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Task Completion */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Task Execution</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#334155" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#3b82f6" strokeWidth="3"
                      strokeDasharray={`${m.totalTasks > 0 ? (m.completedTasks / m.totalTasks) * 94 : 0} 94`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-black text-blue-400">{m.completedTasks}</p>
                  <p className="text-slate-400 text-xs">of {m.totalTasks} tasks done</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">QA Cycles: <strong className="text-slate-300">{m.totalQaCycles}</strong></p>
            </div>

            {/* Security Scans */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Security Scans</p>
              <p className="text-4xl font-black text-white mb-1">{m.totalSecurityScans}</p>
              <p className="text-slate-400 text-xs mb-4">Scans Performed</p>
              <div className="flex gap-2 flex-wrap">
                {m.totalRemediationTasks > 0 && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    {m.totalRemediationTasks} Failed Scan(s)
                  </span>
                )}
                {m.totalRemediationTasks === 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    ✓ Cleared on First Scan
                  </span>
                )}
              </div>
            </div>

            {/* Findings */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Security Findings</p>
              <p className="text-4xl font-black text-white mb-3">{m.totalFindings}</p>
              {m.totalFindings > 0 ? (
                <div className="space-y-3">
                  <SeverityBar label="CRITICAL" count={m.criticalFindings} total={m.totalFindings} color="text-red-400" />
                  <SeverityBar label="HIGH" count={m.highFindings} total={m.totalFindings} color="text-orange-400" />
                  <SeverityBar label="MEDIUM" count={m.mediumFindings} total={m.totalFindings} color="text-yellow-400" />
                  <SeverityBar label="LOW" count={m.lowFindings} total={m.totalFindings} color="text-blue-400" />
                </div>
              ) : (
                <p className="text-emerald-400 text-xs font-semibold">✓ Zero findings — Clean BRM</p>
              )}
            </div>
          </div>

          {/* Developer Performance Section */}
          {m.brm?.taskAllocations?.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mt-4">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Developer Performance (Task Level)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {m.brm.taskAllocations.map(task => {
                  const devName = task.tspMember?.user ? `${task.tspMember.user.firstName} ${task.tspMember.user.lastName}` : 'Unassigned';
                  
                  // Calculate timing metrics
                  const start = new Date(task.startDate);
                  const end = new Date(task.endDate);
                  const completed = task.status === 'COMPLETED' ? new Date(task.endDate) : null;
                  
                  // If completed, use completedAt. If active/delayed, use current date to show running time
                  const finishDate = completed || new Date();
                  const totalDaysTaken = Math.ceil((finishDate - start) / (1000 * 60 * 60 * 24)) || 1;
                  const estimatedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
                  
                  const isDelayed = finishDate > end;
                  const delayDays = isDelayed ? Math.ceil((finishDate - end) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <div key={task.id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-white text-sm font-semibold truncate pr-2">{task.taskTitle}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            task.status === 'QA_TESTING' || task.status === 'QA_COMPLETED' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>{task.status.replace('_', ' ')}</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-4">Dev: <span className="text-slate-200">{devName}</span></p>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Progress Bar for Time */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold uppercase">
                            <span>{totalDaysTaken} days taken</span>
                            <span>{estimatedDays} days est.</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                            {/* Base green bar for on-time portion */}
                            <div className={`h-full ${isDelayed ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                 style={{ width: `${Math.min((totalDaysTaken / estimatedDays) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            Deadline: {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-[11px] font-bold ${isDelayed ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            {isDelayed ? `⚠ Delayed by ${delayDays}d` : '✓ On Time'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Lifecycle Dates</p>
              <div className="flex items-center gap-0">
              {[
                { label: 'Created', date: m.overallStartDate, color: 'bg-slate-500' },
                { label: 'Completed', date: m.overallEndDate, color: 'bg-emerald-500' },
              ].map((step, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${step.color} shadow-lg`}></div>
                    <p className="text-white text-xs font-semibold mt-2">{step.label}</p>
                    <p className="text-slate-500 text-[11px]">{new Date(step.date).toLocaleDateString()}</p>
                  </div>
                  {i < 1 && <div className="flex-1 h-px bg-gradient-to-r from-slate-500 to-emerald-500 mx-2 mb-8"></div>}
                </div>
              ))}
            </div>

        

          </div>
        </div>
      )}
    </div>
  );
}
