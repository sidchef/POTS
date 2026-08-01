import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import Modal from '../Modal.jsx';

export default function SecurityManagementLayout({ brms = [], onRefresh, onSelectBrmToAllocate }) {
  const [activeSidebarTab, setActiveSidebarTab] = useState('pending_allocation');
  const [selectedBrm, setSelectedBrm] = useState(null);
  const [allocModal, setAllocModal] = useState({ isOpen: false, brm: null });
  const [secMembers, setSecMembers] = useState([]);
  const [selectedSecMember, setSelectedSecMember] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSecMembers();
  }, []);

  const fetchSecMembers = async () => {
    try {
      const res = await api.get('/brms/sec-members');
      setSecMembers(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedSecMember(res.data.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch security members", err);
    }
  };

  // Filter: BRM must have at least 1 task, EVERY task must be QA_COMPLETED, and status is not yet SECURITY
  const pendingBrms = brms.filter(b => 
    b.currentStatus !== 'SECURITY' && b.currentStatus !== 'COMPLETED' &&
    b.taskAllocations && 
    b.taskAllocations.length > 0 && 
    b.taskAllocations.every(alloc => alloc.status === 'QA_COMPLETED')
  );

    const hasSecurityIssues = (brm) => {
    if (!brm.securityScans || brm.securityScans.length === 0) return false;
    const latestScan = [...brm.securityScans].sort((a, b) => b.scanNumber - a.scanNumber)[0];
    return latestScan.status === 'FAILED';
  };

  const hasCompletedScan = (brm) => {
    return brm.securityScans && brm.securityScans.some(s => s.status === 'COMPLETED');
  };

  const underScanBrms = brms.filter(b => b.currentStatus === 'SECURITY' && !hasSecurityIssues(b) && !hasCompletedScan(b));
  
  const failedScanBrms = brms.filter(b => b.currentStatus === 'SECURITY' && hasSecurityIssues(b));

  const successfulScanBrms = brms.filter(b => 
    (b.currentStatus === 'SECURITY' || b.currentStatus === 'COMPLETED') && 
    hasCompletedScan(b)
  );


  const handleOpenAllocModal = (brm) => {
    setAllocModal({ isOpen: true, brm });
    if (secMembers.length > 0 && !selectedSecMember) {
      setSelectedSecMember(secMembers[0].id);
    }
  };

  const handleConfirmAllocation = async (brm) => {
    if (!selectedSecMember) {
      alert("Please select a security member to assign the scan.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/brms/${brm.id}/assign-security`, {
        secMemberId: selectedSecMember
      });
      setAllocModal({ isOpen: false, brm: null });
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to allocate security scan");
    } finally {
      setSubmitting(false);
    }
  };


    const getSeverityBadge = (severity) => {
    const colors = {
      CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
      HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity] || colors.MEDIUM;
  };


  return (
    <div className="flex h-[800px] bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <div className="w-80 bg-slate-900/50 border-r border-slate-700 flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Security Management
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* Tab 1: Pending Allocation */}
          <div>
            <button 
              onClick={() => { setActiveSidebarTab('pending_allocation'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSidebarTab === 'pending_allocation' 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Pending Allocation</span>
              </div>
              <span className="bg-slate-800/80 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 font-bold text-white">
                {pendingBrms.length}
              </span>
            </button>

            {activeSidebarTab === 'pending_allocation' && pendingBrms.length > 0 && (
              <div className="mt-2 ml-4 pl-3 border-l border-indigo-500/30 space-y-1.5">
                {pendingBrms.map(brm => (
                  <div 
                    key={brm.id}
                    onClick={() => setSelectedBrm(brm)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      selectedBrm?.id === brm.id ? 'bg-indigo-600/20 text-white border border-indigo-500/50 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <p className="truncate">{brm.title}</p>
                    <p className="text-[10px] text-indigo-400 font-mono mt-0.5">{brm.brmNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tab 2: Under Scan */}
          <div>
            <button 
              onClick={() => { setActiveSidebarTab('under_scan'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSidebarTab === 'under_scan' 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-lg shadow-yellow-500/10' 
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                <span>Under Scan</span>
              </div>
              <span className="bg-slate-800/80 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 font-bold text-white">
                {underScanBrms.length}
              </span>
            </button>

            {activeSidebarTab === 'under_scan' && underScanBrms.length > 0 && (
              <div className="mt-2 ml-4 pl-3 border-l border-yellow-500/30 space-y-1.5">
                {underScanBrms.map(brm => (
                  <div 
                    key={brm.id}
                    onClick={() => setSelectedBrm(brm)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      selectedBrm?.id === brm.id ? 'bg-yellow-500/20 text-white border border-yellow-500/50 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <p className="truncate">{brm.title}</p>
                    <p className="text-[10px] text-yellow-400 font-mono mt-0.5">{brm.brmNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

                    {/* Tab 3: Failed Scan */}
          <div>
            <button 
              onClick={() => { setActiveSidebarTab('failed_scan'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSidebarTab === 'failed_scan' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/10' 
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>Failed Scan</span>
              </div>
              <span className="bg-slate-800/80 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 font-bold text-white">
                {failedScanBrms.length}
              </span>
            </button>

            {activeSidebarTab === 'failed_scan' && failedScanBrms.length > 0 && (
              <div className="mt-2 ml-4 pl-3 border-l border-red-500/30 space-y-1.5">
                {failedScanBrms.map(brm => (
                  <div 
                    key={brm.id}
                    onClick={() => setSelectedBrm(brm)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      selectedBrm?.id === brm.id ? 'bg-red-500/20 text-white border border-red-500/50 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <p className="truncate">{brm.title}</p>
                    <p className="text-[10px] text-red-400 font-mono mt-0.5">{brm.brmNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tab 4: Successful Scans */}
          <div>
            <button 
              onClick={() => { setActiveSidebarTab('successful_scans'); setSelectedBrm(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSidebarTab === 'successful_scans' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Successful Scans</span>
              </div>
              <span className="bg-slate-800/80 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 font-bold text-white">
                {successfulScanBrms.length}
              </span>
            </button>

            {activeSidebarTab === 'successful_scans' && successfulScanBrms.length > 0 && (
              <div className="mt-2 ml-4 pl-3 border-l border-emerald-500/30 space-y-1.5">
                {successfulScanBrms.map(brm => (
                  <div 
                    key={brm.id}
                    onClick={() => setSelectedBrm(brm)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      selectedBrm?.id === brm.id ? 'bg-emerald-600/20 text-white border border-emerald-500/50 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <p className="truncate">{brm.title}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">{brm.brmNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="flex-1 bg-slate-800/30 p-6 overflow-y-auto">
        
        {/* VIEW 1: PENDING ALLOCATION */}
        {activeSidebarTab === 'pending_allocation' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-slate-700/60 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-white text-xl font-semibold">Pending Security Allocation</h2>
                <p className="text-slate-400 text-sm mt-1">BRMs that have completed QA and are awaiting security scan allocation.</p>
              </div>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                {pendingBrms.length} {pendingBrms.length === 1 ? 'Project' : 'Projects'} Ready
              </span>
            </div>

            {pendingBrms.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-400 font-medium text-sm">No BRMs ready for Security Allocation</p>
                <p className="text-slate-500 text-xs mt-1">BRMs will appear here automatically once all tasks under them are QA Completed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingBrms.map(brm => (
                  <div key={brm.id} className="bg-slate-900/60 border border-slate-700/80 hover:border-indigo-500/50 p-5 rounded-2xl transition-all shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-indigo-400 font-mono text-xs font-bold bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {brm.brmNumber}
                        </span>
                        <span className="text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          QA Completed
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base mt-2 leading-snug">{brm.title}</h3>
                      {brm.TeamName && <p className="text-slate-400 text-xs mt-1">Team: {brm.TeamName}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Tasks: <strong className="text-slate-300">{new Set(brm.taskAllocations?.map(a => a.taskTitle)).size || 0}</strong> completed
                      </span>
                      <button 
                        onClick={() => handleOpenAllocModal(brm)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg font-medium transition-all shadow-md shadow-indigo-500/20"
                      >
                        Allocate Scan →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: UNDER SCAN */}
        {activeSidebarTab === 'under_scan' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-slate-700/60 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-yellow-400 text-xl font-semibold">Under Scan</h2>
                <p className="text-slate-400 text-sm mt-1">Currently active security scans and vulnerability assessments.</p>
              </div>
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                {underScanBrms.length} {underScanBrms.length === 1 ? 'Scan' : 'Scans'} Active
              </span>
            </div>

            {underScanBrms.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-slate-400 font-medium text-sm">No Active Security Scans</p>
                <p className="text-slate-500 text-xs mt-1">BRMs assigned to security scan will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {underScanBrms.map(brm => (
                  <div key={brm.id} className="bg-slate-900/60 border border-yellow-500/30 p-5 rounded-2xl transition-all shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-yellow-400 font-mono text-xs font-bold bg-yellow-500/10 px-2.5 py-1 rounded-md border border-yellow-500/20">
                          {brm.brmNumber}
                        </span>
                        <span className="text-yellow-400 text-[11px] font-semibold bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                          In Progress
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base mt-2 leading-snug">{brm.title}</h3>
                      {brm.TeamName && <p className="text-slate-400 text-xs mt-1">Team: {brm.TeamName}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Tasks Under Scan: <strong className="text-white">{new Set(brm.taskAllocations?.map(a => a.taskTitle)).size || 0}</strong>
                      </span>
                      <span className="text-indigo-400 font-medium">🛡️ Security Lead Assigned</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

                {/* VIEW 3: FAILED SCAN */}
        {activeSidebarTab === 'failed_scan' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
              <div>
                <h2 className="text-red-400 text-xl font-semibold">Failed Security Scans</h2>
                <p className="text-slate-400 text-sm mt-1">Projects with logged vulnerabilities or uploaded security reports.</p>
              </div>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                {failedScanBrms.length} {failedScanBrms.length === 1 ? 'Project' : 'Projects'} Failed
              </span>
            </div>

            {failedScanBrms.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl">
                <p className="text-slate-500 text-sm">No failed scans or vulnerability reports at this time.</p>
              </div>
            ) : (
                            <div className="grid grid-cols-1 gap-6">
                {failedScanBrms.map(brm => {
                  const sortedScans = [...(brm.securityScans || [])].sort((a, b) => a.scanNumber - b.scanNumber);

                  return (
                    <div key={brm.id} className="bg-slate-900/60 border border-red-500/30 p-6 rounded-2xl transition-all shadow-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-red-400 font-mono text-xs font-bold bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
                              {brm.brmNumber}
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-lg">{brm.title}</h3>
                          {brm.TeamName && <p className="text-slate-400 text-xs mt-1">Team: {brm.TeamName}</p>}
                        </div>

                        {/* ASSIGN TASK BUTTON */}
                        <button
                          onClick={() => { if (onSelectBrmToAllocate) onSelectBrmToAllocate(brm); }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold rounded-lg transition-colors border border-red-500/50 flex items-center gap-2"
                        >
                          <span>🔨</span> Assign Remediation Task
                        </button>
                      </div>

                      {/* PER-SCAN SECTIONS */}
                      <div className="space-y-4 pt-2">
                        {sortedScans.map(scan => {
                          const scanFindings = (brm.securityFindings || []).filter(f => f.securityScanId === scan.id);
                          const isLatest = scan.scanNumber === sortedScans.length;

                          return (
                            <div
                              key={scan.id}
                              className={`rounded-xl border p-4 space-y-3 ${
                                isLatest
                                  ? 'border-red-500/40 bg-red-500/5'
                                  : 'border-slate-700/50 bg-slate-800/40'
                              }`}
                            >
                              {/* Scan Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                                    isLatest
                                      ? 'text-red-400 bg-red-500/10 border-red-500/30'
                                      : 'text-slate-400 bg-slate-700/50 border-slate-600'
                                  }`}>
                                    Scan #{scan.scanNumber} {isLatest ? '— Latest' : '— Previous'}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    scan.status === 'FAILED'
                                      ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                      : scan.status === 'COMPLETED'
                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                        : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                  }`}>
                                    {scan.status}
                                  </span>
                                </div>

                                {/* Download Report for this specific scan */}
                                {scan.reportUrl && (
                                  <a
                                    href={`${import.meta.env.VITE_API_URL.replace('/api','')}${scan.reportUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-medium rounded-lg transition-colors border border-brand-500/30 flex items-center gap-1.5"
                                  >
                                    <span>📄</span> Download Report
                                  </a>
                                )}
                              </div>

                              {/* Findings for this scan */}
                              {scanFindings.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Findings ({scanFindings.length})
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {scanFindings.map(f => (
                                      <div key={f.id} className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white font-bold text-sm">{f.title}</span>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(f.severity)}`}>
                                            {f.severity}
                                          </span>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed">{f.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-600 text-xs italic">No findings logged for this scan.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>

            )}
          </div>
        )}

        {/* VIEW 4: SUCCESSFUL SCANS */}
        {activeSidebarTab === 'successful_scans' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-slate-700/60 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-white text-xl font-semibold">Successful Security Scans</h2>
                <p className="text-slate-400 text-sm mt-1">BRMs that have passed all security scans with zero findings.</p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                {successfulScanBrms.length} {successfulScanBrms.length === 1 ? 'Project' : 'Projects'} Passed
              </span>
            </div>

            {successfulScanBrms.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-400 font-medium text-sm">No Successful Scans Yet</p>
                <p className="text-slate-500 text-xs mt-1">BRMs that pass security scans completely will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {successfulScanBrms.map(brm => {
                  return (
                    <div key={brm.id} className="bg-slate-900/60 border border-emerald-500/30 p-6 rounded-2xl shadow-lg flex flex-col space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                              {brm.brmNumber}
                            </span>
                            <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Passed Security
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-lg">{brm.title}</h3>
                          <p className="text-slate-400 text-xs mt-1">Team: <strong className="text-slate-300">{brm.TeamName}</strong></p>
                        </div>
                      </div>

                      {/* SCAN HISTORY SECTION */}
                      {brm.securityScans && brm.securityScans.length > 0 && (
                        <div className="pt-4 border-t border-slate-800 space-y-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">All Security Scans History ({brm.securityScans.length})</h4>
                          <div className="space-y-3">
                            {[...brm.securityScans].sort((a,b) => a.scanNumber - b.scanNumber).map(scan => {
                              const scanFindings = (brm.securityFindings || []).filter(f => f.securityScanId === scan.id || (scan.scanNumber === 1 && !f.securityScanId));
                              return (
                                <div key={scan.id} className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/60 flex flex-col gap-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-200 font-bold text-sm">Scan #{scan.scanNumber}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${scan.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                      {scan.status}
                                    </span>
                                  </div>
                                  
                                                                    {scan.reportUrl && (
                                    <div className="p-2 bg-slate-900/60 rounded border border-slate-700 flex items-center justify-between text-xs transition-colors hover:bg-slate-800/80">
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="text-slate-400">📄</span>
                                        <span className="text-slate-300 truncate">{scan.reportName}</span>
                                      </div>
                                      <a
                                        href={`${import.meta.env.VITE_API_URL.replace('/api','')}${scan.reportUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded transition-colors whitespace-nowrap ml-2 flex items-center gap-1 border border-emerald-500/20"
                                      >
                                        Open Report 
                                      </a>
                                    </div>
                                  )}


                                  {scanFindings.length > 0 && (
                                    <div className="space-y-2 mt-2 border-t border-slate-700/50 pt-2">
                                      <p className="text-[11px] font-semibold text-slate-500 uppercase">Findings ({scanFindings.length})</p>
                                      {scanFindings.map(f => (
                                        <div key={f.id} className="bg-slate-900/40 p-2.5 rounded border border-slate-700 flex justify-between items-start text-xs">
                                          <span className="text-slate-300 font-medium">{f.title}</span>
                                          <span className={`font-bold ${getSeverityBadge(f.severity)} px-2 py-0.5 rounded text-[10px]`}>{f.severity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {scanFindings.length === 0 && (
                                    <div className="mt-1 text-xs text-emerald-400/80 italic border-t border-slate-700/50 pt-2">
                                      ✨ Clean Scan - No findings detected
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


      </div>

      {/* ─── SECURITY ALLOCATION MODAL ───────────────────────────────────── */}
      {allocModal.isOpen && allocModal.brm && (
        <Modal 
          title={`Security Scan Allocation: ${allocModal.brm.brmNumber}`} 
          onClose={() => setAllocModal({ isOpen: false, brm: null })}
        >
          <div className="space-y-6">
            
            {/* BRM Basic Details */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-bold text-lg">{allocModal.brm.title}</h3>
                  <p className="text-slate-400 text-xs mt-1">Team: {allocModal.brm.TeamName || 'N/A'} • Category: {allocModal.brm.Category || 'General'}</p>
                </div>
                <span className="text-indigo-400 font-mono text-xs font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                  {allocModal.brm.brmNumber}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed border-t border-slate-800/80 pt-3">
                {allocModal.brm.description || 'No detailed description provided for this BRM.'}
              </p>
            </div>

            {/* Tasks Assigned to BRM */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Completed Tasks for Security Scan ({new Set(allocModal.brm.taskAllocations?.map(a => a.taskTitle)).size || 0})
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {Array.from(new Set(allocModal.brm.taskAllocations?.map(a => a.taskTitle) || [])).map((taskTitle, idx) => (
                  <div key={idx} className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{taskTitle}</span>
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      ✅ QA Completed
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Select Security Member & Action */}
            <div className="pt-4 border-t border-slate-700 space-y-4">

             {allocModal.brm.securityScans && allocModal.brm.securityScans.length > 0 && (() => {
                const sortedScans = [...allocModal.brm.securityScans].sort((a, b) => b.scanNumber - a.scanNumber);
                const lastScan = sortedScans[0];
                if (lastScan && lastScan.assignedSec) {
                  return (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-xl mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Previous Security Auditor</p>
                        <p className="text-white text-sm font-medium">{lastScan.assignedSec.firstName} {lastScan.assignedSec.lastName}</p>
                      </div>
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full border border-indigo-500/40 font-semibold">
                        Scan #{lastScan.scanNumber}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Assign Security Lead / Auditor
                </label>
                <select
                  value={selectedSecMember}
                  onChange={(e) => setSelectedSecMember(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- Select Security Member --</option>
                  {secMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.activeScansCount} active scans)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAllocModal({ isOpen: false, brm: null })}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || !selectedSecMember}
                  onClick={() => handleConfirmAllocation(allocModal.brm)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  {submitting ? 'Allocating...' : 'Confirm Security Allocation →'}
                </button>
              </div>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
