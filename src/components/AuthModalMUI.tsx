import { useState } from 'react';
import { UserProfile } from '../App';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Chip,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Container,
  Paper,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { motion } from 'motion/react';
import { Mail, Lock, User, Sparkles, Briefcase, Heart } from 'lucide-react';

interface AuthModalMUIProps {
  onComplete: (profile: UserProfile, token: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

import { API_BASE_URL } from '../config';

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

export function AuthModalMUI({ onComplete, isOpen, onClose }: AuthModalMUIProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState('');
  const [activityDomain, setActivityDomain] = useState('');
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
        const profile: UserProfile = {
          name: data.user.username,
          email: data.user.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.username}`,
          bio: 'Mentora Student',
          role: data.user.role || 'user',
          initialQuestionnaire: { interests: [], goals: [], experience: 'beginner' },
          dailyMood: undefined,
        };

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
      if (!name || !email || !password || !passwordConfirm) {
        setError('Please complete all fields');
        setLoading(false);
        return;
      }

      if (!interests.length) {
        setError('Please select at least one interest');
        setLoading(false);
        return;
      }

      if (!hobbies.trim()) {
        setError('Please enter your hobbies');
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
          interests,
          hobbies,
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
          initialQuestionnaire: { interests: interests, goals: [], experience: 'beginner' },
          dailyMood: undefined,
        };

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(profile));

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
    setPasswordConfirm('');
    setInterests([]);
    setHobbies('');
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #002147 0%, #002147 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#fff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          pb: 1
        }}
      >
        {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            sx={{ textAlign: 'center', color: '#999', mb: 2 }}
          >
            {mode === 'login'
              ? 'Sign in to Mentora'
              : 'Join our learning community'}
          </Typography>

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(e, newMode) => {
              if (newMode) {
                setMode(newMode);
                resetForm();
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="login" sx={{ color: '#fff' }}>
              Sign In
            </ToggleButton>
            <ToggleButton value="signup" sx={{ color: '#fff' }}>
              Create Account
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* LOGIN FIELDS */}
          {mode === 'login' && (
            <>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                variant="outlined"
                InputProps={{
                  startAdornment: <Mail size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#666',
                    opacity: 1,
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                variant="outlined"
                InputProps={{
                  startAdornment: <Lock size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />
            </>
          )}

          {/* SIGNUP FIELDS */}
          {mode === 'signup' && (
            <>
              <TextField
                fullWidth
                label="Username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="johndoe"
                variant="outlined"
                InputProps={{
                  startAdornment: <User size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                variant="outlined"
                InputProps={{
                  startAdornment: <User size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+40 7..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ACME Corp"
                variant="outlined"
                InputProps={{
                  startAdornment: <Briefcase size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                variant="outlined"
                InputProps={{
                  startAdornment: <Mail size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                variant="outlined"
                InputProps={{
                  startAdornment: <Lock size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                variant="outlined"
                InputProps={{
                  startAdornment: <Lock size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              {/* Interests Selection */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sparkles size={18} />
                  Select Your Interests
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 1,
                    p: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 1,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {INTERESTS.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      onClick={() => toggleInterest(interest)}
                      variant={interests.includes(interest) ? 'filled' : 'outlined'}
                      sx={{
                        backgroundColor: interests.includes(interest) ? '#FF5530' : 'transparent',
                        color: '#fff',
                        borderColor: interests.includes(interest) ? '#FF5530' : 'rgba(255, 255, 255, 0.3)',
                        '&:hover': {
                          borderColor: '#FF5530',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Hobbies"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="e.g., Reading, Coding, Photography"
                variant="outlined"
                InputProps={{
                  startAdornment: <Heart size={20} style={{ marginRight: 12 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF5530',
                    },
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel
                  sx={{
                    color: '#999',
                    '&.Mui-focused': {
                      color: '#FF5530',
                    },
                  }}
                >
                  Activity Domain
                </InputLabel>
                <Select
                  value={activityDomain}
                  onChange={(e) => setActivityDomain(e.target.value)}
                  label="Activity Domain"
                  startAdornment={<Briefcase size={20} style={{ marginRight: 12 }} />}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF5530',
                    },
                    '& .MuiSvgIcon-root': {
                      color: '#999',
                    },
                  }}
                >
                  {ACTIVITY_DOMAINS.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={mode === 'login' ? handleLogin : handleSignup}
          disabled={loading}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #FF5530 0%, #FF5530 100%)',
            color: '#fff',
            fontWeight: 'bold',
            px: 4,
            '&:hover': {
              background: 'linear-gradient(135deg, #FF5530 0%, #FF5530 100%)',
            },
            '&:disabled': {
              opacity: 0.6,
            },
          }}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </DialogActions>

      <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="body2" sx={{ color: '#999' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Button
            size="small"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              resetForm();
            }}
            sx={{ color: '#FF5530', textTransform: 'none', fontWeight: 'bold' }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </Button>
        </Typography>
      </Box>
    </Dialog>
  );
}
