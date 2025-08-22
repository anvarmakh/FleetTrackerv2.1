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
      case 'owner': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'manager': return <Target className="w-4 h-4 text-green-600" />;
      case 'user': return <UserIcon className="w-4 h-4 text-gray-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600" />;
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
    <div className="space-y-6">
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

      {/* Role Description */}
      <div>
        <p className="text-muted-foreground mb-3">{selectedRole.description}</p>
        <div className="text-sm text-muted-foreground">
          {selectedRole.permissions?.length || 0} permissions
        </div>
        {isProtectedRole(selectedRole.name) && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-amber-800">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Protected Role</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              {ROLE_PROTECTION_MESSAGES.CANNOT_MODIFY}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleDetails;
