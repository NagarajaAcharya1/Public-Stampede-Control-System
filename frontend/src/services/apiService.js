import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = this.getBackendUrl();
    this.setupAxios();
  }

  getBackendUrl() {
    // Try to get from localStorage first
    const stored = localStorage.getItem('backendUrl');
    if (stored) return stored;

    // Auto-detect based on current location
    const { hostname, protocol } = window.location;
    
    // If running on localhost, try common development ports
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // If running on network, try same host with port 5000
    return `${protocol}//${hostname}:5000`;
  }

  setupAxios() {
    // Set default base URL
    axios.defaults.baseURL = this.baseURL;
    
    // Add request interceptor for dynamic URL resolution
    axios.interceptors.request.use((config) => {
      // Always use the current base URL
      config.baseURL = this.getBackendUrl();
      return config;
    });

    // Add response interceptor for error handling
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          console.warn('Backend connection failed, attempting to rediscover...');
          await this.discoverBackend();
          // Retry the original request
          return axios.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  async discoverBackend() {
    const { hostname, protocol } = window.location;
    
    // Generate candidate URLs based on current network
    const candidates = [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      `${protocol}//${hostname}:5000`,
      'http://10.61.190.197:5000',
      'http://192.168.1.44:5000',
      'http://192.168.0.100:5000',
      'http://10.0.0.100:5000',
      'http://172.16.0.100:5000'
    ];

    console.log('🔍 Discovering CrowdPulse backend server...');

    for (const url of candidates) {
      try {
        console.log(`🧪 Testing: ${url}`);
        const response = await fetch(`${url}/api/stats`, {
          method: 'GET',
          timeout: 3000,
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          console.log(`✅ Server found: ${url}`);
          this.baseURL = url;
          localStorage.setItem('backendUrl', url);
          axios.defaults.baseURL = url;
          return url;
        }
      } catch (err) {
        // Continue to next candidate
      }
    }
    
    console.warn('❌ No backend server found');
    return null;
  }

  // API Methods
  async getStats() {
    const response = await axios.get('/api/stats');
    return response.data;
  }

  async getAlerts() {
    const response = await axios.get('/api/alerts');
    return response.data;
  }

  async getAnalytics() {
    const response = await axios.get('/api/analytics');
    return response.data;
  }

  async resolveAlert(id) {
    const response = await axios.patch(`/api/alerts/${id}/resolve`);
    return response.data;
  }

  async login(username, password) {
    const response = await axios.post('/api/auth/login', { username, password });
    return response.data;
  }

  async register(username, password, role = 'Operator') {
    const response = await axios.post('/api/auth/register', { username, password, role });
    return response.data;
  }

  async updateProfile(currentUsername, newUsername, newPassword) {
    const response = await axios.put('/api/auth/profile', {
      currentUsername,
      newUsername,
      newPassword
    });
    return response.data;
  }

  async getZones() {
    const response = await axios.get('/api/zones');
    return response.data;
  }

  async createZone(zone) {
    const response = await axios.post('/api/zones', zone);
    return response.data;
  }

  async deleteZone(id) {
    const response = await axios.delete(`/api/zones/${id}`);
    return response.data;
  }

  async clearAlerts() {
    const response = await axios.delete('/api/alerts');
    return response.data;
  }

  // Get current backend URL
  getCurrentBackendUrl() {
    return this.baseURL;
  }

  // Test connection to current backend
  async testConnection() {
    try {
      await this.getStats();
      return true;
    } catch (err) {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;