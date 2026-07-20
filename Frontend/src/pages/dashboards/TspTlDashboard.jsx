import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import api from '../../api/axios.js';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';
import { submitArchitecture, addTechnologyRequirement, finalizeTechnologyRequirements, getBrm, allocateTask, getBrmAllocations, completeAllocation } from '../../api/brm.api.js';
import { getTspMembersBySkill } from '../../api/tspProfile.api.js';
import Modal from '../../components/Modal.jsx';
import { TECH_SKILLS } from '../../constants/skills.js';
import TaskManagementLayout from '../../components/taskManagement/TaskManagementLayout.jsx';







export default function TspTlDashboard() {
  const [brms, setBrms] = useState([]);
  const [allBrms, setAllBrms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadTarget, setUploadTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [techBrms, setTechBrms] = useState([]);
  const [resourceTarget, setResourceTarget] = useState(null);
  const [requirement, setRequirement] = useState({ technologyName: '', resourceCount: 1, allocationType: 'FULL_TIME' });
    // Task Allocation state
  const [allocBrms, setAllocBrms] = useState([]);
  const [allocTarget, setAllocTarget] = useState(null);      // BRM whose tasks we're allocating
  const [allocations, setAllocations] = useState([]);        // existing allocations for this BRM
  const [selectedSkill, setSelectedSkill] = useState('');    // skill chosen from dropdown
  const [matchedMembers, setMatchedMembers] = useState([]);  // TMs returned by API
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [allocForm, setAllocForm] = useState({
    assignments: [],
    taskTitle: '',
    taskDescription: '',
    startDate: '',
    endDate: ''
  });
  const [allocSubmitting, setAllocSubmitting] = useState(false);
  const [allocToast, setAllocToast] = useState(null);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);


  const fetchTechBrms = useCallback(async () => {
    try {
      const res = await api.get('/brms', { params: { status: 'READY_FOR_DEVELOPMENT', limit: 100 } });
      setTechBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load tech BRMs', err);
    }
  }, []);

    // Fetch BRMs in READY_FOR_TASK_ALLOCATION phase
  const fetchAllocBrms = useCallback(async () => {
    try {
      const res = await api.get('/brms', { params: { status: 'READY_FOR_TASK_ALLOCATION,CODING_IN_PROGRESS', limit: 100 } });
      setAllocBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load allocation BRMs', err);
    }
  }, []);

  


  // Fetch only BRMs ready for architecture review
  const fetchAssignedBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/brms', { params: { status: 'ARCHITECTURE_CREATION,ARCHITECTURE_SUBMITTED', limit: 100 } });
      setBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load assigned BRMs', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Fetch all assigned BRMs for the overview
  const fetchAllBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingAll(true);
    try {
      const res = await api.get('/brms', { params: { limit: 100 } });
      setAllBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load all BRMs', err);
    } finally {
      if (showSpinner) setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedBrms(true);
    fetchAllBrms(true);
    fetchTechBrms();
    fetchAllocBrms();

    
    const interval = setInterval(() => {
      fetchAssignedBrms(false);
      fetchAllBrms(false);
      fetchTechBrms();
      fetchAllocBrms();

    }, 10000);
    
    const onFocus = () => {
      fetchAssignedBrms(false);
      fetchAllBrms(false);
      fetchTechBrms();
      fetchAllocBrms();

    };
    window.addEventListener('focus', onFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAssignedBrms, fetchAllBrms, fetchTechBrms]);

    const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert('Please select a file to upload');

    setSubmitting(true);
    const formData = new FormData();
    formData.append('document', selectedFile);

    try {
      await submitArchitecture(uploadTarget.id, formData);
      alert('Architecture submitted successfully!');
      setUploadTarget(null);
      setSelectedFile(null);
      fetchAssignedBrms(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload architecture');
    } finally {
      setSubmitting(false);
    }
  };


  // Open the modal and fetch the latest details (including saved requirements)
  const handleOpenResourceModal = async (brm) => {
    try {
      const res = await getBrm(brm.id);
      setResourceTarget(res.data.data);
      setRequirement({ technologyName: '', resourceCount: 1, allocationType: 'FULL_TIME' });
    } catch(err) {
      alert("Failed to load BRM details");
    }
  };

  // Add a single requirement via the modal
  const handleAddRequirement = async (e) => {
    e.preventDefault();
    if (!requirement.technologyName.trim()) return alert("Please fill in the technology name.");
    
    setSubmitting(true);
    try {
      await addTechnologyRequirement(resourceTarget.id, requirement);
      // Re-fetch to update the modal with the new requirement instantly
      const res = await getBrm(resourceTarget.id);
      setResourceTarget(res.data.data);
      // Reset form
      setRequirement({ technologyName: '', resourceCount: 1, allocationType: 'FULL_TIME' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add requirement');
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize the whole phase via the Table Action button
  const handleFinalizeRequirements = async (brm) => {
    if (!window.confirm(`Are you sure you want to finalize requirements for ${brm.brmNumber}?`)) return;
    
    try {
      await finalizeTechnologyRequirements(brm.id);
      alert('Requirements finalized successfully!');
      fetchTechBrms(); // Refresh the table
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize requirements. Ensure you have added at least one.');
    }
  };



    // ─── Task Allocation Handlers ─────────────────────────────────────────────

  const showAllocToast = (msg, type = 'success') => {
    setAllocToast({ msg, type });
    setTimeout(() => setAllocToast(null), 4000);
  };

    const openAllocModal = async (brm) => {
    setAllocTarget(null); // clear first to show loading state
    setAllocations([]);
    setMatchedMembers([]);
    setSelectedSkill('');
    setAllocForm({ assignments:[], taskTitle: '', taskDescription: '', startDate: '', endDate: '' });
    try {
      // Fetch full BRM (includes technologyRequirements) + existing allocations in parallel
      
    const [brmRes, allocRes] = await Promise.all([
        getBrm(brm.id),
        getBrmAllocations(brm.id)
      ]);
      setAllocTarget(brmRes.data.data);   // ← now has technologyRequirements attached
      setAllocations(allocRes.data.data);
    } catch (err) {
      console.error('Failed to load allocation data', err);
    }
  };


  const handleFindMembers = async () => {
    if (!selectedSkill) return;
    setSearchingMembers(true);
    setMatchedMembers([]);
    try {
      const res = await getTspMembersBySkill(selectedSkill);
      setMatchedMembers(res.data.data);
      setAllocForm(f => ({ ...f, skill: selectedSkill, tspMemberId: '' }));
    } catch (err) {
      showAllocToast('Failed to fetch members for this skill', 'error');
    } finally {
      setSearchingMembers(false);
    }
  };

    
    const toggleMemberSelection = (memberId, memberSkill, memberName) => {
    setAllocForm(prev => {
      const current = prev.assignments || [];
      const exists = current.some(a => a.tspMemberId === memberId);
      if (exists) {
        return { ...prev, assignments: current.filter(a => a.tspMemberId !== memberId) };
      } else {
        return { ...prev, assignments: [...current, { tspMemberId: memberId, skill: memberSkill, name: memberName }] };
      }
    });
  };



  const handleAllocSubmit = async (e) => {
     e.preventDefault();
    if (!allocForm.taskTitle || !allocForm.startDate || !allocForm.endDate || !allocForm.assignments || allocForm.assignments.length === 0) {
      setAllocToast({ type: 'error', msg: "Please fill all required fields and select at least one member" });
      return;
    }
    setAllocSubmitting(true);
    try {
      await allocateTask(allocTarget.id, allocForm);
      showAllocToast('Task allocated successfully!');
       setAllocTarget(null); // Close modal
      fetchAllocBrms();
      
      // trigger to tell the layout to refresh:
      setTaskRefreshTrigger(prev => prev + 1);
      // Refresh allocations list in modal
      const res = await getBrmAllocations(allocTarget.id);
      setAllocations(res.data.data);
      // Reset form but keep skill context
      setAllocForm({ assignments:[], taskTitle: '', taskDescription: '', startDate: '', endDate: '' });
      setMatchedMembers([]);
      setSelectedSkill('');
    } catch (err) {
      showAllocToast(err.response?.data?.message || 'Failed to allocate task', 'error');
    } finally {
      setAllocSubmitting(false);
    }
  };

  const handleCompleteAllocation = async (allocationId) => {
    if (!window.confirm('Mark this task as completed?')) return;
    try {
      await completeAllocation(allocTarget.id, allocationId);
      showAllocToast('Marked as completed!');
      const res = await getBrmAllocations(allocTarget.id);
      setAllocations(res.data.data);
      fetchAllocBrms();
    } catch (err) {
      showAllocToast('Failed to complete allocation', 'error');
    }
  };





  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar title="TSP-TL Dashboard"/>

      <main className="max-w-7xl mx-auto px-6 py-8">
        

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mb-8 border-b border-slate-700/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'overview' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"></span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === 'assignments' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            My Architecture Assignments
            {brms.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'assignments' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {brms.length}
              </span>
            )}
            {activeTab === 'assignments' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full shadow-[0_-2px_8px_rgba(168,85,247,0.5)]"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === 'resources' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Resource Allocation
            {techBrms.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'resources' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {techBrms.length}
              </span>
            )}
            {activeTab === 'resources' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full shadow-[0_-2px_8px_rgba(249,115,22,0.5)]"></span>
            )}
          </button>


                    <button
            onClick={() => setActiveTab('allocation')}
            className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === 'allocation' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Task Management
            {allocBrms.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'allocation' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {allocBrms.length}
              </span>
            )}
            {activeTab === 'allocation' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 rounded-t-full shadow-[0_-2px_8px_rgba(34,197,94,0.5)]"></span>
            )}
          </button>


        </div>

                {/* Content Area */}
        {activeTab === 'overview' && (
          loadingAll ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : (
            <BrmDashboardView brms={allBrms} />
          )
        )}
        
        {activeTab === 'assignments' && (

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
              </div>
            ) : brms.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-slate-400">No architecture assignments pending right now.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/40">
                      {['BRM Number', 'Title', 'Team / Category', 'Priority', 'Assigned On', 'Actions'].map(h => (
                        <th key={h} className="text-left text-slate-400 font-medium px-6 py-4 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {brms.map((brm) => (
                      <tr key={brm.id} className="hover:bg-slate-700/20 group transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-purple-400 font-mono text-xs font-semibold">{brm.brmNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium max-w-[250px] truncate">{brm.title}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 text-xs">{brm.TeamName}</p>
                          <p className="text-slate-500 text-xs">{brm.Category}</p>
                        </td>
                        <td className="px-6 py-4">
                          <PriorityBadge priority={brm.priority} />
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(brm.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setUploadTarget(brm)}
                            className={`px-4 py-1.5 rounded-lg text-white text-xs font-medium transition-all shadow-lg ${
                            brm.currentStatus === 'ARCHITECTURE_CREATION' 
                            ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' 
                            : 'bg-slate-700 hover:bg-slate-600 shadow-slate-900/20 border border-slate-600'
                            }`}>
                            {brm.currentStatus === 'ARCHITECTURE_CREATION' ? 'Submit Architecture' : 'Upload New Version'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


                {/* --- RESOURCE ALLOCATION TAB --- */}
        {activeTab === 'resources' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            {techBrms.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-400">No BRMs waiting for resource allocation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/40">
                      {['BRM Number', 'Title', 'Team', 'Priority', 'Actions'].map(h => (
                        <th key={h} className="text-left text-slate-400 font-medium px-6 py-4 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {techBrms.map((brm) => (
                      <tr key={brm.id} className="hover:bg-slate-700/20">
                        <td className="px-6 py-4"><span className="text-purple-400 font-mono text-xs font-semibold">{brm.brmNumber}</span></td>
                        <td className="px-6 py-4 text-white font-medium">{brm.title}</td>
                        <td className="px-6 py-4 text-slate-300">{brm.TeamName}</td>
                        <td className="px-6 py-4"><PriorityBadge priority={brm.priority} /></td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          <button onClick={() => handleOpenResourceModal(brm)}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs font-medium transition-colors">
                            Add Requirements
                          </button>
                          <button onClick={() => handleFinalizeRequirements(brm)}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium shadow-lg shadow-orange-500/20 transition-colors">
                            Submit All
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


                {/* ─── TASK ALLOCATION TAB ─────────────────────────────────── */}
        {activeTab === 'allocation' && (
          <TaskManagementLayout 
            brmsNeedingAllocation={allBrms.filter(b => b.currentStatus === 'READY_FOR_TASK_ALLOCATION' || b.currentStatus === 'CODING_IN_PROGRESS')}
            onSelectBrmToAllocate={(brm) => openAllocModal(brm)}
             refreshTrigger={taskRefreshTrigger} 
          />
        )}

        {/* ─── TASK ALLOCATION MODAL ───────────────────────────────── */}
        {allocTarget && (
          <Modal title={`Task Allocation: ${allocTarget.brmNumber}`} onClose={() => setAllocTarget(null)} wide>
            <div className="space-y-6">

              {/* Toast inside modal */}
              {allocToast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
                  allocToast.type === 'error'
                    ? 'bg-red-500/15 border-red-500/30 text-red-300'
                    : 'bg-green-500/15 border-green-500/30 text-green-300'
                }`}>
                  {allocToast.type === 'error' ? '✕' : '✓'} {allocToast.msg}
                </div>
              )}

              {/* BRM Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900 rounded-xl border border-slate-700">
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">BRM</p>
                  <p className="text-green-400 font-mono text-sm font-bold">{allocTarget.brmNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Title</p>
                  <p className="text-white text-sm truncate">{allocTarget.title}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Team</p>
                  <p className="text-slate-300 text-sm">{allocTarget.TeamName}</p>
                </div>
              </div>

                            {/* User Stories (pre-fetched on the BRM object) */}
              {allocTarget.userStory && allocTarget.userStory.length > 0 && (
                <div className="mb-6">
                  <p className="text-slate-300 text-sm font-semibold mb-3">User Stories</p>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {allocTarget.userStory.map((story) => (
                      <div key={story.id} className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-blue-400 font-mono text-xs font-bold mr-2">{story.storyNumber}</span>
                            <span className="text-white text-sm font-medium">{story.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {story.priority && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                story.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                                story.priority === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-emerald-500/20 text-emerald-400'
                              }`}>{story.priority}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{story.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Technology Requirements (pre-fetched on the BRM object) */}
              {allocTarget.technologyRequirements && allocTarget.technologyRequirements.length > 0 && (
                <div>
                  <p className="text-slate-300 text-sm font-semibold mb-2">Technology Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    {allocTarget.technologyRequirements.map((req, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSkill(req.technologyName)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selectedSkill === req.technologyName
                            ? 'bg-green-500/20 border-green-500/40 text-green-300'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {req.technologyName} · {req.resourceCount} {req.allocationType === 'FULL_TIME' ? 'FT' : 'Shared'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

                            {/* Task Creation & Member Assignment Flow */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-6">
                
                {/* 1. Task Details */}
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm font-semibold border-b border-slate-700 pb-2">1. Task Details</p>
                  <input
                    type="text"
                    placeholder="Task Title *"
                    value={allocForm.taskTitle}
                    onChange={e => setAllocForm(f => ({ ...f, taskTitle: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                  <textarea
                    placeholder="Task Description (optional)"
                    value={allocForm.taskDescription}
                    onChange={e => setAllocForm(f => ({ ...f, taskDescription: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={allocForm.startDate}
                        onChange={e => setAllocForm(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">End Date *</label>
                      <input
                        type="date"
                        value={allocForm.endDate}
                        onChange={e => setAllocForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Assign Members */}
                <div className="space-y-3 pt-2">
                  <p className="text-slate-300 text-sm font-semibold border-b border-slate-700 pb-2">2. Assign Members</p>
                  
                                    <div className="flex gap-3">
                    <select
                      value={selectedSkill}
                      onChange={e => setSelectedSkill(e.target.value)} // REMOVED the state reset here so you can keep members across skills!
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="">-- Select a skill --</option>
                      {TECH_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                      onClick={handleFindMembers}
                      disabled={!selectedSkill || searchingMembers}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors border border-slate-600"
                    >
                      {searchingMembers ? 'Searching...' : 'Find Members'}
                    </button>
                  </div>

                  {/* Member Dropdown Results */}
                  {matchedMembers.length > 0 && (
                    <div className="space-y-3 mt-3">
                      <p className="text-slate-400 text-xs">{matchedMembers.length} member(s) found with skill: <span className="text-green-400 font-semibold">{selectedSkill}</span></p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {matchedMembers.map(m => {
                          const isSelected = allocForm.assignments.some(a => a.tspMemberId === m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => toggleMemberSelection(m.id, selectedSkill,m.name)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-green-500/15 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {/* Checkbox visual indicator */}
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-slate-500'
                                  }`}>
                                    {isSelected && <span className="text-[10px]">✓</span>}
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-semibold">{m.name}</p>
                                    <p className="text-slate-400 text-xs">{m.email}{m.mobileNumber ? ` · ${m.mobileNumber}` : ''}</p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  m.activeTaskCount === 0 ? 'bg-green-500/20 text-green-400' :
                                  m.activeTaskCount <= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {m.activeTaskCount} active task{m.activeTaskCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {m.activeTasks.length > 0 && (
                                <div className="mt-2 space-y-1 ml-7">
                                  {m.activeTasks.map((t, i) => (
                                    <p key={i} className="text-xs text-slate-500">
                                      📌 {t.taskTitle} — <span className="text-slate-400">{t.brmNumber}</span> · due {new Date(t.endDate).toLocaleDateString()}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {matchedMembers.length === 0 && !searchingMembers && selectedSkill && (
                    <p className="text-slate-500 text-xs italic">Click "Find Members" to search for available team members.</p>
                  )}
                </div>

                {/* Selected Members Summary & Final Submit Button */}
                <div className="pt-4 border-t border-slate-700 space-y-4">
                  
                  {allocForm.assignments.length > 0 && (
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide font-semibold">Selected Members ({allocForm.assignments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {allocForm.assignments.map(a => (
                          <span key={a.tspMemberId} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md border border-green-500/30">
                            <span className="text-white font-medium mr-1">{a.name}</span>
                            <span className="opacity-75">({a.skill})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleAllocSubmit} 
                    disabled={allocSubmitting || !allocForm.taskTitle || !allocForm.startDate || !allocForm.endDate || !allocForm.assignments || allocForm.assignments.length === 0}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-green-500/20"
                  >
                    {allocSubmitting ? 'Assigning...' : `✓ Assign Task to ${allocForm.assignments?.length || 0} Member${allocForm.assignments?.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
            </div>



              {/* Existing Allocations */}
              {allocations.length > 0 && (
                <div>
                  <p className="text-slate-300 text-sm font-semibold mb-3">Current Allocations ({allocations.length})</p>
                  <div className="space-y-2">
                    {allocations.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                        <div>
                          <p className="text-white text-sm font-medium">{a.taskTitle}</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {a.tspMember?.user?.firstName} {a.tspMember?.user?.lastName} · <span className="text-green-400">{a.skill}</span> · {new Date(a.startDate).toLocaleDateString()} → {new Date(a.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {a.status}
                          </span>
                          {a.status === 'ACTIVE' && (
                            <button onClick={() => handleCompleteAllocation(a.id)}
                              className="px-2 py-1 text-[10px] rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors">
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </Modal>
        )}




                {/* --- ADD REQUIREMENTS MODAL --- */}
        {resourceTarget && (
          <Modal title={`Resource Allocation: ${resourceTarget.brmNumber}`} onClose={() => setResourceTarget(null)} wide>
            <div className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900 rounded-xl border border-slate-700">
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Title</p>
                  <p className="text-white text-sm font-semibold truncate" title={resourceTarget.title}>{resourceTarget.title}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Team</p>
                  <p className="text-white text-sm">{resourceTarget.TeamName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Category</p>
                  <p className="text-white text-sm">{resourceTarget.Category}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Priority</p>
                  <PriorityBadge priority={resourceTarget.priority} />
                </div>
              </div>

              {/* Already Added Requirements */}
              <div>
                <h4 className="text-slate-300 text-sm font-semibold mb-3 border-b border-slate-700 pb-2">Added Requirements</h4>
                {(!resourceTarget.technologyRequirements || resourceTarget.technologyRequirements.length === 0) ? (
                  <p className="text-slate-500 text-sm italic py-2">No requirements added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {resourceTarget.technologyRequirements.map((req) => (
                      <div key={req.id} className="flex justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <span className="text-white text-sm">{req.technologyName}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded">Count: {req.resourceCount}</span>
                          <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded">{req.allocationType.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Requirement Form */}
              <form onSubmit={handleAddRequirement} className="pt-4 border-t border-slate-700">
                <h4 className="text-brand-400 text-sm font-semibold mb-3">Add New Requirement</h4>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Technology / Skill</label>
                    <select required
                      value={requirement.technologyName}
                      onChange={(e) => setRequirement({...requirement, technologyName: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    >
                      <option value="">-- Select a skill --</option>
                      {TECH_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Count</label>
                    <input type="number" required min="1"
                      value={requirement.resourceCount}
                      onChange={(e) => setRequirement({...requirement, resourceCount: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                    <select
                      value={requirement.allocationType}
                      onChange={(e) => setRequirement({...requirement, allocationType: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="SHARED">Shared</option>
                    </select>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium h-[38px]">
                    {submitting ? '...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}





      </main>
            {/* ─── UPLOAD MODAL ─────────────────────────────────────── */}
      {uploadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg">Submit Architecture for {uploadTarget.brmNumber}</h3>
              <button onClick={() => setUploadTarget(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUploadSubmit} className="space-y-5">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <p className="text-white text-sm font-medium mb-1">{uploadTarget.title}</p>
                  <p className="text-slate-400 text-xs">A new version number will be assigned automatically.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Upload Document (PDF or Image) <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,image/*"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer file:transition-colors bg-slate-900/60 border border-slate-600/50 rounded-lg"
                  />
                  {selectedFile && <p className="mt-2 text-xs text-brand-400">Selected: {selectedFile.name}</p>}
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setUploadTarget(null); setSelectedFile(null); }}
                    className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !selectedFile}
                    className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                    {submitting ? 'Uploading...' : 'Submit Architecture'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
