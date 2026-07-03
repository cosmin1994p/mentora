import axios from 'axios';

class OAuthService {
  /**
   * Get Google OAuth URL for login
   */
  static getGoogleAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state: this.generateRandomState()
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Get LinkedIn OAuth URL for login
   */
  static getLinkedInAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state: this.generateRandomState()
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange Google authorization code for tokens
   */
  static async exchangeGoogleCode(code) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
      });

      const { access_token, id_token } = response.data;

      // Verify and decode ID token to get user info
      const userInfo = await this.verifyGoogleIdToken(id_token);

      return {
        provider: 'google',
        providerId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: access_token,
        raw: userInfo
      };
    } catch (error) {
      console.error('Google OAuth exchange failed:', error);
      throw error;
    }
  }

  /**
   * Exchange LinkedIn authorization code for tokens
   */
  static async exchangeLinkedInCode(code) {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI
      });

      const { access_token } = response.data;

      // Fetch user profile from LinkedIn
      const userProfile = await this.getLinkedInUserProfile(access_token);

      return {
        provider: 'linkedin',
        providerId: userProfile.id,
        email: userProfile.email,
        name: userProfile.localizedFirstName + ' ' + userProfile.localizedLastName,
        picture: userProfile.profilePicture?.displayImage,
        accessToken: access_token,
        raw: userProfile
      };
    } catch (error) {
      console.error('LinkedIn OAuth exchange failed:', error);
      throw error;
    }
  }

  /**
   * Verify Google ID token
   */
  static async verifyGoogleIdToken(idToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        params: { id_token: idToken }
      });

      if (!response.data || !response.data.sub) {
        throw new Error('Invalid ID token');
      }

      return response.data;
    } catch (error) {
      console.error('Google ID token verification failed:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn user profile
   */
  static async getLinkedInUserProfile(accessToken) {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Get email separately (requires special scope)
      const emailResponse = await axios.get(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      const email = emailResponse.data.elements[0]['handle~'].emailAddress;

      return {
        id: response.data.id,
        localizedFirstName: response.data.localizedFirstName,
        localizedLastName: response.data.localizedLastName,
        email: email,
        profilePicture: response.data.profilePicture
      };
    } catch (error) {
      console.error('LinkedIn profile fetch failed:', error);
      throw error;
    }
  }

  /**
   * Generate random state for OAuth security
   */
  static generateRandomState() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify OAuth state
   */
  static verifyOAuthState(state, sessionState) {
    return state === sessionState;
  }
}

export default OAuthService;
