import React,{useState} from 'react';
import Modal from './Modal';
import { BrmStatusBadge, PriorityBadge } from './BrmStatusBadge';
import { getQaScenarios } from '../api/tspQa.api.js';

export default function BrmDetailModal({ target, onClose }) {
  const [selectedTaskView, setSelectedTaskView] = useState(null);
  const [taskModalTab, setTaskModalTab] = useState('overview');
  const [qaScenarios, setQaScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const handleFetchScenarios = async (allocationId) => {
    setLoadingScenarios(true);
    try {
      const res = await getQaScenarios(allocationId);
      setQaScenarios(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch scenarios", err);
    } finally {
      setLoadingScenarios(false);
    }
  };
  if (!target) return null;

  return (
    <Modal
      title={target.loading ? 'Loading...' : `BRM ${target.brmNumber} — Details`}
      onClose={onClose}
      wide
    >
      {target.loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. Basic Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Title</p><p className="text-white font-semibold">{target.title}</p></div>
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Status</p><BrmStatusBadge status={target.currentStatus} /></div>
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Team</p><p className="text-slate-300 text-sm">{target.TeamName}</p></div>
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Category</p><p className="text-slate-300 text-sm">{target.Category}</p></div>
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Priority</p><PriorityBadge priority={target.priority} /></div>
            <div><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Product Lead</p><p className="text-slate-300 text-sm">{target.currentPl?.firstName} {target.currentPl?.lastName}</p></div>
            {target.description && (
              <div className="col-span-2"><p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Description</p><p className="text-slate-300 text-sm leading-relaxed">{target.description}</p></div>
            )}
          </div>

          {/* 2. Approval Cycles */}
          {target.approvalCycles?.length > 0 && (
            <div>
              <h4 className="text-slate-300 text-sm font-semibold mb-3">Approval Cycles</h4>
              <div className="space-y-3">
                {target.approvalCycles.map(cycle => (
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

          {/* 3. User Stories */}
          <div>
            <h4 className="text-slate-300 text-sm font-semibold mb-3">User Stories ({target.userStory?.length || 0})</h4>
            {!target.userStory?.length ? (
              <p className="text-slate-500 text-sm text-center py-4 border border-dashed border-slate-700 rounded-xl">No user stories yet.</p>
            ) : (
              <div className="space-y-2">
                {target.userStory.map((story, idx) => (
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

          {/* 4. Architecture Documents */}
          {target.architectureDocs?.length > 0 && (
            <div>
              <h4 className="text-slate-300 text-sm font-semibold mb-3">Architecture Documents ({target.architectureDocs.length})</h4>
              <div className="space-y-2">
                {target.architectureDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{doc.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-indigo-400 font-mono text-xs font-bold">v{doc.version}</span>
                          <span className="text-slate-500 text-xs">• Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span className="text-slate-500 text-xs">• by {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}</span>
                        </div>
                      </div>
                    </div>
                    <a 
                      href={`${import.meta.env.VITE_API_URL.replace('/api','')}${doc.fileUrl}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-medium transition-colors whitespace-nowrap ml-4 border border-brand-500/30">
                      View File
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/*5. Technology & Resource Requirements */}
          {target.technologyRequirements?.length > 0 && (
            <div>
              <h4 className="text-slate-300 text-sm font-semibold mb-3">Technology & Resources ({target.technologyRequirements.length})</h4>
              <div className="space-y-2">
                {target.technologyRequirements.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 border border-orange-500/20">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{req.technologyName}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Submitted by {req.submittedBy?.firstName} {req.submittedBy?.lastName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 shadow-sm">
                        {req.resourceCount} {req.resourceCount === 1 ? 'Resource' : 'Resources'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md border font-medium shadow-sm ${
                        req.allocationType === 'FULL_TIME' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {req.allocationType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 5.5 Task Allocations */}
          {target.taskAllocations?.length > 0 && (() => {
            // Group the tasks by title and compute DELAYED status
            const groups = {};
            const now = new Date();
            
            target.taskAllocations.forEach(alloc => {
              let computedStatus = alloc.status;
              if (alloc.status === 'ACTIVE' && alloc.endDate && new Date(alloc.endDate) < now) {
                computedStatus = 'DELAYED';
              }
              const key = alloc.taskTitle;
                            if (!groups[key]) {
                groups[key] = {
                  ...alloc,
                  assignedMembers: [{
                    firstName: alloc.tspMember?.user?.firstName,
                    lastName: alloc.tspMember?.user?.lastName,
                    status: computedStatus,
                    skill: alloc.skill,
                    progressLogs: alloc.progressLogs || [],
                    milestones: alloc.milestones || [],
                    id: alloc.id
                  }]
                };
              } else {
                groups[key].assignedMembers.push({
                  firstName: alloc.tspMember?.user?.firstName,
                  lastName: alloc.tspMember?.user?.lastName,
                  status: computedStatus,
                  skill: alloc.skill,
                  progressLogs: alloc.progressLogs || [],
                  milestones: alloc.milestones || [],
                  id: alloc.id
                });
              }

            });

            const groupedAllocations = Object.values(groups);

            return (
              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3">Task Allocations</h4>
                <div className="grid gap-3">
                  {groupedAllocations.map(alloc => {
                    // Compute overall status for the grouped task
                    let overallStatus = 'ACTIVE';
                    if (alloc.assignedMembers.some(m => m.status === 'QA_COMPLETED')) overallStatus = 'QA COMPLETED';
                    else if (alloc.assignedMembers.every(m => m.status === 'COMPLETED')) overallStatus = 'COMPLETED';
                    else if (alloc.assignedMembers.some(m => m.status === 'QA_TESTING')) overallStatus = 'QA REVIEW';
                    else if (alloc.assignedMembers.some(m => m.status === 'DELAYED')) overallStatus = 'DELAYED';

                     return (
                      <div 
                        key={alloc.taskTitle} 
                        onClick={() => { setSelectedTaskView(alloc); setTaskModalTab('overview'); }}
                        className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 cursor-pointer hover:border-brand-500/50 transition-all"
                      >

                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="text-white text-sm font-medium">{alloc.taskTitle}</h5>
                            {alloc.taskDescription && <p className="text-slate-400 text-xs mt-1">{alloc.taskDescription}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            overallStatus === 'QA COMPLETED' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                            overallStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            overallStatus === 'QA REVIEW' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            overallStatus === 'DELAYED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {overallStatus}
                          </span>

                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">
                            {alloc.skill}
                          </span>
                          <span className="text-slate-300 px-2 py-1 bg-slate-800 rounded">
                            Assigned to: {alloc.assignedMembers.map(m => `${m.firstName || ''} ${m.lastName || ''}`.trim()).join(', ')}

                          </span>
                          <span className="text-slate-400 px-2 py-1 bg-slate-800 rounded">
                            {new Date(alloc.startDate).toLocaleDateString()} → {new Date(alloc.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}



          {/* 6. Status History */}
          {target.history?.length > 0 && (
            <div>
              <h4 className="text-slate-300 text-sm font-semibold mb-3">Status History</h4>
              <div className="relative pl-4 border-l-2 border-slate-700 space-y-3">
                {target.history.map(h => (
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

                {/* Sub-Modal for Task Details (No QA Completed Button!) */}
          {selectedTaskView && (
            <Modal 
              title={selectedTaskView.brm?.brmNumber || 'Task Details'} 
              onClose={() => { setSelectedTaskView(null); setTaskModalTab('overview'); }} 
              wide
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedTaskView.taskTitle}</h2>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex space-x-1 border-b border-slate-700/50 overflow-x-auto">
                  <button 
                    onClick={() => setTaskModalTab('overview')}
                    className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${taskModalTab === 'overview' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setTaskModalTab('status')}
                    className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${taskModalTab === 'status' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                  >
                    Task Status
                  </button>
                  <button 
                    onClick={() => { setTaskModalTab('qa_evidence'); handleFetchScenarios(selectedTaskView.id); }}
                    className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${taskModalTab === 'qa_evidence' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                  >
                    QA Evidence
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {taskModalTab === 'overview' && (
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Description</p>
                      <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                        {selectedTaskView.taskDescription || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                        <p className="text-slate-500 text-xs mb-1">Start Date</p>
                        <p className="text-white font-semibold text-sm">
                          {selectedTaskView.startDate ? new Date(selectedTaskView.startDate).toISOString().split('T')[0] : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl">
                        <p className="text-slate-500 text-xs mb-1">Due Date</p>
                        <p className="text-white font-semibold text-sm">
                          {selectedTaskView.endDate ? new Date(selectedTaskView.endDate).toISOString().split('T')[0] : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700/50 space-y-4">
                      <h3 className="text-slate-400 font-semibold uppercase tracking-wider text-sm">Assigned Developers</h3>
                      <div className="space-y-3">
                        {selectedTaskView.assignedMembers?.map((m, idx) => (
                          <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center text-emerald-400 font-bold">
                                {m.firstName?.[0]}{m.lastName?.[0] || ''}
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{m.firstName} {m.lastName}</p>
                                <p className="text-slate-400 text-xs mt-0.5">Assigned Skill • {m.skill}</p> 
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-900/30 border border-emerald-800 rounded-full text-emerald-400 text-xs">
                              Developer
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TASK STATUS */}
                {taskModalTab === 'status' && (
                  <div className="space-y-4">
                    {selectedTaskView.assignedMembers?.map((m, idx) => {
                      const latestProgress = m.progressLogs?.[0]?.progressPct || 0;
                      const latestRemark = m.progressLogs?.[0]?.remarks || 'No progress logged yet.';
                      return (
                        <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
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

                          {m.milestones?.length > 0 && (
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
                                      {ms.dueDate && <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(ms.dueDate).toLocaleDateString()}</p>}
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

                {/* TAB 3: QA EVIDENCE */}
                {taskModalTab === 'qa_evidence' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                      <h3 className="text-white font-semibold">QA Verification</h3>
                      <p className="text-slate-400 text-xs mt-1">Review the scenarios and evidence uploaded by the QA team.</p>
                    </div>

                    {loadingScenarios ? (
                      <div className="text-center py-8 text-slate-400 text-sm animate-pulse">Loading test scenarios...</div>
                    ) : qaScenarios.length === 0 ? (
                      <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500 text-sm">
                        No test scenarios or evidence logged yet for this task.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {qaScenarios.map((sc, index) => (
                          <div key={sc.id} className="bg-slate-900/70 p-4 rounded-xl border border-slate-700 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center border border-slate-700">
                                  #{index + 1}
                                </span>
                                <div>
                                  <p className="text-white font-medium text-sm">{sc.scenarioTitle}</p>
                                  {sc.expectedResult && <p className="text-slate-400 text-xs mt-1"><span className="text-slate-500 font-semibold">Expected:</span> {sc.expectedResult}</p>}
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                sc.status === 'PASSED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                sc.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              }`}>
                                {sc.status}
                              </span>
                            </div>
                            {sc.actualResult && (
                              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300">
                                <span className="text-slate-500 font-semibold block mb-0.5">Actual Result:</span>
                                {sc.actualResult}
                              </div>
                            )}
                            {sc.evidenceDocs?.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 items-center">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evidence:</span>
                                {sc.evidenceDocs.map(doc => (
                                  <a 
                                    key={doc.id}
                                    href={`${import.meta.env.VITE_API_URL.replace('/api','')}${doc.fileUrl}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs font-medium transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    View Attachment
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Modal>
          )}

    </Modal>
  );
}
