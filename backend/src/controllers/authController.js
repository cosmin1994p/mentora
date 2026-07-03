import User from '../models/User.js';
import Activity from '../models/Activity.js';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  try {
    const { username, email, password, interests = [], activityDomain = '', fullName, phone, companyName } = req.body;

    console.log('[DEBUG REGISTER] Payload received:', { username, email, passwordLength: password ? password.length : 0, interests, activityDomain });

    // Validare
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if trying to register as admin
    const adminUsername = process.env.ADMIN_USERNAME || 'admintudy';
    if (username === adminUsername) {
      return res.status(403).json({ error: 'This username is reserved' });
    }

    // Verifică dacă utilizatorul există
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('[DEBUG REGISTER] Conflict existingUser found:', { id: existingUser._id, username: existingUser.username, email: existingUser.email });
      return res.status(409).json({ error: 'User already exists' });
    }

    // Crează utilizator (password is hashed by pre-save hook)
    const user = new User({
      username,
      email,
      password,
      role: 'user',
      fullName,
      phone,
      companyName,
      interests,
      activityDomain,
      preferredTags: [],
      enrolledCourses: [],
      completedCourses: []
    });

    await user.save();

    // Log activity - wrapped to not fail registration
    try {
      if (typeof Activity.logActivity === 'function') {
        await Activity.logActivity(user._id, 'register', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    } catch (activityError) {
      console.warn('Activity log warning during register:', activityError.message);
    }

    // Generează token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        companyName: user.companyName,
        interests,
        activityDomain
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error.message,
      stack: error.stack
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, username, password, emotion = 'MOTIVATED', energyLevel = 'MEDIUM' } = req.body;

    // Allow login with username (for admin) or email
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    // Find user by email or username and populate package info
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    }).populate('package').populate({ path: 'company', populate: { path: 'package' } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verifică password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Actualizează emoția și energia curente
    user.currentEmotion = emotion;
    user.currentEnergyLevel = energyLevel;
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;

    await user.save();

    // Log activity - wrapped in try-catch to not fail login
    try {
      await Activity.logActivity(user._id, 'login', {
        emotion,
        energyLevel,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (activityError) {
      console.warn('Activity log warning during login:', activityError.message);
    }

    // Determine effective package tier
    let effectivePackageTier = 'Free';
    if (user.company && user.company.package && user.company.package.name) {
      effectivePackageTier = user.company.package.name;
    } else if (user.package && user.package.name) {
      effectivePackageTier = user.package.name;
    }

    // Generează token cu role
    const jwtSecret = process.env.JWT_SECRET || 'streamclass_super_secret_key_2024';
    console.log('[LOGIN] Generating token with secret prefix:', jwtSecret.substring(0, 10));
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, packageTier: effectivePackageTier },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName || user.username,
        phone: user.phone,
        companyName: user.companyName,
        bio: user.bio || '',
        avatar: user.avatar || '',
        currentEmotion: user.currentEmotion,
        currentEnergyLevel: user.currentEnergyLevel,
        packageTier: effectivePackageTier,
        // Include full profile data for frontend
        interests: user.interests || [],
        activityDomain: user.activityDomain || '',
        // Include initialQuestionnaire for profile persistence
        initialQuestionnaire: user.initialQuestionnaire || {
          interests: user.interests || [],
          activityDomain: user.activityDomain || '',
          goals: [],
          experience: 'beginner'
        },
        // Include background
        background: user.background || {
          domain: user.activityDomain || ''
        },
        preferredTags: user.preferredTags,
        enrolledCourses: user.enrolledCourses?.length || 0,
        completedCourses: user.completedCourses?.length || 0,
        loginCount: user.loginCount
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Login error stack:', error.stack);
    console.error('Login error full:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// Admin login endpoint
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME || 'admintudy';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admintudy';

    // Check against environment variables first (before database)
    if (username !== adminUsername) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Try to find admin in database
    let admin = await User.findOne({ username: adminUsername, role: 'admin' });

    // If admin doesn't exist, create it
    if (!admin) {
      admin = await User.ensureAdminExists();
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    // Also check against env variable as fallback
    const isEnvPasswordValid = password === adminPassword;

    if (!isPasswordValid && !isEnvPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Update admin if password matched env but not db
    if (!isPasswordValid && isEnvPasswordValid) {
      admin.password = password; // Will be hashed by pre-save hook
      await admin.save();
    }

    admin.lastLogin = new Date();
    admin.loginCount = (admin.loginCount || 0) + 1;
    await admin.save();

    // Log activity - wrapped in try-catch to not fail login if logging fails
    try {
      await Activity.logActivity(admin._id, 'login', {
        details: { adminLogin: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (activityError) {
      console.warn('Activity log warning during admin login:', activityError.message);
      // Don't fail login if activity logging fails
    }

    const token = jwt.sign(
      { userId: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('enrolledCourses', 'title thumbnail category')
      .populate('completedCourses', 'title thumbnail category')
      .populate('package')
      .populate({ path: 'company', populate: { path: 'package' } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine effective package tier
    let effectivePackageTier = 'Free';
    if (user.company && user.company.package && user.company.package.name) {
      effectivePackageTier = user.company.package.name;
    } else if (user.package && user.package.name) {
      effectivePackageTier = user.package.name;
    }

    // Convert user doc to plain object to inject packageTier safely without mongoose schema errors
    const userObj = user.toObject();
    userObj.packageTier = effectivePackageTier;

    // Update lastLogin to track activity (non-blocking)
    User.findByIdAndUpdate(req.userId, { lastLogin: new Date() }).exec().catch(() => { });

    res.json({
      success: true,
      user: userObj
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateUserEmotion = async (req, res) => {
  try {
    const { emotion, energyLevel } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        currentEmotion: emotion,
        currentEnergyLevel: energyLevel || 'MEDIUM'
      },
      { new: true }
    ).select('-password');

    // Log activity - only if valid values
    if (emotion || energyLevel) {
      try {
        await Activity.logActivity(req.userId, 'mood_change', {
          emotion,
          energyLevel
        });
      } catch (activityError) {
        console.warn('Activity log warning:', activityError.message);
        // Don't fail the request if activity logging fails
      }
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update emotion error:', error);
    res.status(500).json({ error: 'Failed to update emotion' });
  }
};

export const updatePreferredTags = async (req, res) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferredTags: tags },
      { new: true }
    ).select('-password');

    // Log activity
    await Activity.logActivity(req.userId, 'update_preferences', {
      details: { tags }
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
};

export const logout = async (req, res) => {
  try {
    // Log activity
    await Activity.logActivity(req.userId, 'logout', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const activities = await Activity.find({
      user: req.userId
    })
      .sort({ timestamp: -1 })
      .limit(100);

    const summary = await Activity.getUserSummary(req.userId, parseInt(days));

    res.json({
      success: true,
      activities,
      summary
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
};

// ============================================================================
// MFA - Email OTP (6-digit codes)
// ============================================================================

export const sendMFACode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.mfa = user.mfa || {};
    user.mfa.emailCode = code;
    user.mfa.emailCodeExpiry = codeExpiry;
    await user.save();

    // Send email (using nodemailer or similar)
    console.log(`📧 MFA Code for ${email}: ${code}`);
    
    res.json({
      success: true,
      message: 'MFA code sent to email',
      codeExpire: '10 minutes'
    });
  } catch (error) {
    console.error('Send MFA code error:', error);
    res.status(500).json({ error: 'Failed to send MFA code' });
  }
};

export const verifyMFACode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify code
    if (!user.mfa?.emailCode || user.mfa.emailCode !== code) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Check expiry
    if (new Date() > user.mfa.emailCodeExpiry) {
      return res.status(401).json({ error: 'MFA code expired' });
    }

    // Clear code
    user.mfa.emailCode = null;
    user.mfa.emailCodeExpiry = null;
    user.mfa.lastVerifiedAt = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'streamclass_super_secret_key_2024',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      userId: user._id,
      role: user.role
    });
  } catch (error) {
    console.error('Verify MFA code error:', error);
    res.status(500).json({ error: 'Failed to verify MFA code' });
  }
};

export const enableEmailMFA = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.mfa = user.mfa || {};
    user.mfa.enabled = true;
    user.mfa.method = 'email';
    await user.save();

    res.json({
      success: true,
      message: 'Email MFA enabled',
      mfa: { enabled: true, method: 'email' }
    });
  } catch (error) {
    console.error('Enable email MFA error:', error);
    res.status(500).json({ error: 'Failed to enable email MFA' });
  }
};

export const disableMFA = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.mfa = {
      enabled: false,
      method: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      lastVerifiedAt: null
    };
    await user.save();

    res.json({
      success: true,
      message: 'All MFA methods disabled'
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
};

// ============================================================================
// MFA - TOTP (Google Authenticator)
// ============================================================================

export const setupTOTP = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Import speakeasy for TOTP generation
    const speakeasy = await import('speakeasy');
    const QRCode = await import('qrcode');

    const secret = speakeasy.default.generateSecret({
      name: `Mentora (${user.email})`,
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.default.toDataURL(secret.otpauth_url);

    // Store temporary secret (not confirmed yet)
    user.mfa = user.mfa || {};
    user.mfa.tempTotpSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      qrCode,
      manualEntry: secret.otpauth_url
    });
  } catch (error) {
    console.error('Setup TOTP error:', error);
    res.status(500).json({ error: 'Failed to setup TOTP' });
  }
};

export const verifyTOTP = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'TOTP code is required' });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.mfa?.tempTotpSecret) {
      return res.status(400).json({ error: 'TOTP setup not in progress' });
    }

    const speakeasy = await import('speakeasy');

    // Verify code
    const isValid = speakeasy.default.totp.verify({
      secret: user.mfa.tempTotpSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Save TOTP
    user.mfa.enabled = true;
    user.mfa.method = 'totp';
    user.mfa.twoFactorSecret = user.mfa.tempTotpSecret;
    user.mfa.tempTotpSecret = null;
    user.mfa.twoFactorBackupCodes = backupCodes;
    user.mfa.lastVerifiedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'TOTP verified and enabled',
      backupCodes,
      warning: 'Save these backup codes in a safe place'
    });
  } catch (error) {
    console.error('Verify TOTP error:', error);
    res.status(500).json({ error: 'Failed to verify TOTP' });
  }
};

export const generateBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    user.mfa = user.mfa || {};
    user.mfa.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      backupCodes,
      message: 'New backup codes generated'
    });
  } catch (error) {
    console.error('Generate backup codes error:', error);
    res.status(500).json({ error: 'Failed to generate backup codes' });
  }
};

// ============================================================================
// OAuth - Google & LinkedIn
// ============================================================================

export const getGoogleAuthUrl = async (req, res) => {
  try {
    const oauthService = await import('../services/oauthService.js');
    const url = oauthService.default.getGoogleAuthUrl();
    res.json({ url });
  } catch (error) {
    console.error('Get Google auth URL error:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({ error: 'Code and state are required' });
    }

    const oauthService = await import('../services/oauthService.js');
    const googleData = await oauthService.default.exchangeGoogleCode(code, state);

    if (!googleData) {
      return res.status(401).json({ error: 'OAuth verification failed' });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { 'oauth.googleId': googleData.id },
        { email: googleData.email }
      ]
    });

    if (!user) {
      user = new User({
        email: googleData.email,
        username: googleData.email.split('@')[0],
        fullName: googleData.name,
        avatar: googleData.picture,
        oauth: {
          googleId: googleData.id,
          provider: 'google'
        },
        password: require('crypto').randomBytes(16).toString('hex')
      });
    } else {
      user.oauth = user.oauth || {};
      user.oauth.googleId = googleData.id;
      user.oauth.provider = 'google';
    }

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
};

export const getLinkedInAuthUrl = async (req, res) => {
  try {
    const oauthService = await import('../services/oauthService.js');
    const url = oauthService.default.getLinkedInAuthUrl();
    res.json({ url });
  } catch (error) {
    console.error('Get LinkedIn auth URL error:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
};

export const linkedInCallback = async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({ error: 'Code and state are required' });
    }

    const oauthService = await import('../services/oauthService.js');
    const linkedInData = await oauthService.default.exchangeLinkedInCode(code, state);

    if (!linkedInData) {
      return res.status(401).json({ error: 'OAuth verification failed' });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { 'oauth.linkedinId': linkedInData.id },
        { email: linkedInData.email }
      ]
    });

    if (!user) {
      user = new User({
        email: linkedInData.email,
        username: linkedInData.email.split('@')[0],
        fullName: linkedInData.name,
        avatar: linkedInData.picture,
        oauth: {
          linkedinId: linkedInData.id,
          provider: 'linkedin'
        },
        password: require('crypto').randomBytes(16).toString('hex')
      });
    } else {
      user.oauth = user.oauth || {};
      user.oauth.linkedinId = linkedInData.id;
      user.oauth.provider = 'linkedin';
    }

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
};

// ============================================================================
// Password Management
// ============================================================================

export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenHash = require('crypto')
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email with reset link
    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'Password reset link sent to email'
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Hash token
    const tokenHash = require('crypto')
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    // Validate password strength
    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

export const forcedPasswordReset = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    // Enforce complex password rules (min 8 chars, 1 uppercase, 1 symbol)
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])(?=.{8,})");
    if (!strongRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password is not strong enough.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.passwordResetRequired) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }

    user.password = newPassword; // Pre-save hook will hash this
    user.passwordResetRequired = false;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Issue standard JWT token now that they are verified
    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'streamclass_super_secret_key_2024',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Forced password reset error:', error);
    res.status(500).json({ error: 'Failed to force password reset' });
  }
};

export const forcePasswordReset = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.passwordResetRequired = true;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.email} will be required to reset password`
    });
  } catch (error) {
    console.error('Force password reset error:', error);
    res.status(500).json({ error: 'Failed to force password reset' });
  }
};

// ============================================================================
// GDPR & Privacy Consent
// ============================================================================

export const saveGDPRConsent = async (req, res) => {
  try {
    const { gdprConsent, analyticsConsent, cookiesConsent, marketingConsent } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        gdprConsent,
        analyticsConsent,
        cookiesConsent,
        marketingConsent,
        consentUpdatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Consent preferences saved',
      consent: {
        gdprConsent,
        analyticsConsent,
        cookiesConsent,
        marketingConsent
      }
    });
  } catch (error) {
    console.error('Save GDPR consent error:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
};

export const getGDPRConsent = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'gdprConsent analyticsConsent cookiesConsent marketingConsent consentUpdatedAt'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      consent: {
        gdprConsent: user.gdprConsent,
        analyticsConsent: user.analyticsConsent,
        cookiesConsent: user.cookiesConsent,
        marketingConsent: user.marketingConsent,
        updatedAt: user.consentUpdatedAt
      }
    });
  } catch (error) {
    console.error('Get GDPR consent error:', error);
    res.status(500).json({ error: 'Failed to get consent' });
  }
};

export const exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('enrolledCourses')
      .populate('completedCourses');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = {
      profile: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      courses: {
        enrolled: user.enrolledCourses || [],
        completed: user.completedCourses || []
      },
      preferences: {
        preferredTags: user.preferredTags,
        interests: user.interests,
        activityDomain: user.activityDomain
      },
      consent: {
        gdprConsent: user.gdprConsent,
        analyticsConsent: user.analyticsConsent,
        cookiesConsent: user.cookiesConsent,
        marketingConsent: user.marketingConsent
      }
    };

    // Set response headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-${user.email}-${new Date().toISOString()}.json"`
    );

    res.json(userData);
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Soft delete - mark as deleted instead of removing
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.email = `deleted-${user._id}@deleted.com`; // Make email unique again
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
