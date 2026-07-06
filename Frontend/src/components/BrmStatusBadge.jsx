const STATUS_STYLES = {
  DRAFT:                 'bg-slate-600/30 text-slate-300 border-slate-600/50',
  SUBMITTED:             'bg-blue-500/20 text-blue-300 border-blue-500/30',
  APPROVED:              'bg-green-500/20 text-green-300 border-green-500/30',
  REJECTED:              'bg-red-500/20 text-red-300 border-red-500/30',
  USER_STORY_CREATION:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  USER_STORIES_CREATED:  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  ARCHITECTURE_REVIEW:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  READY_FOR_DEVELOPMENT: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  CODING_IN_PROGRESS:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  READY_FOR_QA:          'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  QA:                    'bg-pink-500/20 text-pink-300 border-pink-500/30',
  SECURITY:              'bg-rose-500/20 text-rose-300 border-rose-500/30',
  CLOSED:                'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const PRIORITY_STYLES = {
  High:   'bg-red-500/15 text-red-400 border-red-500/25',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  Low:    'bg-green-500/15 text-green-400 border-green-500/25',
};

export function BrmStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-slate-500 text-xs">—</span>;
  const style = PRIORITY_STYLES[priority] || 'bg-slate-600/30 text-slate-300 border-slate-600/50';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {priority}
    </span>
  );
}
