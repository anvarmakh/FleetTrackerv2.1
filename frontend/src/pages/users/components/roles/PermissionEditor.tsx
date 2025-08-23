import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    if (name.includes('users')) return <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('roles')) return <Key className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('companies')) return <Building className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('providers')) return <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('trailers')) return <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('locations')) return <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('maintenance')) return <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('notes')) return <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('preferences')) return <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    if (name.includes('reports')) return <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    return <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  };

  const permissionCategories = getPermissionCategories(
    permissionStructure,
    editingPermissions,
    allAvailablePermissions,
    isEditing
  );

      return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Shield className="w-4 h-4" />
        <h3 className="text-base font-semibold">Permissions</h3>
        {isEditing && (
          <Badge variant="outline" className="text-xs">
            Editing Mode
          </Badge>
        )}
      </div>
      
      <div className="pr-2">
        <Accordion type="multiple" className="space-y-2">
          {permissionCategories.map((category) => (
            <AccordionItem key={category.name} value={category.name} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:no-underline [&[data-state=open]]:bg-gray-100 dark:[&[data-state=open]]:bg-gray-700">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      {getCategoryIcon(category.name)}
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium text-sm dark:text-gray-200">{category.name}</h4>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {category.enabledCount}/{category.totalCount}
                  </Badge>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-0">
                {/* Permissions Table */}
                <div className="bg-white dark:bg-gray-900">
                  <table className="w-full text-sm bg-white dark:bg-gray-900">
                    <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Category</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">View</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Create</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Edit</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Delete</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Other</th>
                        <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {/* Block Permissions Row */}
                      {category.blocks.length > 0 && (
                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 transition-all duration-200">
                          <td className="p-3 font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
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
                        <tr key={group.name} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                          <td className="p-3 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700">
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
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 dark:data-[state=checked]:bg-green-500 dark:data-[state=checked]:border-green-500"
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
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 dark:data-[state=checked]:bg-green-500 dark:data-[state=checked]:border-green-500"
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
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 dark:data-[state=checked]:bg-green-500 dark:data-[state=checked]:border-green-500"
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
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 dark:data-[state=checked]:bg-green-500 dark:data-[state=checked]:border-green-500"
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
                                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 dark:data-[state=checked]:bg-purple-500 dark:data-[state=checked]:border-purple-500"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{getPermissionDisplayName(permission)}</span>
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default PermissionEditor;
