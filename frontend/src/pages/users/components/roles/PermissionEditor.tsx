import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Truck, Building, BarChart3, Settings, Users, MapPin, Wrench, FileText, Key, Database, Palette } from 'lucide-react';
import { PermissionEditorProps } from './types';
import { usePermissions } from './hooks/usePermissions';


const PermissionEditor: React.FC<PermissionEditorProps> = ({
  permissionStructure,
  editingPermissions,
  allAvailablePermissions,
  isEditing,
  onPermissionToggle,
  onTablePermissionToggle
}) => {
  const {
    getPermissionCategories,
    isPermissionSelected,
    getBlockPermissionsForCategory,
    getPermissionDisplayName
  } = usePermissions();

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'fleet management':
        return <Truck className="w-5 h-5" />;
      case 'organization management':
        return <Building className="w-5 h-5" />;
      case 'analytics & reports':
        return <BarChart3 className="w-5 h-5" />;
      case 'utilities & services':
        return <Settings className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getGroupIcon = (groupName: string) => {
    const name = groupName.toLowerCase();
    if (name.includes('users')) return <Users className="w-4 h-4 text-gray-600" />;
    if (name.includes('roles')) return <Key className="w-4 h-4 text-gray-600" />;
    if (name.includes('companies')) return <Building className="w-4 h-4 text-gray-600" />;
    if (name.includes('providers')) return <Database className="w-4 h-4 text-gray-600" />;
    if (name.includes('trailers')) return <Truck className="w-4 h-4 text-gray-600" />;
    if (name.includes('locations')) return <MapPin className="w-4 h-4 text-gray-600" />;
    if (name.includes('maintenance')) return <Wrench className="w-4 h-4 text-gray-600" />;
    if (name.includes('notes')) return <FileText className="w-4 h-4 text-gray-600" />;
    if (name.includes('preferences')) return <Palette className="w-4 h-4 text-gray-600" />;
    if (name.includes('reports')) return <BarChart3 className="w-4 h-4 text-gray-600" />;
    return <Settings className="w-4 h-4 text-gray-600" />;
  };

  const permissionCategories = getPermissionCategories(
    permissionStructure,
    editingPermissions,
    allAvailablePermissions,
    isEditing
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4" />
        <h3 className="text-base font-semibold">Permissions</h3>
        {isEditing && (
          <Badge variant="outline" className="text-xs">
            Editing Mode
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {permissionCategories.map((category) => (
          <div key={category.name} className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            {/* Category Header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  {getCategoryIcon(category.name)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{category.name}</h4>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {editingPermissions.filter(p => 
                  category.blocks.includes(p) || 
                  category.granular.some(g => g.permissions.includes(p))
                ).length}/{category.blocks.length + category.granular.reduce((sum, g) => sum + g.permissions.length, 0)}
              </Badge>
            </div>

            {/* Permissions Table */}
            <div className="bg-white">
              <table className="w-full text-sm bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Category</th>
                                         <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">View</th>
                     <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Create</th>
                     <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Edit</th>
                     <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Delete</th>
                     <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Other</th>
                     <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Block Permissions Row */}
                  {category.blocks.length > 0 && (
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                      <td className="p-3 font-semibold text-blue-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Block Permissions
                      </td>
                      <td className="text-center p-3">
                        {getBlockPermissionsForCategory(category.name).includes('fleet_view') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('fleet', 'view', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('fleet', 'view')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                        {getBlockPermissionsForCategory(category.name).includes('org_view') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('org', 'view', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('org', 'view')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                        {getBlockPermissionsForCategory(category.name).includes('analytics_view') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('analytics', 'view', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('analytics', 'view')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {getBlockPermissionsForCategory(category.name).includes('fleet_create') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('fleet', 'create', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('fleet', 'create')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                        {getBlockPermissionsForCategory(category.name).includes('org_create') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('org', 'create', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('org', 'create')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {getBlockPermissionsForCategory(category.name).includes('fleet_edit') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('fleet', 'edit', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('fleet', 'edit')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                        {getBlockPermissionsForCategory(category.name).includes('org_edit') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('org', 'edit', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('org', 'edit')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {getBlockPermissionsForCategory(category.name).includes('fleet_delete') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('fleet', 'delete', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('fleet', 'delete')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                        {getBlockPermissionsForCategory(category.name).includes('org_delete') && (
                          <div className="flex justify-center">
                                                         <Checkbox
                               checked={isPermissionSelected('org', 'delete', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('org', 'delete')}
                               disabled={!isEditing}
                               className=""
                             />
                          </div>
                        )}
                      </td>
                                             <td className="text-center p-3">
                         {getBlockPermissionsForCategory(category.name).includes('analytics_export') && (
                           <div className="flex justify-center">
                             <Checkbox
                               checked={isPermissionSelected('analytics', 'export', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('analytics', 'export')}
                               disabled={!isEditing}
                               className=""
                             />
                           </div>
                         )}
                       </td>
                       <td className="text-center p-3">
                         {getBlockPermissionsForCategory(category.name).includes('fleet_admin') && (
                           <div className="flex justify-center">
                             <Checkbox
                               checked={isPermissionSelected('fleet', 'admin', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('fleet', 'admin')}
                               disabled={!isEditing}
                               className=""
                             />
                           </div>
                         )}
                         {getBlockPermissionsForCategory(category.name).includes('org_admin') && (
                           <div className="flex justify-center">
                             <Checkbox
                               checked={isPermissionSelected('org', 'admin', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('org', 'admin')}
                               disabled={!isEditing}
                               className=""
                             />
                           </div>
                         )}
                         {getBlockPermissionsForCategory(category.name).includes('analytics_admin') && (
                           <div className="flex justify-center">
                             <Checkbox
                               checked={isPermissionSelected('analytics', 'admin', editingPermissions, allAvailablePermissions)}
                               onCheckedChange={() => onTablePermissionToggle('analytics', 'admin')}
                               disabled={!isEditing}
                               className=""
                             />
                           </div>
                         )}
                       </td>
                    </tr>
                  )}

                  {/* Granular Permissions Rows */}
                  {category.granular.map((group, index) => (
                    <tr key={group.name} className={`hover:bg-gray-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="p-3 font-medium text-gray-800 flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-gray-100">
                          {getGroupIcon(group.name)}
                        </div>
                        <span className="text-sm">{group.name}</span>
                      </td>
                      <td className="text-center p-3">
                        {group.permissions.some(p => p.includes('_view')) && (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={group.permissions.some(p => p.includes('_view') && editingPermissions.includes(p))}
                              onCheckedChange={() => {
                                const viewPermission = group.permissions.find(p => p.includes('_view'));
                                if (viewPermission) onPermissionToggle(viewPermission);
                              }}
                              disabled={!isEditing}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {group.permissions.some(p => p.includes('_create')) && (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={group.permissions.some(p => p.includes('_create') && editingPermissions.includes(p))}
                              onCheckedChange={() => {
                                const createPermission = group.permissions.find(p => p.includes('_create'));
                                if (createPermission) onPermissionToggle(createPermission);
                              }}
                              disabled={!isEditing}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {group.permissions.some(p => p.includes('_edit')) && (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={group.permissions.some(p => p.includes('_edit') && editingPermissions.includes(p))}
                              onCheckedChange={() => {
                                const editPermission = group.permissions.find(p => p.includes('_edit'));
                                if (editPermission) onPermissionToggle(editPermission);
                              }}
                              disabled={!isEditing}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {group.permissions.some(p => p.includes('_delete')) && (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={group.permissions.some(p => p.includes('_delete') && editingPermissions.includes(p))}
                              onCheckedChange={() => {
                                const deletePermission = group.permissions.find(p => p.includes('_delete'));
                                if (deletePermission) onPermissionToggle(deletePermission);
                              }}
                              disabled={!isEditing}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>
                        )}
                      </td>
                                             <td className="text-center p-3">
                         {group.permissions.filter(p => !p.includes('_view') && !p.includes('_create') && !p.includes('_edit') && !p.includes('_delete') && !p.includes('_admin') || p.includes('_assign_admin')).map((permission) => (
                                                       <div key={permission} className="flex items-center justify-center gap-2 p-1 rounded-md transition-colors">
                             <Checkbox
                               checked={editingPermissions.includes(permission)}
                               onCheckedChange={() => onPermissionToggle(permission)}
                               disabled={!isEditing}
                               className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                             />
                             <span className="text-xs text-gray-600 font-medium">{getPermissionDisplayName(permission)}</span>
                           </div>
                         ))}
                       </td>
                       <td className="text-center p-3">
                         {/* All column is only for block permissions, not granular permissions */}
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionEditor;
