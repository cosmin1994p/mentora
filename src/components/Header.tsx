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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation items for tubelight navbar
  const navItems = [
    { name: 'Home', value: 'home', icon: Home },
    { name: 'Courses', value: 'courses', icon: BookOpen },
    { name: 'Reels', value: 'reels', icon: Film },
    { name: 'Speakers', value: 'speakers', icon: GraduationCap },
    { name: 'My Learning', value: 'my-learning', icon: GraduationCap },
    ...(userProfile?.role === 'admin' ? [{ name: 'Admin', value: 'admin', icon: Settings }] : []),
  ];

  // Show loading state if profile is not yet loaded
  if (!userProfile) {
    return (
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#002147]/90 to-transparent transition-all">
        <div className="px-4 md:px-12 py-6 flex items-center justify-between">
          <img src="/logo-header.jpg" alt="Mentora" className="h-10 w-auto object-contain" />
          <div className="w-8 h-8 rounded bg-gray-700 animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#002147]/90 to-transparent transition-all">
      <div className="px-4 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center">
            <img src="/logo-header.jpg" alt="Mentora" className="h-10 w-auto object-contain" />
          </div>

          {/* Desktop Navigation with Tubelight Effect */}
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
            className="text-white hover:text-gray-300 transition-all"
            onClick={onSearchClick}
          >
            <Search className="w-6 h-6" />
          </button>
          <button
            className="text-white hover:text-gray-300 transition-all relative"
            onClick={onNotificationsClick}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF5530] rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="relative group flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded overflow-hidden ring-0 group-hover:ring-2 ring-white transition-all">
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#002147]/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-fadeIn">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{userProfile.name}</p>
                      <p className="text-sm text-gray-400">{userProfile.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${userProfile.role === 'admin'
                        ? 'bg-[#FF5530] text-white'
                        : 'bg-gray-700 text-gray-300'
                        }`}>
                        {userProfile.role === 'admin' ? 'Admin' : 'User'}
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
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all"
                  >
                    <User className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </button>


                </div>

                <div className="border-t border-white/10">
                  <button
                    onClick={() => {
                      onLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#FF5530] hover:bg-[#FF5530]/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onViewChange('home')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-all ${currentView === 'home'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <button
          onClick={() => onViewChange('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-all ${currentView === 'courses'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          Courses
        </button>
        <button
          onClick={() => onViewChange('reels')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-all ${currentView === 'reels'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <Film className="w-4 h-4" />
          Reels
        </button>
        <button
          onClick={() => onViewChange('my-learning')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-all ${currentView === 'my-learning'
            ? 'bg-white text-black'
            : 'bg-[#002147]/50 text-gray-300'
            }`}
        >
          <GraduationCap className="w-4 h-4" />
          My List
        </button>
        {userProfile.role === 'admin' && (
          <button
            onClick={() => onViewChange('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-all ${currentView === 'admin'
              ? 'bg-[#FF5530] text-white'
              : 'bg-[#002147]/50 text-gray-300'
              }`}
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
        )}
      </div>
    </header>
  );
}