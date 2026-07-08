import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar.jsx';
import { BrmStatusBadge, PriorityBadge } from '../../components/BrmStatusBadge.jsx';
import api from '../../api/axios.js';
import BrmDashboardView from '../../components/dashboard/BrmDashboardView.jsx';

export default function TspTlDashboard() {
  const [brms, setBrms] = useState([]);
  const [allBrms, setAllBrms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch only BRMs ready for architecture review
  const fetchAssignedBrms = useCallback(async () => {
    try {
      const res = await api.get('/brms', { params: { status: 'ARCHITECTURE_CREATION', limit: 100 } });
      setBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load assigned BRMs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all assigned BRMs for the overview
  const fetchAllBrms = useCallback(async () => {
    try {
      const res = await api.get('/brms', { params: { limit: 100 } });
      setAllBrms(res.data.data.brms);
    } catch (err) {
      console.error('Failed to load all BRMs', err);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedBrms();
    fetchAllBrms();
  }, [fetchAssignedBrms, fetchAllBrms]);

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
        </div>

        {/* Content Area */}
        {activeTab === 'overview' ? (
          loadingAll ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
            </div>
          ) : (
            <BrmDashboardView brms={allBrms} />
          )
        ) : (
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
                          <button className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-lg shadow-purple-500/20">
                            Submit Architecture
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
      </main>
    </div>
  );
}
