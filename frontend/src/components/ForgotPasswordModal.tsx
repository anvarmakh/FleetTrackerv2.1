import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authAPI } from '@/lib/api';
import { X, Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  tenantId?: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ 
  isOpen, 
  onClose, 
  onBackToLogin,
  tenantId 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.forgotPassword(email, tenantId);

      if (response.data.success) {
        setEmailSent(true);
        toast({
          title: "Email Sent",
          description: "If an account with that email exists, a password reset link has been sent",
        });
      }
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail('');
    setEmailSent(false);
    onBackToLogin();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLogin}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          
          <div>
            <CardTitle className="text-2xl font-semibold">
              {emailSent ? 'Check Your Email' : 'Forgot Password'}
            </CardTitle>
            <CardDescription>
              {emailSent 
                ? 'We\'ve sent you a password reset link'
                : 'Enter your email to receive a password reset link'
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full dark:bg-input dark:border-border dark:text-foreground"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p>• Check your email inbox (and spam folder)</p>
                <p>• Click the reset link in the email</p>
                <p>• Create a new password</p>
                <p>• The link expires in 1 hour</p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleBackToLogin}
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordModal; 
