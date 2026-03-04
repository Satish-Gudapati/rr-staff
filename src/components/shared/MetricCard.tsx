import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  gradient: 'primary' | 'success' | 'warning';
  index?: number;
}

const gradientMap = {
  primary: 'metric-gradient',
  success: 'metric-gradient-success',
  warning: 'metric-gradient-warning',
};

const MetricCard = ({ title, value, change, changeType, icon, gradient, index = 0 }: MetricCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="glass-card p-5 flex items-start justify-between group cursor-default"
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {change && (
          <p className={cn(
            'text-xs font-medium',
            changeType === 'positive' && 'text-success',
            changeType === 'negative' && 'text-destructive',
            changeType === 'neutral' && 'text-muted-foreground'
          )}>
            {change}
          </p>
        )}
      </div>
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-primary-foreground transition-transform group-hover:scale-110', gradientMap[gradient])}>
        {icon}
      </div>
    </motion.div>
  );
};

export default MetricCard;
