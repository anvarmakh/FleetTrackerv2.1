import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Lock, X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PasswordChangeModal from './PasswordChangeModal';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    timezone: 'UTC',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const profileResponse = await userAPI.getProfile();
      if (profileResponse.data.success) {
        const profileData = profileResponse.data.data;
        setProfile({
          id: profileData.id || '',
          email: profileData.email || '',
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || 'UTC',
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen, loadProfileData]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      // Debug: Log the profile data being sent
      // Profile data being sent
      
      const profileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        timezone: profile.timezone,
        language: 'en'
      };
      
      const response = await userAPI.updateProfile(profileData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Profile update failed');
      }
      
      // Update the auth token if a new one is provided
      if (response.data.newToken) {
        localStorage.setItem('authToken', response.data.newToken);
      }
      
      // Reload profile data to ensure it's updated
      const updatedProfileResponse = await userAPI.getProfile();
      const updatedProfileData = updatedProfileResponse.data.data;
      
      const updatedProfile = {
        id: updatedProfileData.id || '',
        email: updatedProfileData.email || '',
        firstName: updatedProfileData.firstName || '',
        lastName: updatedProfileData.lastName || '',
        phone: updatedProfileData.phone || '',
        timezone: updatedProfileData.timezone || 'UTC',
      };
      
      setProfile(updatedProfile);
      
                   // Update the user in AuthContext so the navigation shows the updated name
      const updatedUserData = {
        id: updatedProfileData.id,
        email: updatedProfileData.email,
        firstName: updatedProfileData.firstName,
        lastName: updatedProfileData.lastName,
        companyId: user?.companyId || '',
        organizationRole: user?.organizationRole || '',
      };
      
      // Debug: Log the updated user data being sent to AuthContext
              // User data updated successfully
      
      updateUser(updatedUserData);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: error.response?.data?.error || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-semibold">Edit Profile</CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName || ''}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName || ''}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  value={profile.timezone || 'UTC'} 
                  onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button onClick={handleProfileSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordModal(true)}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};

export default ProfileModal; 