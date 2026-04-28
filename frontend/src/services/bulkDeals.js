
import axios from "axios";

const backendPort = import.meta.env.VITE_BACKEND_PORT || "8000";
const API =
    import.meta.env.VITE_API_BASE_EXTERNAL ||
    import.meta.env.VITE_API_BASE_INTERNAL ||
    `http://127.0.0.1:${backendPort}`;

export const fetchBulkDeals = (fromDate, toDate) =>
    axios.get(`${API}/api/bulk-deals`, {
        params: { from_date: fromDate, to_date: toDate },
    });
