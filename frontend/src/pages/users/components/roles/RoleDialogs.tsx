import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RoleDialogsProps } from './types';

const RoleDialogs: React.FC<RoleDialogsProps> = ({
  showCreateDialog,
  showDeleteDialog,
  newRole,
  selectedRole,
  onCloseCreateDialog,
  onCloseDeleteDialog,
  onNewRoleChange,
  onCreateRole,
  onDeleteRole,
  canCreateRoles,
  canManageRoles
}) => {
  return (
    <>
      {/* Create New Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={onCloseCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="e.g., custom_role"
                value={newRole.name}
                onChange={(e) => onNewRoleChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="e.g., Custom Role"
                value={newRole.displayName}
                onChange={(e) => onNewRoleChange('displayName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role's purpose and permissions..."
                value={newRole.description}
                onChange={(e) => onNewRoleChange('description', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseCreateDialog}>
              Cancel
            </Button>
            <Button onClick={onCreateRole} disabled={!canCreateRoles}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={onCloseDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the role "{selectedRole?.displayName || selectedRole?.name}"? 
              This action cannot be undone.
            </p>
            <div className="p-3 bg-muted/50 border rounded text-sm">
              <strong>Note:</strong> This role will be permanently removed from the system. 
              Any users currently assigned to this role will need to be reassigned to a different role.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDeleteDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteRole} disabled={!canManageRoles}>
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleDialogs;
