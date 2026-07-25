import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';
import api from '../../api/axios.js';
import { getMyQaTasks, getQaScenarios, addQaTestScenario, uploadQaEvidence } from '../../api/tspQa.api.js';

export default function TspQaDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allBrms, setAllBrms] = useState([]);
  const [loadingBrms, setLoadingBrms] = useState(true);
  const [qaTasks, setQaTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  // Selected Task State
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Scenarios State
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ scenarioNo: '', title: '', description: '', expectedResult: '' });
  
  // Upload State
  const [uploadingId, setUploadingId] = useState(null);

  const fetchBrms = useCallback(async () => {
    setLoadingBrms(true);
    try {
      const res = await api.get('/brms', { params: { limit: 100 } });
      setAllBrms(res.data.data.brms || []);
    } catch (err) { console.error(err); }
    finally { setLoadingBrms(false); }
  }, []);

  const fetchQaTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await getMyQaTasks();
      setQaTasks(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTasks(false); }
  }, []);

  // Fetch scenarios whenever a task is selected
  const fetchScenarios = useCallback(async (taskId) => {
    setLoadingScenarios(true);
    try {
      const res = await getQaScenarios(taskId);
      setScenarios(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingScenarios(false); }
  }, []);

  useEffect(() => {
    fetchBrms();
    fetchQaTasks();
    const interval = setInterval(() => { fetchBrms(); fetchQaTasks(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchScenarios(selectedTask.id);
      setShowScenarioForm(false);
    } else {
      setScenarios([]);
    }
  }, [selectedTask, fetchScenarios]);

  const handleAddScenario = async (e) => {
    e.preventDefault();
    try {
      await addQaTestScenario(selectedTask.id, scenarioForm);
      setScenarioForm({ scenarioNo: '', title: '', description: '', expectedResult: '' });
      setShowScenarioForm(false);
      fetchScenarios(selectedTask.id);
    } catch (err) { alert(err.response?.data?.message || "Failed to add scenario"); }
  };

  const handleEvidenceUpload = async (e, scenarioId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    setUploadingId(scenarioId);
    try {
      await uploadQaEvidence(scenarioId, formData);
      fetchScenarios(selectedTask.id);
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const groupedQaTasks = (() => {
    const groups = {};
    qaTasks.forEach(task => {
      const key = `${task.brm?.id}_${task.taskTitle}`;
      if (!groups[key]) {
        groups[key] = {
          ...task,
          allocations: [task]
        };
      } else {
        groups[key].allocations.push(task);
      }
    });
    return Object.values(groups);
  })();

  const tabs = [
    { key: 'overview', label: ' Overview', count: allBrms.length },
    { key: 'tasks', label: ' My QA Tasks', count: groupedQaTasks.length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar title = "TSP QA Dashboard" />

      

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mb-8 border-b border-slate-700/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === tab.key ? 'text-violet-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-300'
                }`}>{tab.count}</span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 rounded-t-full shadow-[0_-2px_8px_rgba(139,92,246,0.5)]"></span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          loadingBrms ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500"></div>
            </div>
          ) : (
            <BrmDashboardView brms={allBrms} />
          )
        )}

        {/* ── MY QA TASKS TAB ── */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT — Task List */}
            <div className="space-y-4">
              <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">
                QA Tasks Assigned ({groupedQaTasks.length})
              </h2>
              {loadingTasks ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-violet-500"></div>
                </div>
              ) : groupedQaTasks.length === 0 ? (
                <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="text-5xl mb-4">🧪</div>
                  <p className="text-slate-300 font-medium">No QA tasks assigned yet</p>
                </div>
              ) : (
                groupedQaTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedTask?.id === task.id
                        ? 'bg-violet-900/20 border-violet-500/50'
                        : 'bg-slate-800 border-slate-700 hover:border-violet-500/30 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-white font-semibold truncate">{task.taskTitle}</p>
                        <p className="text-violet-400 font-mono text-xs mt-0.5">
                          {task.brm?.brmNumber}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-full text-[10px] font-bold whitespace-nowrap">
                        QA TESTING
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 text-xs mt-3">
                      {task.allocations.map(alloc => (
                        <div key={alloc.id} className="flex flex-wrap gap-2 items-center">
                          <span className="text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">
                            {alloc.skill}
                          </span>
                          <span className="text-slate-400 px-2 py-1 bg-slate-700/50 rounded">
                            Dev: {alloc.tspMember?.user?.firstName} {alloc.tspMember?.user?.lastName || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT — Task Detail & Scenarios Panel */}
            <div className="sticky top-6">
              {selectedTask ? (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6">
                  
                  {/* Task Header */}
                  <div>
                    <h3 className="text-white font-bold text-lg">{selectedTask.taskTitle}</h3>
                    <p className="text-slate-400 text-sm mt-2">{selectedTask.taskDescription}</p>
                  </div>

                  <hr className="border-slate-700/50" />

                  {/* Scenarios Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-violet-400 font-semibold">Test Scenarios</h4>
                      <button 
                        onClick={() => setShowScenarioForm(!showScenarioForm)}
                        className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        {showScenarioForm ? 'Cancel' : '+ Add Scenario'}
                      </button>
                    </div>

                    {/* Add Scenario Form */}
                    {showScenarioForm && (
                      <form onSubmit={handleAddScenario} className="bg-slate-900/50 p-4 rounded-xl border border-violet-500/30 mb-6 space-y-3">
                        <div className="flex gap-3">
                          <input required type="text" placeholder="Scenario No (e.g. TC-01)" className="w-1/3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                            value={scenarioForm.scenarioNo} onChange={e => setScenarioForm({...scenarioForm, scenarioNo: e.target.value})} />
                          <input required type="text" placeholder="Scenario Title" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                            value={scenarioForm.title} onChange={e => setScenarioForm({...scenarioForm, title: e.target.value})} />
                        </div>
                        <textarea required placeholder="Test Steps / Description" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 h-20 resize-none"
                          value={scenarioForm.description} onChange={e => setScenarioForm({...scenarioForm, description: e.target.value})} />
                        <textarea required placeholder="Expected Result" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 h-16 resize-none"
                          value={scenarioForm.expectedResult} onChange={e => setScenarioForm({...scenarioForm, expectedResult: e.target.value})} />
                        <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                          Save Test Scenario
                        </button>
                      </form>
                    )}

                    {/* Scenario List */}
                    {loadingScenarios ? (
                       <p className="text-slate-400 text-sm text-center py-4">Loading scenarios...</p>
                    ) : scenarios.length === 0 && !showScenarioForm ? (
                       <div className="text-center py-8 bg-slate-900/30 border border-slate-700/50 rounded-xl">
                         <p className="text-slate-400 text-sm">No test scenarios logged yet.</p>
                       </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {scenarios.map(scen => (
                          <div key={scen.id} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-violet-400 font-mono text-xs font-bold mr-2">{scen.scenarioNo}</span>
                                <span className="text-white font-medium">{scen.title}</span>
                              </div>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">{scen.status.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-2 whitespace-pre-wrap">{scen.description}</p>
                            
                            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                              <span className="text-green-400 font-semibold block mb-0.5">Expected Result:</span>
                              <span className="text-slate-300">{scen.expectedResult}</span>
                            </div>

                            {/* Evidences List */}
                            {scen.qaEvidences?.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {scen.qaEvidences.map(ev => (
                                  <a key={ev.id} href={`http://localhost:3000${ev.fileUrl}`} target="_blank" rel="noreferrer"
                                     className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors group">
                                    <span className="text-violet-400">{ev.fileType === 'SCREENSHOT' ? '🖼️' : '📄'}</span>
                                    <span className="text-xs text-slate-300 group-hover:text-white truncate max-w-[150px]">{ev.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Upload Button */}
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                              <label className="flex items-center justify-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg border border-dashed border-slate-600 transition-colors w-full">
                                {uploadingId === scen.id ? (
                                  <span className="animate-pulse">Uploading...</span>
                                ) : (
                                  <><span>📎 Upload Evidence (PDF/Image)</span></>
                                )}
                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleEvidenceUpload(e, scen.id)} disabled={uploadingId === scen.id} />
                              </label>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="text-slate-400 font-medium">Select a task</p>
                  <p className="text-slate-600 text-sm mt-1">Click a task to manage its test scenarios</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
