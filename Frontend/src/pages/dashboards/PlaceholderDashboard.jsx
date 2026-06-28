import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const dashboardInfo = {
  '/pl': { title: 'Product Lead Dashboard', color: 'bg-blue-500', desc: 'Manage BRMs, assign team members, track progress' },
  '/hf': { title: 'Head Functional Dashboard', color: 'bg-orange-500', desc: 'Review and approve BRMs' },
  '/ht': { title: 'Head Technology Dashboard', color: 'bg-cyan-500', desc: 'Review and approve BRMs' },
  '/tm': { title: 'Team Member Dashboard', color: 'bg-green-500', desc: 'Create user stories for assigned BRMs' },
  '/tsp-tl': { title: 'TSP Team Lead Dashboard', color: 'bg-yellow-500', desc: 'Manage architecture, tasks, and team assignments' },
  '/tsp-tm': { title: 'TSP Team Member Dashboard', color: 'bg-teal-500', desc: 'Work on tasks, log milestones and progress' },
  '/qa': { title: 'QA Dashboard', color: 'bg-pink-500', desc: 'Run QA cycles, log test scenarios and evidence' },
  '/security': { title: 'Security Dashboard', color: 'bg-red-500', desc: 'Run security scans and log findings' },
  '/bt': { title: 'Business Team Dashboard', color: 'bg-indigo-500', desc: 'Track BRM status and progress' },
};

export default function PlaceholderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const info = dashboardInfo[path] || { title: 'Dashboard', color: 'bg-slate-500', desc: 'Coming soon' };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-white font-bold">POTS</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-slate-300 text-sm">{user?.firstName} {user?.lastName} <span className="text-slate-500">({user?.roles?.[0]?.replace(/_/g, ' ')})</span></p>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className={`w-20 h-20 ${info.color} rounded-2xl mx-auto mb-6 flex items-center justify-center opacity-80`}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{info.title}</h1>
          <p className="text-slate-400">{info.desc}</p>
          <p className="text-slate-500 text-sm mt-4 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 inline-block">
            🚧 This dashboard is under construction — coming in the next steps
          </p>
        </div>
      </div>
    </div>
  );
}
