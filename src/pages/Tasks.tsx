import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mockTasks } from '@/data/mock';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isOwner = user?.role === 'owner';
  const tasks = isOwner
    ? mockTasks
    : mockTasks.filter(t => t.assigned_to === user?.id);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_to_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? 'Manage all workforce tasks' : 'Your assigned tasks'}
          </p>
        </div>
        {isOwner && (
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} />
            New Task
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          {['all', 'pending', 'in_progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Task List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Due Date</div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No tasks found.</div>
        ) : (
          filteredTasks.map((task, i) => (
            <motion.button
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="w-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="col-span-4">
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 md:hidden">{task.assigned_to_name}</p>
              </div>
              <div className="hidden md:flex col-span-2 items-center text-sm text-foreground">{task.assigned_to_name}</div>
              <div className="col-span-2 flex items-center">
                <StatusBadge status={task.status} />
              </div>
              <div className="hidden md:flex col-span-2 items-center">
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="hidden md:flex col-span-2 items-center text-sm text-muted-foreground">
                {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
              </div>
            </motion.button>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default Tasks;
