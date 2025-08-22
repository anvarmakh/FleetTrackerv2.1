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
      case 'owner': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'manager': return <Target className="w-4 h-4 text-green-600" />;
      case 'user': return <UserIcon className="w-4 h-4 text-gray-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <div
          key={role.name}
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedRole === role.name 
              ? 'border-black bg-gray-50' 
              : 'border-gray-200 hover:bg-gray-50'
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
      
      {/* Separator line */}
      <div className="border-t border-gray-200 my-3"></div>
      
      <Button 
        className="w-full" 
        variant="outline" 
        size="sm"
        onClick={onCreateRole}
        disabled={!canCreateRoles}
      >
        <Plus className="w-3 h-3 mr-1" />
        {canCreateRoles ? 'Create New Role' : 'Create New Role (No Permission)'}
      </Button>
    </div>
  );
};

export default RoleList;
