import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Target, User as UserIcon, Eye, Edit, Save, X, Trash2 } from 'lucide-react';
import { RoleDetailsProps } from './types';
import { isProtectedRole, getEditButtonText, ROLE_PROTECTION_MESSAGES } from '@/utils/roleConstants';

const RoleDetails: React.FC<RoleDetailsProps> = ({
  selectedRole,
  isEditing,
  onEditPermissions,
  onCancelEdit,
  onSavePermissions,
  onDeleteRole,
  canEditRoles,
  canManageRoles
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

  if (!selectedRole) {
    return (
      <div className="space-y-6">
        <div className="text-center text-muted-foreground">
          Select a role to view details
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Role Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getRoleIcon(selectedRole.name)}
          <div>
            <h3 className="text-lg font-semibold capitalize">{selectedRole.displayName || selectedRole.name}</h3>
            <Badge variant={selectedRole.isCustom ? "outline" : "secondary"}>
              {selectedRole.isCustom ? 'Custom Role' : 'System Role'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSavePermissions}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onEditPermissions}
                disabled={!canEditRoles || isProtectedRole(selectedRole.name)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {getEditButtonText(selectedRole.name, canEditRoles)}
              </Button>
              {selectedRole.isCustom && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onDeleteRole}
                  disabled={!canManageRoles}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Role Description - Compact */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">{selectedRole.description}</span>
          <span className="text-muted-foreground">• {selectedRole.permissions?.length || 0} permissions</span>
        </div>
        {isProtectedRole(selectedRole.name) && (
          <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
            <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">Protected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleDetails;
