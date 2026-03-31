import axios from 'axios';

const BASE = 'http://localhost:5000/api';

export const fetchTicker = () => axios.get(`${BASE}/ticker`).then(r => r.data);
export const fetchKpi = () => axios.get(`${BASE}/kpi`).then(r => r.data);
export const fetchSales = () => axios.get(`${BASE}/sales`).then(r => r.data);
export const fetchProducts = () => axios.get(`${BASE}/products`).then(r => r.data);

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
