import React, { useState, useEffect } from 'react';
import { getMyAssignedTasks } from '../../api/brm.api.js';
import Modal from '../Modal.jsx';

export default function TaskManagementLayout({ brmsNeedingAllocation, onSelectBrmToAllocate, refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('ALL_TASKS');
  const [selectedBrm, setSelectedBrm] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskView, setSelectedTaskView] = useState(null);
  const [modalTab, setModalTab] = useState('overview');
  const [qaAssignModal, setQaAssignModal] = useState({ isOpen: false, task: null });
  const [qaMembers, setQaMembers] = useState([]);


  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getMyAssignedTasks();
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

    // Helper to group identical tasks together so they appear as one card
  const groupTasksByTitle = (tasksArray) => {
    const groups = {};
    const now = new Date();
    
    tasksArray.forEach(t => {
      // Dynamically override status to BREACHED if it's active and past the deadline
      let computedStatus = t.status;
      if (t.status === 'ACTIVE' && t.endDate && new Date(t.endDate) < now) {
        computedStatus = 'BREACHED';
      }

      // Group by BRM ID and Task Title
      const key = `${t.brm?.id || 'unknown'}_${t.taskTitle}`;
      if (!groups[key]) {
        groups[key] = {
          ...t,
          assignedMembers: [{
            firstName: t.tspMember?.user?.firstName,
            lastName: t.tspMember?.user?.lastName,
            status: computedStatus,
            skill: t.skill,
            progressLogs: t.progressLogs || [],
            milestones: t.milestones || []
          }]
        };
      } else {
        groups[key].assignedMembers.push({
          firstName: t.tspMember?.user?.firstName,
          lastName: t.tspMember?.user?.lastName,
          status: computedStatus,
          skill: t.skill,
          progressLogs: t.progressLogs || [],
          milestones: t.milestones || []
        });
      }
    });
    return Object.values(groups);
  };

    // Helper to determine the overall status for the grouped task card
  const getGroupedStatus = (members) => {
    if (members.every(m => m.status === 'COMPLETED')) return 'COMPLETED';
    if (members.some(m => m.status === 'QA_TESTING')) return 'QA REVIEW';
    if (members.some(m => m.status === 'BREACHED')) return 'BREACHED';
    return 'ACTIVE';
  };

  // Helper to draw a beautiful colored pill badge based on status
  const getStatusBadge = (statusStr) => {
    if (statusStr === 'COMPLETED') return <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-semibold border border-green-500/30">COMPLETED</span>;
    if (statusStr === 'QA REVIEW') return <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-semibold border border-yellow-500/30">QA REVIEW</span>;
    if (statusStr === 'BREACHED') return <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-semibold border border-red-500/30">BREACHED</span>;
    return <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-semibold border border-blue-500/30">ACTIVE</span>;
  };

    const handleOpenQaModal = async (task, e) => {
    e.stopPropagation(); // Stop the row click from triggering
    setQaAssignModal({ isOpen: true, task });
    try {
      const res = await axiosInstance.get('/brms/qa-members');
      setQaMembers(res.data.data);
    } catch (err) { console.error("Failed to fetch QA members", err); }
  };

  const handleAssignToQa = async (qaMemberId) => {
    try {
      await axiosInstance.post('/brms/allocations/assign-qa', {
        brmId: selectedBrm.id,
        taskTitle: qaAssignModal.task.taskTitle,
        qaMemberId
      });
      setQaAssignModal({ isOpen: false, task: null });
      // Call your fetchTasks function here to reload the dashboard!
    } catch (err) { console.error("Failed to assign QA", err); }
  };





    // Group the tasks first, then filter so the Modal receives the correct format!
  const groupedTasks = groupTasksByTitle(tasks);
  const completedTasks = groupedTasks.filter(t => t.assignedMembers.every(m => m.status === 'COMPLETED'));
  
  // For future QA integration
  const qaTasks = groupedTasks.filter(t => t.assignedMembers.some(m => m.status === 'QA_TESTING')); 
 

  return (
    <div className="flex h-[800px] bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900/50 border-r border-slate-700 flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold">Task Management</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Filters */}
          <div className="space-y-1">
              <button onClick={() => { setActiveTab('ALL_TASKS'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ALL_TASKS' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span> All Tasks</span>
              <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full">{groupTasksByTitle(tasks).length}</span>
            </button>
            <button onClick={() => { setActiveTab('COMPLETED'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span> Completed Tasks</span>
              <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full">{groupTasksByTitle(completedTasks).length}</span>
            </button>
            <button onClick={() => { setActiveTab('QA'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'QA' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span> QA Tasks</span>
              <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full">{groupTasksByTitle(qaTasks).length}</span>
            </button>

          </div>

          {/* BRMs Needing Allocation */}
          <div>
            <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3 px-2">Needs Allocation</h3>
            <div className="space-y-2">
              {brmsNeedingAllocation.length === 0 ? (
                <p className="text-slate-500 text-sm px-2">No BRMs need allocation right now.</p>
              ) : (
                brmsNeedingAllocation.map(brm => (
                  <div key={brm.id} onClick={() => { setSelectedBrm(brm); setActiveTab('BRM_TASKS'); }}
                    className={`cursor-pointer hover:bg-slate-800 border p-3 rounded-xl transition-all ${
                      selectedBrm?.id === brm.id ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-slate-700/50'
                    }`}>
                    <p className="text-slate-300 font-medium text-sm truncate">{brm.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-blue-400 font-mono text-[10px]">{brm.brmNumber}</span>
                      <span className="text-purple-400 text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-full">{brm.currentStatus.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 bg-slate-800/30 p-6 overflow-y-auto">
        {loading ? (
           <p className="text-slate-400 text-sm">Loading tasks...</p>
        ) : activeTab === 'ALL_TASKS' ? (
           <div className="space-y-4">
             <h2 className="text-white text-lg font-semibold mb-6">All Assigned Tasks</h2>
                {groupTasksByTitle(tasks).map((t, idx) => (
              <div 
                 key={idx} 
                 onClick={() => setSelectedTaskView(t)} 
                 className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-brand-500 hover:bg-slate-800/80 transition-all" // <-- ADD cursor/hover styles
               >

                 <div>
                   <p className="text-white font-medium">{t.taskTitle}</p>
                   <p className="text-slate-400 text-xs mt-1">
                     BRM: {t.brm?.title} • Assigned to: {t.assignedMembers.map(m => `${m.firstName} ${m.lastName || ''}`.trim()).join(', ')}
                   </p>
                 </div>
                 {getStatusBadge(getGroupedStatus(t.assignedMembers))}
               </div>
             ))}

           </div>
        ) : activeTab === 'BRM_TASKS' && selectedBrm ? (
           <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
               <div>
                 <h2 className="text-white text-lg font-semibold">{selectedBrm.title}</h2>
                 <p className="text-slate-400 text-sm">{selectedBrm.brmNumber}</p>
               </div>
               <button onClick={() => onSelectBrmToAllocate(selectedBrm)}
                 className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all">
                 + New Task
               </button>
             </div>
                
                
                {groupTasksByTitle(tasks.filter(t => t.brm?.id === selectedBrm.id)).length === 0 ? (
               <div className="text-center py-10 bg-slate-800/50 border border-slate-700 border-dashed rounded-xl">
                 <p className="text-slate-400">No tasks assigned for this BRM yet.</p>
               </div>
             ) : (
               groupTasksByTitle(tasks.filter(t => t.brm?.id === selectedBrm.id)).map((t, idx) => (
                <div 
                 key={idx} 
                 onClick={() => setSelectedTaskView(t)} // <-- ADD THIS
                 className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-brand-500 hover:bg-slate-800/80 transition-all" // <-- ADD cursor/hover styles
               >

                   <div>
                     <p className="text-white font-medium">{t.taskTitle}</p>
                     <p className="text-slate-400 text-xs mt-1">
                       Assigned to: {t.assignedMembers.map(m => `${m.firstName} ${m.lastName || ''}`.trim()).join(', ')}
                     </p>
                   </div>
                   {getStatusBadge(getGroupedStatus(t.assignedMembers))}
                 </div>
               ))
             )}

           </div>
                ) : activeTab === 'COMPLETED' ? (
           <div className="space-y-4">
             <h2 className="text-green-400 text-lg font-semibold mb-6">Completed Tasks</h2>
             {completedTasks.length === 0 ? (
               <p className="text-slate-400 text-sm">No completed tasks yet.</p>
             ) : (
               completedTasks.map((t, idx) => (
                  <div 
                   key={idx} 
                   onClick={() => setSelectedTaskView(t)}
                   className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-brand-500 hover:bg-slate-800/80 transition-all"
                 >
                   <div>
                     <p className="text-white font-medium">{t.taskTitle}</p>
                     <p className="text-slate-400 text-xs mt-1">
                       Assigned to: {t.assignedMembers.map(m => `${m.firstName || ''} ${m.lastName || ''}`.trim()).join(', ')}
                     </p>
                   </div>
                    <div className="flex items-center gap-4">
                   {getStatusBadge(getGroupedStatus(t.assignedMembers))}
                   <button 
                       onClick={(e) => handleOpenQaModal(t, e)}
                       className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-all"
                     >
                       Assign to QA
                     </button>
                   </div>
                 </div>
               ))
             )}
           </div>
        ) : (

           <div className="text-center py-20">
             <div className="text-4xl mb-4">🧪</div>
             <p className="text-white font-semibold text-lg">QA Module Coming Soon</p>
             <p className="text-slate-400 text-sm">Tasks in QA testing stage will appear here.</p>
           </div>
        )}
      </div>


            {/* ─── TASK DETAILS MODAL ────────────────────────────────────────── */}
      {selectedTaskView && (
        <Modal 
          title={selectedTaskView.brm?.brmNumber || 'Task Details'} 
          onClose={() => { setSelectedTaskView(null); setModalTab('overview'); }} 
          wide
        >
          <div className="space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedTaskView.taskTitle}</h2>
            </div>

            {/* MODAL TAB NAVIGATION */}
            <div className="flex space-x-1 border-b border-slate-700/50 overflow-x-auto">
              <button 
                onClick={() => setModalTab('overview')}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${modalTab === 'overview' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setModalTab('status')}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${modalTab === 'status' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Task Status
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {modalTab === 'overview' && (
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">BRM Reference</p>
                  <p className="text-white text-sm mt-1">{selectedTaskView.brm?.brmNumber} - {selectedTaskView.brm?.title}</p>
                </div>
                
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Description</p>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                    {selectedTaskView.taskDescription || 'No description provided.'}
                  </p>
                </div>

                {/* 4 Data Blocks Grid */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                    <p className="text-slate-500 text-xs mb-1">Created</p>
                    <p className="text-white font-semibold text-sm">
                      {new Date(selectedTaskView.createdAt).toISOString().split('T')[0]}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                    <p className="text-slate-500 text-xs mb-1">Start Date</p>
                    <p className="text-white font-semibold text-sm">
                      {new Date(selectedTaskView.startDate).toISOString().split('T')[0]}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                    <p className="text-slate-500 text-xs mb-1">Due Date</p>
                    <p className="text-white font-semibold text-sm">
                      {new Date(selectedTaskView.endDate).toISOString().split('T')[0]}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                    <p className="text-slate-500 text-xs mb-1">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(getGroupedStatus(selectedTaskView.assignedMembers))}
                    </div>
                  </div>
                </div>

                {/* ASSIGNED DEVELOPERS SECTION (Moved to Overview) */}
                <div className="pt-4 border-t border-slate-700/50 space-y-4">
                  <h3 className="text-slate-400 font-semibold uppercase tracking-wider text-sm">Assigned Developers</h3>
                  <div className="space-y-3">
                    {selectedTaskView.assignedMembers.map((m, idx) => (
                      <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Initials Circle */}
                          <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center text-emerald-400 font-bold">
                            {m.firstName?.[0]}{m.lastName?.[0] || ''}
                          </div>
                          {/* Name and Skill */}
                          <div>
                            <p className="text-white font-medium text-sm">{m.firstName} {m.lastName}</p>
                            <p className="text-slate-400 text-xs mt-0.5">Assigned Skill • {m.skill}</p> 
                          </div>
                        </div>
                        {/* Developer Pill */}
                        <span className="px-3 py-1 bg-emerald-900/30 border border-emerald-800 rounded-full text-emerald-400 text-xs">
                          Developer
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: TASK STATUS (Progress & Milestones) */}
            {modalTab === 'status' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {selectedTaskView.assignedMembers.map((m, idx) => {
                  const latestProgress = m.progressLogs?.[0]?.progressPct || 0;
                  const latestRemark = m.progressLogs?.[0]?.remarks || 'No progress logged yet.';
                  
                  return (
                    <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
                      {/* Member Info & Progress Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-white font-medium text-sm">{m.firstName} {m.lastName} <span className="text-slate-500 text-xs ml-1 font-normal">({m.skill})</span></p>
                          <span className="text-brand-400 font-bold text-sm">{latestProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div className="bg-brand-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${latestProgress}%` }}></div>
                        </div>
                        <p className="text-slate-400 text-xs mt-2 italic flex items-center gap-1">
                          <span className="text-brand-500">↳</span> "{latestRemark}"
                        </p>
                      </div>

                      {/* Milestones List */}
                      {m.milestones && m.milestones.length > 0 && (
                        <div className="pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Milestones</p>
                          <div className="space-y-2.5">
                            {m.milestones.map(ms => (
                              <div key={ms.id} className="flex items-start space-x-3">
                                <div className="mt-0.5">
                                  {ms.status === 'COMPLETED' ? (
                                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-600"></div>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm ${ms.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-white font-medium'}`}>{ms.title}</p>
                                  {ms.dueDate && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(ms.dueDate).toLocaleDateString()}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </Modal>
      )}

            {/* QA Assignment Modal */}
      {qaAssignModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setQaAssignModal({ isOpen: false, task: null })} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h2 className="text-xl font-bold text-white mb-2">Assign to QA</h2>
            <p className="text-slate-400 text-sm mb-6">Select a QA member to review <span className="text-brand-400 font-semibold">{qaAssignModal.task.taskTitle}</span></p>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {qaMembers.map(qa => (
                <div key={qa.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div>
                    <p className="text-white font-medium">{qa.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Active QA Tasks: {qa.activeTasksCount}</p>
                  </div>
                  <button 
                    onClick={() => handleAssignToQa(qa.id)}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Select
                  </button>
                </div>
              ))}
              {qaMembers.length === 0 && <p className="text-slate-500 text-center text-sm py-4">No QA members found.</p>}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
