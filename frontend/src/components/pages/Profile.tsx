import React, { useState, useRef } from 'react';
import { 
  Calendar, Code, Zap, Trophy, Wrench, Clock, TrendingUp,
  Camera, Save, Loader2, User, Settings, Shield, Award,
  BarChart3, Target, Flame, Edit2
} from 'lucide-react';
import { mockUsers, allAchievements } from '../../utils/mockData';
import AchievementBadge from '../ui/AchievementBadge';
import StatCard from '../ui/StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import '../../utils/date';

const Profile: React.FC = () => {
  const { user: authUser, userProfile, refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'settings'>('overview');
  
  // Form data for editing
  const [formData, setFormData] = useState({
    username: userProfile?.username || '',
    full_name: userProfile?.full_name || '',
    bio: '', // Add bio field to user profile in future
  });

  // Use mock data for now, will be replaced with real data
  const user = mockUsers[0];

  // Prepare data for charts
  const toolUsageData = user.stats.favoriteTools.map(tool => ({
    name: tool.tool,
    value: tool.count,
    percentage: tool.percentage
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const hourlyActivityData = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour.toString().padStart(2, '0'),
    activity: user.stats.peakHours.includes(hour) ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 30)
  }));

  // Check which achievements are unlocked
  const unlockedAchievements = user.achievements.map(a => a.id);
  const displayAchievements = allAchievements.map(achievement => ({
    ...achievement,
    isUnlocked: unlockedAchievements.includes(achievement.id),
    unlockedData: user.achievements.find(a => a.id === achievement.id)
  }));

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !authUser) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    try {
      setUploadingAvatar(true);
      
      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);
        
      if (updateError) throw updateError;
      
      // Refresh user data
      await refreshUserData();
      
      toast.success('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) throw error;
      
      await refreshUserData();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const initials = (userProfile?.full_name || userProfile?.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8 fade-in">
      {/* Profile Header */}
      <div className="glass rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              {userProfile?.avatar_url || user.avatar ? (
                <img 
                  src={userProfile?.avatar_url || user.avatar} 
                  alt={userProfile?.full_name || user.displayName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-accent-purple/30"
                />
              ) : (
                <div className="w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                    color: 'white'
                  }}>
                  {initials}
                </div>
              )}
              
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            
            {/* Rank Badge */}
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-full font-semibold text-sm" 
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-gold), var(--color-accent-yellow))',
                  color: 'var(--color-text-inverse)'
                }}>
                <Trophy className="w-4 h-4 inline-block mr-1" />
                Rank #{user.rank}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    placeholder="Enter username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 btn-primary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-1">{userProfile?.full_name || user.displayName}</h1>
                    <p className="text-muted text-lg mb-4">@{userProfile?.username || user.username}</p>
                    <p className="text-muted mb-4">Competing with Claude Code since greatness began</p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({
                        username: userProfile?.username || '',
                        full_name: userProfile?.full_name || '',
                        bio: '',
                      });
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 btn-secondary"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-muted">Joined {new Date(userProfile?.created_at || user.joinedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted" />
                    <span className="text-muted">Last active {new Date(user.lastActive).toRelativeTime()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-accent-orange" />
                    <span className="text-muted">{user.stats.currentStreak} day streak</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 glass rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'overview' 
              ? 'bg-accent-blue text-white' 
              : 'text-muted hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'achievements' 
              ? 'bg-accent-purple text-white' 
              : 'text-muted hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          Achievements
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'settings' 
              ? 'bg-accent-green text-white' 
              : 'text-muted hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Sessions"
              value={user.stats.totalSessions.toLocaleString()}
              icon="📊"
              change={12.5}
              trend="up"
            />
            <StatCard
              title="Success Rate"
              value={`${user.stats.successRate}%`}
              icon="🎯"
              change={3.2}
              trend="up"
            />
            <StatCard
              title="Longest Streak"
              value={`${user.stats.longestStreak} days`}
              icon="🏆"
            />
            <StatCard
              title="Avg. Session Time"
              value={`${user.stats.averageSessionDuration} min`}
              icon="⏱️"
              change={-15.0}
              trend="down"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Tool Usage Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={toolUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {toolUsageData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Activity by Hour
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="var(--color-text-muted)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="activity" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Recent Milestones</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent-green" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Reached 90% Success Rate</p>
                  <p className="text-sm text-muted">Maintained for 7 consecutive days</p>
                </div>
                <span className="text-sm text-muted">2 days ago</span>
              </div>
              <div className="flex items-center gap-3 py-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-accent-blue" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Speed Improvement</p>
                  <p className="text-sm text-muted">Average task time reduced by 15%</p>
                </div>
                <span className="text-sm text-muted">5 days ago</span>
              </div>
              <div className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                  <Code className="w-5 h-5 text-accent-purple" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">1000 Sessions Milestone</p>
                  <p className="text-sm text-muted">Completed 1000 total coding sessions</p>
                </div>
                <span className="text-sm text-muted">1 week ago</span>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements Collection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {displayAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={
                  achievement.isUnlocked && achievement.unlockedData
                    ? { ...achievement, ...achievement.unlockedData }
                    : achievement
                }
                locked={!achievement.isUnlocked}
                size="md"
              />
            ))}
          </div>
          
          <div className="mt-8 p-4 glass rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Achievement Progress</h4>
                <p className="text-sm text-muted mt-1">
                  {unlockedAchievements.length} of {allAchievements.length} achievements unlocked
                </p>
              </div>
              <div className="text-3xl font-bold text-accent-purple">
                {Math.round((unlockedAchievements.length / allAchievements.length) * 100)}%
              </div>
            </div>
            <div className="mt-3 w-full bg-dark-border rounded-full h-3">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(unlockedAchievements.length / allAchievements.length) * 100}%`,
                  background: 'linear-gradient(to right, var(--color-accent-blue), var(--color-accent-purple))'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Account Settings */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted">Email</span>
                <span className="font-mono text-sm">{authUser?.email || user.email}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted">User ID</span>
                <span className="font-mono text-sm">{authUser?.id || 'mock-user-id'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-muted">Provider</span>
                <span className="capitalize">{authUser?.app_metadata?.provider || 'Google'}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted">Member Since</span>
                <span>{new Date(authUser?.created_at || user.joinedDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy Settings
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Public Profile</p>
                  <p className="text-sm text-muted">Allow others to see your profile and achievements</p>
                </div>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Show Activity Status</p>
                  <p className="text-sm text-muted">Display when you were last active</p>
                </div>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Anonymous Mode</p>
                  <p className="text-sm text-muted">Hide your name from public leaderboards</p>
                </div>
                <input type="checkbox" className="toggle" />
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass rounded-xl p-6 border border-accent-red/30">
            <h3 className="text-lg font-semibold mb-4 text-accent-red">Danger Zone</h3>
            <p className="text-muted mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-accent-red/80 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;