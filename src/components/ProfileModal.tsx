import { X, Camera, Mail, User as UserIcon, FileText, Shield, Sparkles, Building2 } from 'lucide-react';
import { UserProfile } from '../App';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { apiService } from '../utils/api';

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

// Available interests - same as in AuthModal
const AVAILABLE_INTERESTS = [
  'Technology', 'Design', 'Marketing', 'Business',
  'Programming', 'Data Science', 'Music', 'Art',
  'Photography', 'Writing', 'Gaming', 'Sports',
  'Fitness', 'Cooking', 'Travel'
];

// Available domains - same as in AuthModal
const AVAILABLE_DOMAINS = [
  'Technology', 'Education', 'Finance', 'Healthcare', 'Retail',
  'Manufacturing', 'Entertainment', 'Consulting', 'Startup', 'Other'
];

export function ProfileModal({ profile, onClose, onSave }: ProfileModalProps) {
  const [formData, setFormData] = useState(profile);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar);
  const [interests, setInterests] = useState<string[]>(
    profile.initialQuestionnaire?.interests || []
  );
  const [activityDomain, setActivityDomain] = useState<string>(
    profile.initialQuestionnaire?.activityDomain || profile.background?.domain || ''
  );

  // Load companies from API
  const [companies, setCompanies] = useState<{name: string; plan: string}[]>([]);
  useEffect(() => {
    apiService.request('/companies/list', { method: 'GET' })
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          setCompanies(data);
        }
      })
      .catch(() => {
        // Fallback if API fails
        console.warn('Could not load companies from API');
      });
  }, []);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      avatar: avatarUrl,
      initialQuestionnaire: {
        ...formData.initialQuestionnaire,
        interests,
        activityDomain,
        goals: formData.initialQuestionnaire?.goals || [],
        experience: formData.initialQuestionnaire?.experience || 'beginner'
      },
      background: {
        ...formData.background,
        domain: activityDomain
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl border border-white/10 flex flex-col my-auto mt-8 mb-8"
        style={{ backgroundColor: '#001a36' }}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-3xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all hover:scale-110 p-2 hover:bg-white/10 rounded-lg"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="space-y-6 flex-1">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="relative group">
                <div
                  className="w-32 h-32 rounded-full ring-4 ring-[#FF5530]/50 shadow-2xl bg-gradient-to-br from-[#002147] to-[#003366]"
                  style={{
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Fallback if background-image doesn't work */}
                  <img
                    src={avatarUrl}
                    alt={formData.name}
                    className="w-full h-full rounded-full object-cover"
                    style={{ opacity: 0 }}
                    onError={(e) => {
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.style.backgroundImage = `url(https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}&backgroundColor=EA7E5C)`;
                      }
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '1';
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-[#FF5530] to-[#B54236] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-4 border-gray-900"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full">
                <label className="text-sm text-gray-400 mb-2 block">Avatar URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                placeholder="Your name"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                placeholder="+40 7..."
              />
            </div>

            {/* Company Name Field */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companies.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-2">No companies available</p>
                )}
                {companies.map((company) => {
                  const isSelected = formData.companyName === company.name;
                  const planLower = company.plan.toLowerCase();
                  const Icon = planLower === 'enterprise' || planLower === 'elite' ? Shield
                    : planLower === 'growth' || planLower === 'starter' ? Sparkles
                    : Building2;
                  return (
                    <button
                      key={company.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, companyName: company.name, packageTier: planLower as any })}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#FF5530] bg-[#FF5530]/10 text-white'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#FF5530]/20' : 'bg-white/5'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FF5530]' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{company.name}</div>
                        <div className={`text-xs ${
                          planLower === 'free' ? 'text-gray-400' :
                          planLower === 'enterprise' || planLower === 'elite' ? 'text-purple-400' : 'text-blue-400'
                        }`}>
                          {company.plan} Plan
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20 transition-all min-h-[100px] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Interests Section */}
            <div>
              <label className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Your Interests
                <span className="text-xs text-gray-500">({interests.length} selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${interests.includes(interest)
                      ? 'bg-gradient-to-r from-red-600 to-red-700 border-[#FF5530] text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#FF5530]/50 hover:text-white'
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Domain Section */}
            <div>
              <label className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Activity Domain
                {activityDomain && (
                  <span className="ml-auto text-xs text-[#FF5530]">({activityDomain})</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setActivityDomain(domain)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${activityDomain === domain
                      ? 'bg-[#B54236] text-white border-2 border-[#FF5530]'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:border-white/30 hover:bg-white/10'
                      }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Role & Package Badges */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role
                </label>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/20 to-red-700/20 border border-[#FF5530]/30 rounded-lg w-full">
                  <Shield className="w-4 h-4 text-[#FF5530]" />
                  <span className="text-[#FF5530] capitalize">{formData.role}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Package Tier
                </label>
                <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg w-full ${
                  (formData.packageTier || 'free').toLowerCase() === 'enterprise' || (formData.packageTier || 'free').toLowerCase() === 'elite'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30' 
                    : (formData.packageTier || 'free').toLowerCase() === 'growth' || (formData.packageTier || 'free').toLowerCase() === 'starter'
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30'
                      : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/30'
                }`}>
                  <Sparkles className={`w-4 h-4 ${
                    (formData.packageTier || 'free').toLowerCase() === 'enterprise' || (formData.packageTier || 'free').toLowerCase() === 'elite' ? 'text-purple-400' :
                    (formData.packageTier || 'free').toLowerCase() === 'growth' || (formData.packageTier || 'free').toLowerCase() === 'starter' ? 'text-blue-400' : 'text-gray-400'
                  }`} />
                  <span className={`capitalize font-medium ${
                    (formData.packageTier || 'free').toLowerCase() === 'enterprise' || (formData.packageTier || 'free').toLowerCase() === 'elite' ? 'text-purple-400' :
                    (formData.packageTier || 'free').toLowerCase() === 'growth' || (formData.packageTier || 'free').toLowerCase() === 'starter' ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    {formData.packageTier || 'Free'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 mt-4 border-t border-white/10 shrink-0">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all border border-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}