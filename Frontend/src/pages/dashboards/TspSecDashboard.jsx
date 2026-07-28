import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';
import BrmDetailModal from '../../components/BrmDetailModal.jsx';
import api from '../../api/axios.js';

export default function TspSecDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allBrms, setAllBrms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrm, setSelectedBrm] = useState(null);

  // Modal states for Findings and File Upload
  const [findingModal, setFindingModal] = useState({ isOpen: false, brmId: null });
  const [findingForm, setFindingForm] = useState({ title: '', description: '', severity: 'HIGH' });
  const [uploadModal, setUploadModal] = useState({ isOpen: false, brmId: null });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchBrms = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/brms', { params: { limit: 100 } });
      setAllBrms(res.data.data.brms || []);
    } catch (err) {
      console.error("Failed to fetch BRMs for Security Dashboard:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrms(true);
    const interval = setInterval(() => fetchBrms(false), 60000); // 60000 (1 min)
    return () => clearInterval(interval);
  }, [fetchBrms]);

  const assignedBrms = allBrms.filter(b => b.currentStatus === 'SECURITY');

  const handleAddFinding = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/brms/${findingModal.brmId}/security-findings`, findingForm);
      alert("Security finding added successfully!");
      setFindingModal({ isOpen: false, brmId: null });
      setFindingForm({ title: '', description: '', severity: 'HIGH' });
      fetchBrms();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add finding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload.");
    const formData = new FormData();
    formData.append('document', file);

    setSubmitting(true);
    try {
      await api.post(`/brms/${uploadModal.brmId}/security-report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Findings report uploaded successfully!");
      setUploadModal({ isOpen: false, brmId: null });
      setFile(null);
      fetchBrms();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload file");
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Navbar title="TSP SECURITY DASHBOARD" />

      {/* ── NAVIGATION TABS ── */}
      <div className="max-w-7xl mx-auto px-6 pt-6 w-full">
        <div className="flex gap-2 border-b border-slate-700/80 pb-3">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'my_assignments', label: 'My Assignments', icon: '🛡️', count: assignedBrms.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                activeTab === tab.key 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full">
        {activeTab === 'overview' && (
          loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div></div>
          ) : <BrmDashboardView brms={allBrms} />
        )}

        {activeTab === 'my_assignments' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div></div>
            ) : assignedBrms.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl">
                <div className="text-5xl mb-3">🛡️</div>
                <p className="text-slate-300 font-medium text-base">No Security Scans Assigned Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignedBrms.map(brm => {
                  const uniqueTasks = Array.from(new Set(brm.taskAllocations?.map(a => a.taskTitle) || []));
                  const findings = brm.securityFindings || [];
                  const reportScan = brm.securityScans?.find(s => s.reportUrl);

                  return (
                    <div key={brm.id} className="bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 p-6 rounded-2xl transition-all shadow-xl flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-indigo-400 font-mono text-xs font-bold bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                            {brm.brmNumber}
                          </span>
                          <span className="text-amber-400 text-xs font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Under Security Scan
                          </span>
                        </div>

                        <h3 className="text-white font-bold text-lg leading-snug">{brm.title}</h3>
                        {brm.TeamName && <p className="text-slate-400 text-xs mt-1">Team: <strong className="text-slate-300">{brm.TeamName}</strong></p>}

                        {/* DISPLAY UPLOADED REPORT */}
                        {reportScan && (
                          <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs">
                            <span className="text-indigo-300 font-medium truncate">📄 {reportScan.reportName}</span>
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">Uploaded</span>
                          </div>
                        )}

                        {/* DISPLAY MANUAL FINDINGS */}
                        {findings.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logged Findings ({findings.length})</p>
                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                              {findings.map(f => (
                                <div key={f.id} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 flex flex-col gap-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-semibold">{f.title}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(f.severity)}`}>
                                      {f.severity}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 text-[11px] leading-relaxed">{f.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="pt-4 border-t border-slate-700 flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setUploadModal({ isOpen: true, brmId: brm.id })}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all border border-slate-600"
                          >
                            📤 Upload File
                          </button>
                          <button
                            onClick={() => setFindingModal({ isOpen: true, brmId: brm.id })}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-all border border-red-500/30"
                          >
                            + Add Finding
                          </button>
                        </div>

                        <button
                          onClick={() => setSelectedBrm(brm)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADD FINDING MODAL ── */}
      {findingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-red-400">⚠️</span> Add Security Finding
            </h3>
            <form onSubmit={handleAddFinding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Finding Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SQL Injection in Login API"
                  value={findingForm.title}
                  onChange={e => setFindingForm({ ...findingForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Severity</label>
                <select
                  value={findingForm.severity}
                  onChange={e => setFindingForm({ ...findingForm, severity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed description of vulnerability..."
                  value={findingForm.description}
                  onChange={e => setFindingForm({ ...findingForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFindingModal({ isOpen: false, brmId: null })}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Save Finding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD REPORT MODAL ── */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">📤 Upload Findings Report</h3>
            <form onSubmit={handleUploadReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Select PDF or Report File</label>
                <input
                  type="file"
                  required
                  onChange={e => setFile(e.target.files[0])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setUploadModal({ isOpen: false, brmId: null }); setFile(null); }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                >
                  {submitting ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBrm && <BrmDetailModal target={selectedBrm} onClose={() => setSelectedBrm(null)} />}
    </div>
  );
}
