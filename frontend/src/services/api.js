import axios from "axios";

const backendPort = import.meta.env.VITE_BACKEND_PORT || "8000";
const API =
    import.meta.env.VITE_API_BASE_EXTERNAL ||
    import.meta.env.VITE_API_BASE_INTERNAL ||
    `http://127.0.0.1:${backendPort}`;

export const addStock = (data) =>
    axios.post(`${API}/add`, data);

export const getStocks = (ownerEmail) =>
    axios.get(`${API}/portfolio`, { params: { owner_email: ownerEmail } });

export const deleteStock = (stockId, ownerEmail) =>
    axios.delete(`${API}/portfolio/${stockId}`, { params: { owner_email: ownerEmail } });

export const deleteStocks = (ids, ownerEmail) =>
    axios.delete(`${API}/portfolio`, {
        data: { ids },
        params: { owner_email: ownerEmail },
    });

export const analyzePortfolio = (params, ownerEmail) =>
    axios.get(`${API}/analyze`, { params: { ...params, owner_email: ownerEmail } });

export const buildPortfolio = (amount, risk, locale) =>
    axios.get(`${API}/build`, {
        params: { amount, risk, locale },
        timeout: 15000,
    });

export const fetchStockPrice = (symbol, market) =>
    axios.get(`${API}/price/${encodeURIComponent(symbol)}`, { params: { market } });

export const searchStockSymbols = (query, market, limit = 8) =>
    axios.get(`${API}/symbol-search`, { params: { query, market, limit } });

export const fetchArbitrageSnapshot = (symbolsCsv, threshold) => {
    const params = { threshold };
    if (symbolsCsv && symbolsCsv.trim().length > 0) {
        params.symbols = symbolsCsv;
    }
    return axios.get(`${API}/arbitrage`, { params });
};

export const fetchHistory = (symbol, period = "5y") =>
    axios.get(`${API}/history/${encodeURIComponent(symbol)}`, { params: { period } });

export const getSettings = (ownerEmail) =>
    axios.get(`${API}/settings`, { params: { owner_email: ownerEmail } });

export const updateSettings = (ownerEmail, settings) =>
    axios.post(`${API}/settings`, settings, { params: { owner_email: ownerEmail } });

export const fetchEodPerformance = (ownerEmail, startDate, endDate) => {
    const params = { owner_email: ownerEmail };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return axios.get(`${API}/eod-performance`, { params });
};

export const generateShadowStrategy = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post(`${API}/api/shadow-strategy`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const autoFetchShadowStrategy = () => {
    return axios.post(`${API}/api/shadow-strategy/auto-fetch`);
};