import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { mockTasks } from '@/data/mock';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const task = mockTasks.find(t => t.id === id);
  const [note, setNote] = useState('');

  const timeline = [
    { action: 'Task created', date: task?.created_at || '', by: 'Rajesh Rathore' },
    ...(task?.status === 'in_progress' || task?.status === 'completed'
      ? [{ action: 'Status changed to In Progress', date: task.updated_at, by: task.assigned_to_name }]
      : []),
    ...(task?.status === 'completed'
      ? [{ action: 'Task completed', date: task.updated_at, by: task.assigned_to_name }]
      : []),
  ];

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Task not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Tasks
        </button>
      </motion.div>

      {/* Task Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">{task.title}</h1>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="font-medium text-foreground">{task.assigned_to_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="font-medium text-foreground">
                {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No deadline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-foreground">{format(new Date(task.created_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="font-medium text-foreground">{format(new Date(task.updated_at), 'MMM d, HH:mm')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
          <div className="space-y-4">
            {timeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-foreground">{event.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.by} · {format(new Date(event.date), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Add Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare size={18} />
            Add Update
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write an update or note..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
          />
          <div className="flex items-center justify-between mt-3">
            {user?.role === 'employee' && task.status !== 'completed' && (
              <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Update Status...</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            )}
            <button className="ml-auto px-4 py-2 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Submit Update
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TaskDetail;
