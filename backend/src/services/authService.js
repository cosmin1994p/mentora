import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

class AuthService {
  /**
   * Generate TOTP secret for authenticator apps (Google Authenticator, Authy)
   */
  static generateTOTPSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `Mentora (${email})`,
      issuer: 'Mentora',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }

  /**
   * Generate QR code from TOTP secret
   */
  static async generateQRCode(otpauthUrl) {
    try {
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      return qrCode;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyTOTP(secret, token) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 30 second window on either side
      });

      return verified;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA recovery
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Send verification code via email
   */
  static async sendEmailMFA(email, code) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mentora - Verification Code',
      html: `
        <h2>Two-Factor Authentication</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #FF6B35; font-size: 32px; letter-spacing: 5px;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email MFA send failed:', error);
      throw error;
    }
  }

  /**
   * Generate random verification code for email/SMS
   */
  static generateVerificationCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * 10));
    }
    return code;
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const strength = Object.values(requirements).filter(v => v).length;

    return {
      isValid: Object.values(requirements).every(v => v),
      strength: strength,
      requirements: requirements,
      message: strength < 3 ? 'Password too weak' : 'Password is strong'
    };
  }

  /**
   * Hash password
   */
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   */
  static async comparePassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateJWT(userId, expiresIn = '24h') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyJWT(token) {
    const jwt = require('jsonwebtoken');
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return {
      token: token,
      hashed: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
  }
}

export default AuthService;
