import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import api from '../../api/axios.js';
import { getUserStoriesByBrm, createUserStory, deleteUserStory } from '../../api/userStory.api.js';
import { submitUserStories, listBrms } from '../../api/brm.api.js';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';

// ─── Shared UI atoms ─────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(4px)' }}>
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[85vh]">{children}</div>
    </div>
  </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => toast ? (
  <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
    ${toast.type === 'error'
      ? 'bg-red-500/15 border-red-500/30 text-red-300'
      : 'bg-green-500/15 border-green-500/30 text-green-300'}`}>
    <span>{toast.type === 'error' ? '✕' : '✓'}</span>
    {toast.message}
  </div>
) : null;

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TmDashboard() {
  const [brms, setBrms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // User Story Modal state
  const [storyTarget, setStoryTarget] = useState(null); // The BRM we're managing stories for
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStory, setNewStory] = useState({ title: '', description: '', priority: 'Medium' });
  const [addingStory, setAddingStory] = useState(false);
  const [storyCounts, setStoryCounts] = useState({}); // { brmId: count }
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'assignments'
  const [allBrms, setAllBrms] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);



  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch BRMs assigned to me in USER_STORY_CREATION status
  const fetchMyBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/brms', { params: { status: 'USER_STORY_CREATION', limit: 50 } });
      const myBrms = res.data.data.brms.filter(b => b.currentStatus === 'USER_STORY_CREATION');
      setBrms(myBrms);
      if (myBrms.length > 0) {
        const countResults = await Promise.all(
          myBrms.map(b => getUserStoriesByBrm(b.id).then(r => ({ brmId: b.id, count: r.data.data.length })).catch(() => ({ brmId: b.id, count: 0 })))
        );
        const countMap = {};
        countResults.forEach(({ brmId, count }) => { countMap[brmId] = count; });
        setStoryCounts(countMap);
      }
    } catch {
      showToast('Failed to load assigned BRMs', 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const fetchAllBrms = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingAll(true);
    try {
      const res = await listBrms({ limit: 100 });
      setAllBrms(res.data.data.brms);
    } catch {
    } finally {
      if (showSpinner) setLoadingAll(false);
    }
  }, []);

  useEffect(() => { 
    fetchMyBrms(true); 
    fetchAllBrms(true);
    
    const interval = setInterval(() => {
      fetchMyBrms(false);
      fetchAllBrms(false);
    }, 60000);
    
    const onFocus = () => {
      fetchMyBrms(false);
      fetchAllBrms(false);
    };
    window.addEventListener('focus', onFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchMyBrms, fetchAllBrms]);





  // Open User Story Modal and load existing stories
  const openStoryModal = async (brm) => {
    setStoryTarget(brm);
    setLoadingStories(true);
    try {
      const res = await getUserStoriesByBrm(brm.id);
      setStories(res.data.data);
    } catch {
      showToast('Failed to load user stories', 'error');
    } finally {
      setLoadingStories(false);
    }
  };

  // Add new story
  const handleAddStory = async (e) => {
    e.preventDefault();
    if (!newStory.title.trim() || !newStory.description.trim()) {
      return showToast('Title and Description are required', 'error');
    }
    setAddingStory(true);
    try {
      await createUserStory({ ...newStory, brmId: storyTarget.id });
      showToast('User story added!');
      setNewStory({ title: '', description: '', priority: 'Medium' });
      const res = await getUserStoriesByBrm(storyTarget.id);
      setStories(res.data.data);
      // Update story counts to reflect instantly
      setStoryCounts(prev => ({ ...prev, [storyTarget.id]: res.data.data.length }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add story', 'error');
    } finally { setAddingStory(false); }
  };

  // Delete a story
  const handleDeleteStory = async (storyId) => {
    try {
      await deleteUserStory(storyId);
      showToast('Story removed');
      setStories(prev => {
        const updated = prev.filter(s => s.id !== storyId);
        // Update story counts instantly
        setStoryCounts(counts => ({ ...counts, [storyTarget.id]: updated.length }));
        return updated;
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete story', 'error');
    }
  };

  // Submit all stories (finalizes this phase)
  const handleSubmitStories = async () => {
    if (stories.length === 0) return showToast('You need at least one user story before submitting', 'error');
    setSubmitting(true);
    try {
      await submitUserStories(storyTarget.id);
      showToast('User stories submitted! PL has been notified.');
      setStoryTarget(null);
      fetchMyBrms(); // Removes it from Assignments tab
      fetchAllBrms(); // Updates the Overview tab instantly
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit stories', 'error');
    } finally { setSubmitting(false); }
  };

   const handleSubmitStoriesFromRow = async (brm) => {
    setSubmitting(true);
    try {
      await submitUserStories(brm.id);
      showToast('User stories submitted! PL has been notified.');
      fetchMyBrms(); // Removes it from Assignments tab
      fetchAllBrms(); // Updates the Overview tab instantly
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit stories', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <Toast toast={toast} />

      


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Team Member Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your assigned BRMs and track project progress</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-700">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'overview'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}>
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'assignments'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}>
              My Assignments
              {brms.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {brms.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          loadingAll ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : (
            <BrmDashboardView brms={allBrms} />
          )
        ) : (
          <>
            {/* BRM List - My Assignments */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-white font-semibold">My Assigned BRMs</h2>
                <span className="text-slate-400 text-sm">{brms.length} active assignment{brms.length !== 1 ? 's' : ''}</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
                </div>
              ) : brms.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-slate-300 font-medium">No BRMs Assigned Yet</p>
                  <p className="text-slate-500 text-sm mt-1">When a Product Lead assigns you a BRM, it will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/40">
                        {['BRM Number', 'Title', 'Team / Category', 'Priority', 'Status', 'Assigned On', 'Actions'].map(h => (
                          <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {brms.map(brm => (
                        <tr key={brm.id} className="hover:bg-slate-700/20 group">
                          <td className="px-4 py-3">
                            <span className="text-purple-400 font-mono text-xs font-semibold">{brm.brmNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium max-w-[200px] truncate">{brm.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-300 text-xs">{brm.TeamName}</p>
                            <p className="text-slate-500 text-xs">{brm.Category}</p>
                          </td>
                          <td className="px-4 py-3"><PriorityBadge priority={brm.priority} /></td>
                          <td className="px-4 py-3"><BrmStatusBadge status={brm.currentStatus} /></td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(brm.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openStoryModal(brm)}
                                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs border border-purple-500/30 transition-all font-medium">
                                Edit Stories
                              </button>
                              <button
                                onClick={() => handleSubmitStoriesFromRow(brm)}
                                disabled={!storyCounts[brm.id] || storyCounts[brm.id] === 0 || submitting}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs border border-emerald-500/30 transition-all font-medium disabled:opacity-30 disabled:cursor-not-allowed">
                                Submit Stories {storyCounts[brm.id] ? `(${storyCounts[brm.id]})` : ''}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── USER STORY MODAL ─────────────────────────────────────────────── */}
      {storyTarget && (
        <Modal title={`User Stories for ${storyTarget.brmNumber}`} onClose={() => setStoryTarget(null)} wide>
          <div className="space-y-6">
            {/* BRM Info Banner */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
              <p className="text-white font-medium">{storyTarget.title}</p>
              <p className="text-slate-400 text-sm mt-0.5">{storyTarget.TeamName} · {storyTarget.Category}</p>
            </div>

            {/* Existing Stories */}
            <div>
              <h4 className="text-slate-300 text-sm font-semibold mb-3">
                Stories ({loadingStories ? '...' : stories.length})
              </h4>

              {loadingStories ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500"></div>
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-500 text-sm">No stories yet. Add your first user story below.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {stories.map((story, idx) => (
                    <div key={story.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 group">
                      <span className="text-purple-400 font-mono text-xs font-bold mt-0.5 shrink-0">US-{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{story.title}</p>
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{story.description}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium
                          ${story.priority === 'High' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                          : story.priority === 'Low' ? 'bg-green-500/15 text-green-400 border-green-500/25'
                          : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'}`}>
                          {story.priority}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteStory(story.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Story Form */}
            <form onSubmit={handleAddStory} className="border border-slate-700/60 rounded-xl p-4 bg-slate-900/30 space-y-3">
              <h4 className="text-slate-300 text-sm font-semibold">Add New Story</h4>
              <input
                value={newStory.title}
                onChange={e => setNewStory(p => ({ ...p, title: e.target.value }))}
                placeholder="Story title (e.g. As a user, I want to...)"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={newStory.description}
                onChange={e => setNewStory(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the acceptance criteria and expected behavior..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex items-center gap-3">
                <select
                  value={newStory.priority}
                  onChange={e => setNewStory(p => ({ ...p, priority: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <button type="submit" disabled={addingStory}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                  {addingStory ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></span> Adding...</>
                  ) : (
                    <><span>+</span> Add Story</>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <span className="text-emerald-400">●</span>
                Stories are auto-saved. You can close and come back to add more.
              </p>
              <button onClick={() => setStoryTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
