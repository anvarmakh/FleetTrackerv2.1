import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Truck, Settings, User, LogOut, ChevronDown, Shield, Users, Building } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import CompanySwitcher from './CompanySwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal';
import { userAPI } from '@/lib/api';

const Navigation = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  // Debug: Log the current user object
  // User loaded successfully

  // Hide welcome message after 1 minute
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 60000); // 60 seconds = 1 minute

    return () => clearTimeout(timer);
  }, []);

  // Load user permissions
  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        const permissionsResponse = await userAPI.getPermissions();
        if (permissionsResponse.data.success) {
          const permissionsData = permissionsResponse.data.data;
          if (permissionsData) {
            const userPermsArray = permissionsData.userPermissions || [];
            setUserPermissions(userPermsArray);
          }
        }
      } catch (error) {
        console.error('Error loading user permissions:', error);
      }
    };

    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  // Smart sticky navigation - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navigation when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } 
      // Hide navigation when scrolling down (but not at the very top)
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Function to generate user initials
  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    const initials = first + last;
    
    return initials;
  };
  
  // Function to get user name with fallback for both camelCase and snake_case
  const getUserName = (user: { firstName?: string; first_name?: string }) => {
    return user?.firstName || user?.first_name || '';
  };
  
  const getUserLastName = (user: { lastName?: string; last_name?: string }) => {
    return user?.lastName || user?.last_name || '';
  };

  // Define navigation items with permission requirements
  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      requiredPermission: null, // Always accessible
    },
    {
      label: 'Trailers',
      href: '/trailers',
      icon: Truck,
      requiredPermission: null, // Always accessible
    },
  ];

  // Define settings dropdown items with permission requirements
  const settingsItems = [
    {
      label: 'Users',
      href: '/users',
      icon: Users,
      requiredPermissions: ['users_view', 'roles_view'], // Show if ANY tab is accessible
    },
    {
      label: 'Company',
      href: '/settings',
      icon: Building,
      requiredPermissions: ['companies_view', 'providers_view', 'maintenance_settings_view', 'company_preferences_view'], // Show if ANY tab is accessible
    },
  ];

  // Filter navigation items based on user permissions
  const hasPermission = (permission: string | null) => {
    if (!permission) return true; // No permission required
    if (!user?.organizationRole) return false;
    
    // Define permission hierarchy for navigation
    const rolePermissions: Record<string, string[]> = {
              'systemadmin': ['users_view', 'companies_view', 'providers_view', 'roles_view', 'maintenance_settings_view', 'company_preferences_view'],
      'owner': ['users_view', 'companies_view', 'providers_view', 'roles_view', 'maintenance_settings_view', 'company_preferences_view'],
      'admin': ['users_view', 'companies_view', 'providers_view', 'roles_view', 'maintenance_settings_view', 'company_preferences_view'],
      'manager': ['companies_view', 'providers_view'], // Managers can't manage users
      'user': [], // Regular users have no admin permissions
    };
    
    return rolePermissions[user.organizationRole]?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const visibleNavItems = navItems.filter(item => hasPermission(item.requiredPermission));
  const visibleSettingsItems = settingsItems.filter(item => hasAnyPermission(item.requiredPermissions));

  // Admin dashboard is hidden from all users - only accessible via special login
  // No admin link shown in navigation

    return (
    <>
      <nav className={`sticky top-0 z-50 bg-card border-b border-border px-6 py-4 transition-all duration-300 shadow-sm ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2 transition-colors duration-150 hover:opacity-80">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">FleetTracker</span>
            </Link>
            
            <div className="flex items-center space-x-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-colors duration-150",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <Link to={item.href}>
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}

              {/* Settings Dropdown - Only show if user has any settings permissions */}
              {visibleSettingsItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={location.pathname.startsWith('/users') || location.pathname.startsWith('/settings') ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2 transition-colors duration-150",
                        (location.pathname.startsWith('/users') || location.pathname.startsWith('/settings')) && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-popover border border-border">
                    {visibleSettingsItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      
                      return (
                        <DropdownMenuItem key={item.href} asChild className="hover:bg-accent">
                          <Link to={item.href} className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span 
              className={`text-sm text-muted-foreground transition-opacity duration-500 ${
                showWelcome ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                visibility: showWelcome ? 'visible' : 'hidden',
                transition: 'opacity 0.5s ease-in-out'
              }}
            >
              Welcome back, {getUserName(user)}
            </span>
            {/* CompanySwitcher temporarily hidden
            <CompanySwitcher userPermissions={userPermissions} />
            */}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-sm transition-colors duration-150">
                  <User className="w-4 h-4" />
                  <span>{getUserInitials(getUserName(user), getUserLastName(user))}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border">
                <DropdownMenuItem onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 hover:bg-accent">
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};

export default Navigation;