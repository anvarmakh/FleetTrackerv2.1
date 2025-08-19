import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, CheckCircle, AlertTriangle, MapPin, Building2 } from 'lucide-react';

import { Stats } from '../types';

interface TrailerStatsProps {
  stats: Stats;
  activeStatsFilter: string | null;
  onStatsCardClick: (filterType: string) => void;
}

const TrailerStats: React.FC<TrailerStatsProps> = ({
  stats,
  activeStatsFilter,
  onStatsCardClick
}) => {
  const statsCards = [
    {
      title: 'Total Trailers',
      value: stats.totalTrailers,
      icon: Truck,
      color: 'bg-blue-500',
      filterType: 'all'
    },
    {
      title: 'Active Trailers',
      value: stats.activeTrailers,
      icon: CheckCircle,
      color: 'bg-green-500',
      filterType: 'active'
    },
    {
      title: 'Inactive Trailers',
      value: stats.inactiveTrailers,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      filterType: 'inactive'
    },
    {
      title: 'Maintenance Alerts',
      value: stats.maintenanceAlerts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      filterType: 'maintenance'
    },
    {
      title: 'Non-Company Owned',
      value: stats.nonCompanyOwned,
      icon: Building2,
      color: 'bg-purple-500',
      filterType: 'custom'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
      {statsCards.map((card) => {
        const IconComponent = card.icon;
        const isActive = activeStatsFilter === card.filterType;
        
        return (
          <Card
            key={card.title}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              isActive ? 'ring-2 ring-blue-500 bg-blue-500/10 dark:bg-blue-400/20' : ''
            }`}
            onClick={() => onStatsCardClick(card.filterType)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <IconComponent className={`h-4 w-4 ${card.color.replace('bg-', 'text-')}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TrailerStats;
