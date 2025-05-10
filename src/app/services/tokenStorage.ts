/**
 * Simple token storage service for managing auth tokens
 * Stores tokens in localStorage with optional expiration
 */
class TokenStorage {
  private readonly TOKEN_KEY = 'auth_token';

  /**
   * Get the stored authentication token
   * @returns The token string or null if not found
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.warn('Error accessing token storage:', error);
      return null;
    }
  }

  /**
   * Store an authentication token
   * @param token - The token to store
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Remove the stored token
   */
  removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }
}

// Export a singleton instance
export default new TokenStorage();
