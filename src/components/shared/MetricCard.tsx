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
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass-card p-6 flex items-start justify-between"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
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
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground', gradientMap[gradient])}>
        {icon}
      </div>
    </motion.div>
  );
};

export default MetricCard;
