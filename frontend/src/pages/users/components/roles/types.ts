import { User } from '@/types';

export interface PermissionStructure {
  permissionStructure: {
    fleet: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    organization: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    analytics: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    utilities: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
  };
  roleTemplates: {
    [key: string]: {
      name: string;
      description: string;
      blockPermissions: string[];
      granularPermissions: string[];
    };
  };
  blockPermissions: { [key: string]: string };
  granularPermissions: { [key: string]: string };
}

export interface Role {
  name: string;
  displayName: string;
  description: string;
  isCustom: boolean;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NewRole {
  name: string;
  displayName: string;
  description: string;
}

export interface RoleManagementProps {
  users: User[];
  onUserUpdate: () => void;
}

export interface RoleListProps {
  roles: Role[];
  selectedRole: string;
  onRoleSelect: (roleName: string) => void;
  onCreateRole: () => void;
  canCreateRoles: boolean;
  getRoleUserCount: (roleName: string) => number;
  getRolePermissionCount: (roleName: string) => number;
}

export interface RoleDetailsProps {
  selectedRole: Role | null;
  isEditing: boolean;
  onEditPermissions: () => void;
  onCancelEdit: () => void;
  onSavePermissions: () => void;
  onDeleteRole: () => void;
  canEditRoles: boolean;
  canManageRoles: boolean;
}

export interface PermissionEditorProps {
  permissionStructure: PermissionStructure | null;
  editingPermissions: string[];
  allAvailablePermissions: string[];
  isEditing: boolean;
  onPermissionToggle: (permission: string) => void;
  onTablePermissionToggle: (category: string, action: string) => void;
}

export interface RoleDialogsProps {
  showCreateDialog: boolean;
  showDeleteDialog: boolean;
  newRole: NewRole;
  selectedRole: Role | null;
  onCloseCreateDialog: () => void;
  onCloseDeleteDialog: () => void;
  onNewRoleChange: (field: keyof NewRole, value: string) => void;
  onCreateRole: () => void;
  onDeleteRole: () => void;
  canCreateRoles: boolean;
  canManageRoles: boolean;
}
