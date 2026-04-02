// =====================================================
// API CLIENT - Tous les appels à PostgreSQL
// =====================================================

class APIClient {
    constructor(baseURL = 'http://localhost:5001/api') {
        this.baseURL = baseURL;
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur API');
            }
            
            return data;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // =====================================================
    // UNITÉS
    // =====================================================
    async getVests() {
        return this.request('/vests');
    }

    async getVest(id) {
        return this.request(`/vests/${id}`);
    }

    async getActiveVests() {
        return this.request('/vests/active');
    }

    // =====================================================
    // POSITIONS
    // =====================================================
    async getLatestPositions() {
        return this.request('/positions/latest');
    }

    async getPositionHistory(vestId, limit = 100) {
        return this.request(`/positions/history/${vestId}?limit=${limit}`);
    }

    async getNearbyUnits(lat, lng, radius = 1000) {
        return this.request(`/positions/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    }

    // =====================================================
    // CAPTEURS
    // =====================================================
    async getSensorReadings(vestId, limit = 100) {
        return this.request(`/sensor/readings/${vestId}?limit=${limit}`);
    }

    async addSensorReading(data) {
        return this.request('/sensor/reading', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // =====================================================
    // ALERTES
    // =====================================================
    async getPendingAlerts() {
        return this.request('/alerts/pending');
    }

    async createAlert(data) {
        return this.request('/alerts', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async acknowledgeAlert(alertId) {
        return this.request(`/alerts/${alertId}/acknowledge`, {
            method: 'POST'
        });
    }

    // =====================================================
    // ANALYSE TIMESCALEDB
    // =====================================================
    async getTrends(vestId, options = {}) {
        const { interval = '5 minutes', range = '1 day', sensorType = null } = options;
        let url = `/analytics/trends/${vestId}?interval=${interval}&range=${range}`;
        if (sensorType) url += `&sensorType=${sensorType}`;
        return this.request(url);
    }

    async getAnomalies(vestId, options = {}) {
        const { threshold = 3, range = '1 day' } = options;
        return this.request(`/analytics/anomalies/${vestId}?threshold=${threshold}&range=${range}`);
    }

    async getSummary() {
        return this.request('/analytics/summary');
    }

    // =====================================================
    // DASHBOARD
    // =====================================================
    async getDashboardData() {
        return this.request('/dashboard/data');
    }

    // =====================================================
    // SIMULATION
    // =====================================================
    async startSimulation() {
        return this.request('/simulation/start', { method: 'POST' });
    }

    async stopSimulation() {
        return this.request('/simulation/stop', { method: 'POST' });
    }

    async generateData() {
        return this.request('/simulation/generate', { method: 'POST' });
    }

    // =====================================================
    // ADMIN
    // =====================================================
    async optimizeDatabase() {
        return this.request('/admin/optimize', { method: 'POST' });
    }
}

// Exporter une instance unique
const api = new APIClient();
window.api = api; // Pour utilisation dans la console