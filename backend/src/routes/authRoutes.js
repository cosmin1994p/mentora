import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// === PUBLIC ROUTES ===
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);

// === MFA ROUTES ===
// 2FA via email (6-digit codes)
router.post('/mfa/send-code', authController.sendMFACode);                    // Send 6-digit code
router.post('/mfa/verify-code', authController.verifyMFACode);                // Verify code, return JWT
router.post('/mfa/enable-email', authenticateToken, authController.enableEmailMFA); // Enable email 2FA
router.post('/mfa/disable', authenticateToken, authController.disableMFA);    // Disable all 2FA

// TOTP Routes (Google Authenticator)
router.post('/mfa/setup-totp', authenticateToken, authController.setupTOTP);  // Get secret + QR code
router.post('/mfa/verify-totp', authenticateToken, authController.verifyTOTP); // Verify and save
router.post('/mfa/backup-codes', authenticateToken, authController.generateBackupCodes); // New codes

// === OAUTH ROUTES ===
router.get('/oauth/google/url', authController.getGoogleAuthUrl);             // Get OAuth URL
router.post('/oauth/google/callback', authController.googleCallback);         // Handle callback
router.get('/oauth/linkedin/url', authController.getLinkedInAuthUrl);        // Get LinkedIn URL
router.post('/oauth/linkedin/callback', authController.linkedInCallback);    // Handle callback

// === PASSWORD RESET ===
router.post('/forgot-password', authController.sendPasswordResetEmail);       // Send reset email
router.post('/reset-password', authController.resetPassword);                 // Reset with token
router.post('/reset-password-forced', authController.forcedPasswordReset);    // Mandatory first login reset
router.post('/change-password', authenticateToken, authController.changePassword); // Change password

// === PROTECTED ROUTES (require JWT) ===
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/emotion', authenticateToken, authController.updateUserEmotion);
router.put('/tags', authenticateToken, authController.updatePreferredTags);
router.post('/logout', authenticateToken, authController.logout);
router.get('/activity', authenticateToken, authController.getUserActivity);

// === GDPR & PRIVACY ROUTES ===
router.post('/consent', authenticateToken, authController.saveGDPRConsent);   // Save privacy preferences
router.get('/consent', authenticateToken, authController.getGDPRConsent);     // Retrieve preferences
router.post('/data-export', authenticateToken, authController.exportUserData); // GDPR data export
router.post('/delete-account', authenticateToken, authController.deleteAccount); // Account deletion

// === ADMIN PASSWORD RESET ===
router.post('/admin/force-password-reset/:userId', authenticateToken, authController.forcePasswordReset);

export default router;
