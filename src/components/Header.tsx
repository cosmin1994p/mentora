import { Search, Bell, User, Home, BookOpen, Film, GraduationCap, Settings, LogOut, ChevronDown } from 'lucide-react';
import { View, UserProfile } from '../App';
import { useState, useRef, useEffect } from 'react';
import { NavBar } from './ui/tubelight-navbar';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userProfile: UserProfile | null;
  onProfileClick: () => void;
  onLogout: () => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
}

const FALLBACK_PROFILE: UserProfile = {
  name: 'Mentora',
  email: '',
  avatar: '/logo-header.jpg',
  role: 'user',
  packageTier: 'free',
};

export function Header({
  currentView,
  onViewChange,
  userProfile,
  onProfileClick,
  onLogout,
  onSearchClick,
  onNotificationsClick
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profile = userProfile || FALLBACK_PROFILE;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Home', value: 'home', icon: Home },
    { name: 'Courses', value: 'courses', icon: BookOpen },
    { name: 'Reels', value: 'reels', icon: Film },
    { name: 'Speakers', value: 'speakers', icon: GraduationCap },
    { name: 'My Learning', value: 'my-learning', icon: GraduationCap },
    ...(profile.role === 'admin' ? [{ name: 'Admin', value: 'admin', icon: Settings }] : []),
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#002147]/90 to-transparent">
      <div className="flex min-h-[88px] items-center justify-between px-4 py-6 md:px-12">
        <div className="flex items-center gap-12">
          <div className="flex items-center">
            <img
              src="/logo-header.jpg"
              alt="Mentora"
              className="h-10 w-auto object-contain"
              width={160}
              height={40}
              fetchPriority="high"
            />
          </div>

          <div className="hidden md:block">
            <NavBar
              items={navItems}
              activeTab={currentView}
              onTabChange={(value) => onViewChange(value as View)}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            className="text-white transition-all hover:text-gray-300"
            onClick={onSearchClick}
            aria-label="Search"
          >
            <Search className="h-6 w-6" />
          </button>
          <button
            className="relative text-white transition-all hover:text-gray-300"
            onClick={onNotificationsClick}
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#FF5530]" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => userProfile && setIsDropdownOpen(!isDropdownOpen)}
              className="group relative flex items-center gap-2"
              aria-label="Profile menu"
            >
              <div className="h-8 w-8 overflow-hidden rounded ring-0 transition-all group-hover:ring-2 group-hover:ring-white">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                  width={32}
                  height={32}
                />
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && userProfile && (
              <div className="absolute right-0 top-12 w-64 animate-fadeIn overflow-hidden rounded-lg border border-white/10 bg-[#002147]/95 shadow-2xl backdrop-blur-sm">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="h-12 w-12 rounded-full object-cover"
                      width={48}
                      height={48}
                    />
                    <div>
                      <p className="font-semibold">{profile.name}</p>
                      <p className="text-sm text-gray-400">{profile.email}</p>
                      <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${profile.role === 'admin'
                        ? 'bg-[#FF5530] text-white'
                        : 'bg-gray-700 text-gray-300'
                        }`}>
                        {profile.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      onProfileClick();
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/10"
                  >
                    <User className="h-5 w-5" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <div className="border-t border-white/10">
                  <button
                    onClick={() => {
                      onLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#FF5530] transition-all hover:bg-[#FF5530]/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-[52px] gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide md:hidden">
        <button
          onClick={() => onViewChange('home')}
          className={`flex items-center gap-2 whitespace-nowrap rounded px-4 py-2 transition-all ${currentView === 'home'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <Home className="h-4 w-4" />
          Home
        </button>
        <button
          onClick={() => onViewChange('courses')}
          className={`flex items-center gap-2 whitespace-nowrap rounded px-4 py-2 transition-all ${currentView === 'courses'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <BookOpen className="h-4 w-4" />
          Courses
        </button>
        <button
          onClick={() => onViewChange('reels')}
          className={`flex items-center gap-2 whitespace-nowrap rounded px-4 py-2 transition-all ${currentView === 'reels'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <Film className="h-4 w-4" />
          Reels
        </button>
        <button
          onClick={() => onViewChange('my-learning')}
          className={`flex items-center gap-2 whitespace-nowrap rounded px-4 py-2 transition-all ${currentView === 'my-learning'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <GraduationCap className="h-4 w-4" />
          My List
        </button>
        {profile.role === 'admin' && (
          <button
            onClick={() => onViewChange('admin')}
            className={`flex items-center gap-2 whitespace-nowrap rounded px-4 py-2 transition-all ${currentView === 'admin'
              ? 'bg-[#FF5530] text-white'
              : 'bg-[#002147]/50 text-gray-300'
              }`}
          >
            <Settings className="h-4 w-4" />
            Admin
          </button>
        )}
      </div>
    </header>
  );
}
