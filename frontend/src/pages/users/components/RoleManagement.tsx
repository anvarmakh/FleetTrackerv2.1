import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UserData } from '@/types';

interface PermissionStructure {
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

interface RoleManagementProps {
  users: UserData[];
  onUserUpdate: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ users, onUserUpdate }) => {
  const [permissionStructure, setPermissionStructure] = useState<PermissionStructure | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [blockPermissions, setBlockPermissions] = useState<string[]>([]);
  const [granularPermissions, setGranularPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // Load permission structure
  useEffect(() => {
    const loadPermissionStructure = async () => {
      try {
        const response = await adminAPI.getPermissions();
        setPermissionStructure(response.data.data);
      } catch (error) {
        console.error('Error loading permission structure:', error);
        toast({
          title: "Error",
          description: "Failed to load permission structure",
          variant: "destructive",
        });
      }
    };

    loadPermissionStructure();
  }, [toast]);

  // Load user permissions when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      const response = await adminAPI.getUserPermissions(userId);
      const permissions = response.data.data.permissions;
      setUserPermissions(permissions);
      
      // Parse block and granular permissions
      const blocks = permissions.filter((p: string) => p.includes('_view') || p.includes('_create') || p.includes('_edit') || p.includes('_delete') || p.includes('_admin'));
      const granular = permissions.filter((p: string) => !p.includes('_view') && !p.includes('_create') && !p.includes('_edit') && !p.includes('_delete') && !p.includes('_admin'));
      
      setBlockPermissions(blocks);
      setGranularPermissions(granular);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleTemplateSelect = (roleName: string) => {
    if (!permissionStructure) return;

    const template = permissionStructure.roleTemplates[roleName];
    if (template) {
      setBlockPermissions(template.blockPermissions);
      setGranularPermissions(template.granularPermissions);
    }
  };

  const handleBlockPermissionToggle = (permission: string) => {
    setBlockPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleGranularPermissionToggle = (permission: string) => {
    setGranularPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await adminAPI.updateUserPermissions(selectedUser.id, {
        blockPermissions,
        granularPermissions
      });
      
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
      onUserUpdate();
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermissionDisplayName = (permission: string) => {
    if (!permissionStructure) return permission;
    
    // Check block permissions
    const blockName = Object.entries(permissionStructure.blockPermissions).find(([key, value]) => value === permission);
    if (blockName) {
      return blockName[0].replace(/_/g, ' ').toUpperCase();
    }
    
    // Check granular permissions
    const granularName = Object.entries(permissionStructure.granularPermissions).find(([key, value]) => value === permission);
    if (granularName) {
      return granularName[0].replace(/_/g, ' ').toUpperCase();
    }
    
    return permission;
  };

  if (!permissionStructure) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading permission structure...</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle>User Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(userId) => setSelectedUser(users.find(u => u.id === userId) || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user to manage permissions" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email}) - {user.organizationRole}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          {/* Role Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Role Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissionStructure.roleTemplates).map(([roleName, template]) => (
                  <Card key={roleName} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize">{template.name}</h4>
                        <Badge variant="secondary">{template.blockPermissions.length} blocks</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <Button 
                        size="sm" 
                        onClick={() => handleRoleTemplateSelect(roleName)}
                        className="w-full"
                      >
                        Apply Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permission Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Permission Management for {selectedUser.firstName} {selectedUser.lastName}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="blocks" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="blocks">Block Permissions</TabsTrigger>
                  <TabsTrigger value="granular">Granular Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="blocks" className="space-y-4">
                  {Object.entries(permissionStructure.permissionStructure).map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span>{group.icon}</span>
                        {group.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.blocks.map((blockPermission) => (
                          <div key={blockPermission} className="flex items-center space-x-2">
                            <Checkbox
                              id={blockPermission}
                              checked={blockPermissions.includes(blockPermission)}
                              onCheckedChange={() => handleBlockPermissionToggle(blockPermission)}
                            />
                            <Label htmlFor={blockPermission} className="text-sm">
                              {getPermissionDisplayName(blockPermission)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="granular" className="space-y-4">
                  {showAdvanced && Object.entries(permissionStructure.permissionStructure).map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span>{group.icon}</span>
                        {group.name}
                      </h3>
                      {Object.entries(group.granular).map(([subKey, subGroup]) => (
                        <div key={subKey} className="ml-4 space-y-2">
                          <h4 className="font-medium text-sm">{subGroup.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {subGroup.permissions.map((permission) => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox
                                  id={permission}
                                  checked={granularPermissions.includes(permission)}
                                  onCheckedChange={() => handleGranularPermissionToggle(permission)}
                                />
                                <Label htmlFor={permission} className="text-xs">
                                  {getPermissionDisplayName(permission)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {!showAdvanced && (
                    <div className="text-center text-muted-foreground py-8">
                      Enable "Advanced Options" to manage granular permissions
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSavePermissions} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RoleManagement;
