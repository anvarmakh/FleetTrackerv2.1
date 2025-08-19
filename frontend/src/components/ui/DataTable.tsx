// ============================================================================
// REUSABLE DATA TABLE COMPONENT
// ============================================================================

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RefreshCw, Plus, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  loading?: boolean;
  refreshing?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  createButtonText?: string;
  emptyMessage?: string;
  className?: string;
  actions?: (item: T) => React.ReactNode;
  sortColumn?: keyof T | string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: keyof T | string) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  loading = false,
  refreshing = false,
  searchable = true,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  filterValue = "",
  onFilterChange,
  showFilters = false,
  onToggleFilters,
  onRefresh,
  onCreate,
  createButtonText = "Create",
  emptyMessage = "No data available",
  className = "",
  actions,
  sortColumn,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: keyof T | string) => {
    if (sortColumn !== columnKey) return <ChevronsUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    onSort(column.key);
  };

  const renderCell = (item: T, column: Column<T>, index: number) => {
    if (column.render) {
      return column.render(item, index);
    }

    const value = item[column.key as keyof T];
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    if (typeof value === 'string' && value.includes('@')) {
      return <span className="font-mono text-sm">{value}</span>;
    }

    return <span>{value}</span>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {onCreate && (
              <Button size="sm" onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {createButtonText}
              </Button>
            )}
          </div>
        </div>

        {(searchable || filters.length > 0) && (
          <div className="flex items-center gap-4">
            {searchable && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {filters.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFilters}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {filterValue && (
                    <Badge variant="secondary" className="ml-2">
                      {filters.find(f => f.value === filterValue)?.label || filterValue}
                    </Badge>
                  )}
                </Button>
                {filterValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterChange?.('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {showFilters && filters.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                variant={filterValue === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange?.(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={column.className}
                    style={{ width: column.width }}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort(column)}
                      >
                        {column.header}
                        <span className="ml-2">
                          {getSortIcon(column.key)}
                        </span>
                      </Button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
                {actions && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    <div className="text-gray-500">{emptyMessage}</div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} className={column.className}>
                        {renderCell(item, column, index)}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell>
                        {actions(item)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
