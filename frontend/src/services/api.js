import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getDashboardSummary = async () => (await api.get('/dashboard/summary')).data;
export const getVessels = async () => (await api.get('/vessels')).data;
export const getVesselDetails = async (id) => (await api.get(`/vessels/${id}`)).data;
export const getPorts = async () => (await api.get('/ports')).data;
export const getPortDetails = async (id) => (await api.get(`/ports/${id}`)).data;
export const getWeatherForVessel = async (id) => (await api.get(`/weather/${id}`)).data;
export const getGeopoliticalNews = async () => (await api.get('/news')).data;
export const getRiskPrediction = async (shipmentId) => (await api.get(`/risk/${shipmentId}`)).data;
export const getDelayPrediction = async (shipmentId) => (await api.get(`/delay/${shipmentId}`)).data;
export const getCostPrediction = async (shipmentId) => (await api.get(`/cost/${shipmentId}`)).data;
export const getExplanation = async (shipmentId) => (await api.get(`/explanations/${shipmentId}`)).data;
export const getAlerts = async () => (await api.get('/alerts')).data;
export const optimizeRoutes = async (payload) => (await api.post('/routes/optimize', payload)).data;
export const getGlobalRouteNetwork = async () => (await api.get('/routes/network/global')).data;
export const getModelMetrics = async () => (await api.get('/model/metrics')).data;
export const getSystemHealth = async () => (await api.get('/system/health')).data;
export const runWhatIfScenario = async (payload) => (await api.post('/whatif', payload)).data;
export const getAuditLogs = async () => (await api.get('/audit')).data;

export default api;
