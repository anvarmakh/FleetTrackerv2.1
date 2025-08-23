import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Target, User as UserIcon, Eye, Plus } from 'lucide-react';
import { RoleListProps } from './types';

const RoleList: React.FC<RoleListProps> = ({
  roles,
  selectedRole,
  onRoleSelect,
  onCreateRole,
  canCreateRoles,
  getRoleUserCount,
  getRolePermissionCount
}) => {
  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'manager': return <Target className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'user': return <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        <div className="space-y-2 pr-2">
          {roles.map((role) => (
            <div
              key={role.name}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRole === role.name 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onRoleSelect(role.name)}
            >
            <div className="flex items-center gap-2 mb-1">
              {getRoleIcon(role.name)}
              <div className="flex-1">
                <h4 className="font-medium capitalize text-sm">{role.displayName || role.name}</h4>
              </div>
              <Badge variant={role.isCustom ? "outline" : "secondary"} className="text-xs">
                {role.isCustom ? 'Custom' : 'System'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {getRoleUserCount(role.name)} user{getRoleUserCount(role.name) !== 1 ? 's' : ''} • {getRolePermissionCount(role.name)} permissions
            </div>
          </div>
        ))}
        
        {/* Create New Role button - positioned right after the last role */}
        <Button 
          className="w-full mt-2" 
          variant="outline" 
          size="sm"
          onClick={onCreateRole}
          disabled={!canCreateRoles}
        >
          <Plus className="w-3 h-3 mr-1" />
          {canCreateRoles ? 'Create New Role' : 'Create New Role (No Permission)'}
        </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleList;
