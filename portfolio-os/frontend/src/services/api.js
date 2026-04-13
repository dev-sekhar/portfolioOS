import axios from "axios";

const API = "http://127.0.0.1:8000";

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
    axios.get(`${API}/build`, { params: { amount, risk, locale } });

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