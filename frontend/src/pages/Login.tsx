import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Truck, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { authAPI } from '@/lib/api';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, adminLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user } = useAuth();
  // Component state loaded
  
  if (isAuthenticated) {
    // Check if user is SystemAdmin and redirect accordingly
    const isSystemAdmin = user?.organizationRole === 'systemAdmin';
    if (isSystemAdmin) {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Admin login - credentials are validated on the backend
      if (email === 'admin@system.local') {
        await adminLogin(password);
        toast({
          title: "Admin Access Granted",
          description: "Welcome, System Administrator",
        });
        // Let the automatic redirect handle the navigation
        return;
      }

      // Regular user login
      await login(email, password, tenantId);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
        duration: 3000, // Show for 3 seconds instead of default
      });
      // Let the automatic redirect handle the navigation
    } catch (error: unknown) {
      toast({
        title: "Login failed",
        description: error.response?.data?.error || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">FleetTracker</CardTitle>
            <CardDescription>
              Sign in to your fleet management account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                type="text"
                placeholder="Enter your tenant ID"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>



            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot your password?
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
        tenantId={tenantId}
      />
    </div>
  );
};

export default Login;
