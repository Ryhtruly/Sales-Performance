import axios from 'axios';

const BASE = 'http://localhost:5000/api';

export const fetchTicker = (params: any = {}) => axios.get(`${BASE}/ticker`, { params }).then(r => r.data);
export const fetchKpi = (params: any = {}) => axios.get(`${BASE}/kpi`, { params }).then(r => r.data);
export const fetchSales = (params: any = {}) => axios.get(`${BASE}/sales`, { params }).then(r => r.data);
export const fetchProducts = (params: any = {}) => axios.get(`${BASE}/products`, { params }).then(r => r.data);

export type TickerData = {
  gross_sales: number;
  gross_profit: number;
  avg_delivery_days: number;
  total_shipping: number;
};

export type KpiRow = {
  segment: string;
  total_sales: number;
  total_profit: number;
  profit_margin: number;
  avg_delivery_days: number;
  total_shipping_cost: number;
};

export type SalesRow = {
  ord_year: number;
  ord_month: number;
  market: string;
  total_sales: number;
  total_profit: number;
};

export type ProductRow = {
  category_name: string;
  avg_discount: number;
  total_profit: number;
  total_sales: number;
};
