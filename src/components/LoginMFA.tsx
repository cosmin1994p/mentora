import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginMFA = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('login'); // login | mfa | oauth
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    verificationCode: '',
    useGoogle: false,
    useLinkedIn: false
  });
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.data.requiresMFA) {
        // MFA step required
        setUserId(response.data.userId);
        setStep('mfa');
        setError('Verification code sent to your email');
      } else if (response.data.requiresPasswordReset) {
        // Force password change
        navigate('/reset-password', { state: { userId: response.data.userId } });
      } else {
        // Login successful
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify-mfa', {
        userId,
        code: formData.verificationCode
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const handleLinkedInAuth = () => {
    const clientId = process.env.REACT_APP_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email`;

    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002147] to-[#FF5530] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Mentora</h1>
        <p className="text-center text-gray-600 mb-8">Your Learning Journey Starts Here</p>

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password (min 12 chars: uppercase, lowercase, number, special)
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#B54236] px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <span>🔵</span> Google
            </button>

            <button
              type="button"
              onClick={handleLinkedInAuth}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <span>💼</span> LinkedIn
            </button>

            <p className="text-center text-gray-600 text-sm">
              Don't have an account? <a href="/register" className="text-[#002147] font-semibold hover:underline">Sign up</a>
            </p>
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={handleMFASubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-[#002147]">
                📧 We've sent a 6-digit code to your email. Enter it below to verify your identity.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength="6"
                required
                value={formData.verificationCode}
                onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 text-center mt-2">Code expires in 10 minutes</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#B54236] px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || formData.verificationCode.length !== 6}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => setStep('login')}
              className="w-full text-gray-600 py-2 hover:underline"
            >
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginMFA;
