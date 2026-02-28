import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

const Tasks = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tasks</h1>
        <p className="text-muted-foreground mt-1">Task management coming soon</p>
      </motion.div>

      <div className="glass-card p-12 text-center">
        <ClipboardList size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Task management will be available in the next update.</p>
      </div>
    </div>
  );
};

export default Tasks;
