import { useState } from 'react';
import { UserProfile } from '../App';
import { motion } from 'motion/react';
import { Mail, Lock, User, Sparkles, Briefcase, AlertCircle, Building2, Shield } from 'lucide-react';

interface AuthModalProps {
  onComplete: (profile: UserProfile, token: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

import { API_BASE_URL } from '../config';
import apiService from '../utils/api';

const API_URL = API_BASE_URL;

const INTERESTS = [
  'Technology', 'Design', 'Marketing', 'Business', 'Programming',
  'Data Science', 'Music', 'Art', 'Photography', 'Writing',
  'Gaming', 'Sports', 'Fitness', 'Cooking', 'Travel'
];

const ACTIVITY_DOMAINS = [
  'Technology', 'Education', 'Finance', 'Healthcare', 'Retail',
  'Manufacturing', 'Entertainment', 'Consulting', 'Startup', 'Other'
];

export function AuthModal({ onComplete, isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const [activityDomain, setActivityDomain] = useState('');
  
  // Company request state
  const [isRegisteringCompany, setIsRegisteringCompany] = useState(false);
  const [companyExpectedSeats, setCompanyExpectedSeats] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please complete all fields');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          emotion: 'MOTIVATED',
          energyLevel: 'MEDIUM'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        let errMsg = data.error || 'Login failed';
        if (errMsg === 'Invalid credentials') {
          errMsg = 'Date de conectare incorecte. Verifică email-ul/numele de utilizator și parola sau creează un cont nou dacă nu ai unul.';
        }
        setError(errMsg);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        console.log('[DEBUG] Login response user:', data.user);
        console.log('[DEBUG] initialQuestionnaire:', data.user.initialQuestionnaire);
        const profile: UserProfile = {
          name: data.user.fullName || data.user.username,
          email: data.user.email,
          avatar: data.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.username}`,
          bio: data.user.bio || 'Mentora Student',
          role: data.user.role || 'user',
          initialQuestionnaire: {
            // Read from initialQuestionnaire subdocument (where profile edits are saved)
            interests: data.user.initialQuestionnaire?.interests || data.user.interests || [],
            goals: data.user.initialQuestionnaire?.goals || [],
            experience: data.user.initialQuestionnaire?.experience || 'beginner',
            activityDomain: data.user.initialQuestionnaire?.activityDomain || data.user.activityDomain || ''
          },
          background: {
            domain: data.user.background?.domain || data.user.initialQuestionnaire?.activityDomain || ''
          },
          packageTier: data.user.packageTier || 'free',
          companyName: data.user.companyName,
          dailyMood: undefined,
        };

        // Save token and user profile
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(profile));

        onComplete(profile, data.token);
        resetForm();
        onClose();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name || !email || !password || !passwordConfirm || !fullName || !phone) {
        setError('Please complete all fields');
        setLoading(false);
        return;
      }
      
      if (isRegisteringCompany) {
        if (!companyName || !companyExpectedSeats) {
          setError('Please provide company name and expected seats');
          setLoading(false);
          return;
        }
      }

      if (!interests.length) {
        setError('Please select at least one interest');
        setLoading(false);
        return;
      }

      if (!activityDomain) {
        setError('Please select your activity domain');
        setLoading(false);
        return;
      }

      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          email,
          password,
          fullName,
          phone,
          companyName,
          interests,
          activityDomain
        })
      });

      if (!response.ok) {
        const data = await response.json();
        let errMsg = data.error || 'Registration failed';
        if (errMsg === 'User already exists') {
          errMsg = 'Acest cont (nume sau email) există deja în baza de date. Te rugăm să te conectezi sau să folosești alte date de înregistrare.';
        } else if (errMsg === 'This username is reserved') {
          errMsg = 'Acest nume de utilizator este rezervat. Te rugăm să alegi alt nume.';
        }
        setError(errMsg);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        const profile: UserProfile = {
          name: data.user.username,
          email: data.user.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.username}`,
          bio: 'Mentora Student',
          role: data.user.role || 'user',
          phone: data.user.phone,
          companyName: data.user.companyName,
          initialQuestionnaire: {
            interests: interests,
            goals: [],
            experience: 'beginner',
            activityDomain: activityDomain
          },
          packageTier: data.user.packageTier || 'free',
          companyName: data.user.companyName,
          dailyMood: undefined,
        };

        // Save token and user profile
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(profile));

        // Submit company request if needed
        if (isRegisteringCompany) {
          try {
            await apiService.companies.createRequest({
              name: companyName,
              expectedSeats: companyExpectedSeats,
              website: companyWebsite,
              phone: phone,
              email: email,
              industry: activityDomain
            });
            console.log('Company request submitted');
          } catch (companyErr) {
            console.error('Failed to submit company request:', companyErr);
            // We don't fail the whole signup if just the company request fails
          }
        }

        onComplete(profile, data.token);
        resetForm();
        onClose();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setFullName('');
    setPhone('');
    setCompanyName('');
    setPasswordConfirm('');
    setInterests([]);
    setActivityDomain('');
    setError('');
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#001a36] rounded-2xl p-8 w-full max-w-2xl border border-white/10 shadow-2xl my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="text-center mb-8 shrink-0">
          <h2 className="text-3xl font-bold mb-2">
            {mode === 'login' ? 'Login' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-base">
            {mode === 'login'
              ? 'Welcome back to Mentora!'
              : 'Join our learning community'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 shrink-0"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm font-medium leading-relaxed">
              {error}
            </p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
          {/* LOGIN MODE FIELDS */}
          {mode === 'login' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* SIGNUP MODE FIELDS */}
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="johndoe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+40 7..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Company Details
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRegisteringCompany}
                      onChange={(e) => {
                        setIsRegisteringCompany(e.target.checked);
                        if (e.target.checked) setCompanyName(''); // Clear selection if any
                      }}
                      className="rounded border-white/20 bg-white/5 text-[#FF5530] focus:ring-[#FF5530]"
                    />
                    <span className="text-sm text-gray-400 hover:text-white transition-colors">Register as new company</span>
                  </label>
                </div>

                {!isRegisteringCompany ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: 'TechFlow', plan: 'Free', icon: Building2 },
                      { name: 'Innovate AI', plan: 'Pro', icon: Sparkles },
                      { name: 'Global Systems', plan: 'Enterprise', icon: Shield },
                      { name: 'Buildr', plan: 'Free', icon: Building2 }
                    ].map((company) => {
                      const isSelected = companyName === company.name;
                      const Icon = company.icon;
                      return (
                        <button
                          key={company.name}
                          type="button"
                          onClick={() => setCompanyName(company.name)}
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
                              company.plan === 'Free' ? 'text-gray-400' :
                              company.plan === 'Pro' ? 'text-blue-400' : 'text-purple-400'
                            }`}>
                              {company.plan} Plan
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company Name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                    />
                    <select
                      value={companyExpectedSeats}
                      onChange={(e) => setCompanyExpectedSeats(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white [&>option]:bg-gray-900"
                    >
                      <option value="">Expected number of seats...</option>
                      <option value="1-10">1-10 seats</option>
                      <option value="11-50">11-50 seats</option>
                      <option value="51-200">51-200 seats</option>
                      <option value="200+">200+ seats</option>
                    </select>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="Company Website (Optional)"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-3 bg-white/5 p-4 rounded-lg border border-white/10">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Select Your Interests
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${interests.includes(interest)
                        ? 'bg-[#FF5530]/50 border-[#FF5530] text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                        }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>



              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Activity Domain
                </label>
                <select
                  value={activityDomain}
                  onChange={(e) => setActivityDomain(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20 transition-all text-white cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-gray-800 text-white">Select your domain</option>
                  {ACTIVITY_DOMAINS.map((domain) => (
                    <option key={domain} value={domain} className="bg-gray-800 text-white py-2">
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-[#B54236] to-[#B54236] hover:from-[#FF5530] hover:to-[#FF5530] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading
              ? 'Loading...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-6 text-center pt-4 border-t border-white/10 shrink-0">
          <p className="text-gray-400 text-sm">
            {mode === 'login'
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                resetForm();
              }}
              className="text-[#FF5530] hover:text-[#B54236] font-medium transition-colors"
            >
              {mode === 'login' ? 'Create one' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
