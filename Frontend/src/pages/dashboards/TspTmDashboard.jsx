import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';
import api from '../../api/axios.js';
import { getMyAllocations, addMilestone, toggleMilestone, logProgress, completeAllocation } from '../../api/tspTm.api.js';

export default function TspTmDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allBrms, setAllBrms] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [allocations, setAllocations] = useState([]);
  const [loadingAlloc, setLoadingAlloc] = useState(true);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [toast, setToast] = useState(null);

  // Milestone form state
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  // Progress form state
  const [progressForm, setProgressForm] = useState({ progressPct: '', remarks: '' });
  const [loggingProgress, setLoggingProgress] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingAll(true);
    try {
      const res = await api.get('/brms', { params: { limit: 100 } });
      setAllBrms(res.data.data.brms);
    } catch (err) { console.error(err); }
    finally { if (showSpinner) setLoadingAll(false); }
  }, []);

  const fetchAllocations = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingAlloc(true);
    try {
      const res = await getMyAllocations();
      setAllocations(res.data.data);
      // Keep selected allocation in sync
      if (selectedAlloc) {
        const updated = res.data.data.find(a => a.id === selectedAlloc.id);
        if (updated) setSelectedAlloc(updated);
      }
    } catch (err) { console.error(err); }
    finally { if (showSpinner) setLoadingAlloc(false); }
  }, [selectedAlloc]);

  useEffect(() => {
    fetchAllBrms(true);
    fetchAllocations(true);
    const interval = setInterval(() => {
      fetchAllBrms(false);
      fetchAllocations(false);
    }, 10000);
    const onFocus = () => { fetchAllBrms(false); fetchAllocations(false); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;
    setAddingMilestone(true);
    try {
      await addMilestone(selectedAlloc.id, milestoneForm);
      showToast('Milestone added!');
      setMilestoneForm({ title: '', description: '', dueDate: '' });
      setShowMilestoneForm(false);
      fetchAllocations(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add milestone', 'error');
    } finally { setAddingMilestone(false); }
  };

  const handleToggleMilestone = async (milestoneId) => {
    try {
      await toggleMilestone(milestoneId);
      fetchAllocations(false);
    } catch (err) {
      showToast('Failed to update milestone', 'error');
    }
  };

  const handleLogProgress = async (e) => {
    e.preventDefault();
    setLoggingProgress(true);
    try {
      await logProgress(selectedAlloc.id, progressForm);
      showToast('Progress logged!');
      setProgressForm({ progressPct: '', remarks: '' });
      setShowProgressForm(false);
      fetchAllocations(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log progress', 'error');
    } finally { setLoggingProgress(false); }
  };

  const handleCompleteTask = async (allocationId) => {
    if (!window.confirm("Are you sure you want to mark this task as fully completed?")) return;
    try {
      await completeAllocation(allocationId);
      showToast('Task marked as completed!', 'success');
      fetchAllocations(false);
    } catch (err) {
      showToast('Failed to complete task', 'error');
    }
  };


  // Latest progress % for a given allocation
  const getLatestProgress = (alloc) => {
    if (!alloc.progressLogs || alloc.progressLogs.length === 0) return 0;
    return alloc.progressLogs[0].progressPct;
  };

    // Get unique assigned BRMs for the overview tab
  const assignedBrms = useMemo(() => {
    const brmMap = new Map();
    allocations.forEach(a => {
      if (a.brm && !brmMap.has(a.brm.id)) {
        brmMap.set(a.brm.id, a.brm);
      }
    });
    return Array.from(brmMap.values());
  }, [allocations]);


  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'My Tasks', count: allocations.filter(a => a.status === 'ACTIVE').length },
  ];

  return (
   <div className="min-h-screen bg-slate-50 dark:bg-dark-900 text-slate-900 dark:text-white transition-colors duration-200">
      <Navbar title="TSP Team Member Dashboard" />

      {/* Global Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border backdrop-blur-sm ${
          toast.type === 'error'
            ? 'bg-red-500/15 border-red-500/30 text-red-300'
            : 'bg-green-500/15 border-green-500/30 text-green-300'
        }`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mb-8 border-b border-slate-700/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === tab.key ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
                }`}>{tab.count}</span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"></span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          loadingAlloc ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : (
            <BrmDashboardView brms={assignedBrms} />
          )
        )}

        {/* ── MY TASKS TAB ── */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT — Task List */}
            <div className="space-y-4">
              <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">
                Assigned Tasks ({allocations.length})
              </h2>
              {loadingAlloc ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-slate-300 font-medium">No tasks assigned yet</p>
                  <p className="text-slate-500 text-sm mt-1">Your TSP TL will assign tasks to you soon.</p>
                </div>
              ) : (
                allocations.map(alloc => {
                  const progress = getLatestProgress(alloc);
                  const completedMilestones = alloc.milestones?.filter(m => m.status === 'COMPLETED').length || 0;
                  const totalMilestones = alloc.milestones?.length || 0;

                   let computedStatus = alloc.status;
                  if (alloc.status === 'ACTIVE' && alloc.endDate && new Date(alloc.endDate) < new Date()) {
                    computedStatus = 'DELAYED';
                  }

                  return (
                        <div
                      key={alloc.id}
                      onClick={() => { setSelectedAlloc(alloc); setShowMilestoneForm(false); setShowProgressForm(false); }}
                      className={`p-5 rounded-xl border cursor-pointer transition-all shadow-sm ${
                        selectedAlloc?.id === alloc.id
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-400 dark:border-blue-500/40 shadow-lg shadow-blue-500/10'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-slate-900 dark:text-white font-semibold text-sm">{alloc.taskTitle}</p>
                          <p className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-0.5">{alloc.brm?.brmNumber} · {alloc.brm?.title}</p>
                        </div>

                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          computedStatus === 'DELAYED' 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : computedStatus === 'ACTIVE' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                        }`}>
                          {computedStatus}
                        </span>
                      </div>

                      {/* Skill + dates */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-medium">{alloc.skill}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(alloc.startDate).toLocaleDateString()} → {new Date(alloc.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Milestones summary */}
                      {totalMilestones > 0 && (
                        <p className="text-slate-500 text-[10px] mt-2">
                          ✓ {completedMilestones}/{totalMilestones} milestones completed
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT — Task Detail Panel */}
            <div>
              {!selectedAlloc ? (
                <div className="flex flex-col items-center justify-center h-64 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl border-dashed">
                  <p className="text-slate-500 text-sm">← Select a task to view details</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                    {/* Header */}
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold">{selectedAlloc.taskTitle}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{selectedAlloc.brm?.brmNumber} — {selectedAlloc.brm?.title}</p>

                        {selectedAlloc.taskDescription && (
                          <p className="text-slate-500 text-xs mt-2">{selectedAlloc.taskDescription}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <PriorityBadge priority={selectedAlloc.brm?.priority} />
                        {selectedAlloc.status === 'ACTIVE' && (
                          <button onClick={() => handleCompleteTask(selectedAlloc.id)}
                            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-500 text-white rounded-lg text-xs font-semibold shadow transition-all border border-green-500">
                            ✓ Mark Task Done
                          </button>
                        )}
                      </div>

                    </div>
                    <div className="flex gap-4 mt-3 flex-wrap">
                      <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium">{selectedAlloc.skill}</span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        📅 {new Date(selectedAlloc.startDate).toLocaleDateString()} → {new Date(selectedAlloc.endDate).toLocaleDateString()}
                      </span>
                      {/* Fixed alignment here: */}
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        Assigned by: {selectedAlloc.assignedBy?.firstName} {selectedAlloc.assignedBy?.lastName}
                      </span>
                    </div>
                  </div>


                  <div className="p-5 space-y-6">

                    {/* ── Progress Section ── */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-slate-300 text-sm font-semibold">Progress</h4>
                        <button onClick={() => { setShowProgressForm(v => !v); setShowMilestoneForm(false); }}
                          className="px-3 py-1 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all">
                          + Log Progress
                        </button>
                      </div>

                      {/* Latest progress bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Latest: {getLatestProgress(selectedAlloc)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${getLatestProgress(selectedAlloc)}%` }}
                          />
                        </div>
                      </div>

                         {/* Log form */}
                      {showProgressForm && (
                        <form onSubmit={handleLogProgress} className="p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-300 dark:border-slate-700/60 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-slate-500 dark:text-slate-400 text-xs block mb-1">Progress % (0-100)</label>
                              <input type="number" min="0" max="100" required
                                value={progressForm.progressPct}
                                onChange={e => setProgressForm(f => ({ ...f, progressPct: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <textarea placeholder="Remarks (optional)" rows={2}
                            value={progressForm.remarks}
                            onChange={e => setProgressForm(f => ({ ...f, remarks: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                          />

                          <div className="flex gap-2">
                            <button type="button" onClick={() => setShowProgressForm(false)}
                              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-xs hover:bg-slate-700 transition-colors">
                              Cancel
                            </button>
                            <button type="submit" disabled={loggingProgress}
                              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
                              {loggingProgress ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Progress history */}
                      {selectedAlloc.progressLogs?.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {selectedAlloc.progressLogs.map((log, i) => (
                             <div key={i} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-200 dark:border-transparent">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{log.progressPct}%</span>
                              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{log.remarks || '—'}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>

                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Milestones Section ── */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-slate-300 text-sm font-semibold">
                          Milestones
                          {selectedAlloc.milestones?.length > 0 && (
                            <span className="ml-2 text-slate-500 text-xs font-normal">
                              ({selectedAlloc.milestones.filter(m => m.status === 'COMPLETED').length}/{selectedAlloc.milestones.length} done)
                            </span>
                          )}
                        </h4>
                        <button onClick={() => { setShowMilestoneForm(v => !v); setShowProgressForm(false); }}
                          className="px-3 py-1 text-xs rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all">
                          + Add Milestone
                        </button>
                      </div>

                                            {/* Add Milestone Form */}
                      {showMilestoneForm && (
                        <form onSubmit={handleAddMilestone} className="p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-300 dark:border-slate-700/60 space-y-3 mb-3">
                          <input type="text" placeholder="Milestone title *" required
                            value={milestoneForm.title}
                            onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-green-500"
                          />
                          <textarea placeholder="Description (optional)" rows={2}
                            value={milestoneForm.description}
                            onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none"
                          />
                          <div>
                            <label className="text-slate-500 dark:text-slate-400 text-xs block mb-1">Due Date (optional)</label>
                            <input type="date"
                              value={milestoneForm.dueDate}
                              onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-green-500"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button type="button" onClick={() => setShowMilestoneForm(false)}
                              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-xs hover:bg-slate-700 transition-colors">
                              Cancel
                            </button>
                            <button type="submit" disabled={addingMilestone}
                              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
                              {addingMilestone ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Milestones List */}
                      {!selectedAlloc.milestones || selectedAlloc.milestones.length === 0 ? (
                        <p className="text-slate-500 text-xs italic">No milestones yet. Add one to track your progress.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedAlloc.milestones.map(m => (
                            <div key={m.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors shadow-sm ${
                                m.status === 'COMPLETED'
                                  ? 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/20'
                                  : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60'
                              }`}
                            >
                              <button onClick={() => handleToggleMilestone(m.id)}
                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                  m.status === 'COMPLETED'
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-slate-300 dark:border-slate-500 hover:border-green-500 bg-slate-50 dark:bg-transparent'
                                }`}
                              >
                                {m.status === 'COMPLETED' && <span className="text-[10px]">✓</span>}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${m.status === 'COMPLETED' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                  {m.title}
                                </p>
                                {m.description && <p className="text-slate-500 text-xs mt-0.5">{m.description}</p>}
                                {m.dueDate && (
                                  <p className="text-slate-500 text-[10px] mt-1">
                                    Due: {new Date(m.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
