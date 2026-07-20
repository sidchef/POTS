import React from 'react';
import Modal from './Modal';
import { BrmStatusBadge, PriorityBadge } from './BrmStatusBadge';

export default function BrmDetailModal({ target, onClose }) {
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
            // Group the tasks by title and compute BREACHED status
            const groups = {};
            const now = new Date();
            
            target.taskAllocations.forEach(alloc => {
              let computedStatus = alloc.status;
              if (alloc.status === 'ACTIVE' && alloc.endDate && new Date(alloc.endDate) < now) {
                computedStatus = 'BREACHED';
              }
              const key = alloc.taskTitle;
              if (!groups[key]) {
                groups[key] = {
                  ...alloc,
                  assignedMembers: [{
                    firstName: alloc.tspMember?.user?.firstName,
                    lastName: alloc.tspMember?.user?.lastName,
                    status: computedStatus
                  }]
                };
              } else {
                groups[key].assignedMembers.push({
                  firstName: alloc.tspMember?.user?.firstName,
                  lastName: alloc.tspMember?.user?.lastName,
                  status: computedStatus
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
                    if (alloc.assignedMembers.every(m => m.status === 'COMPLETED')) overallStatus = 'COMPLETED';
                    else if (alloc.assignedMembers.some(m => m.status === 'BREACHED')) overallStatus = 'BREACHED';

                    return (
                      <div key={alloc.taskTitle} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="text-white text-sm font-medium">{alloc.taskTitle}</h5>
                            {alloc.taskDescription && <p className="text-slate-400 text-xs mt-1">{alloc.taskDescription}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            overallStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            overallStatus === 'BREACHED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
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
    </Modal>
  );
}
