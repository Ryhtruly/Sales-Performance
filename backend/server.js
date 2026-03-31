const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: 'sales_performance',
});

// 1. KPI Overview: Profit Margin & Avg Delivery Days by Segment
app.get('/api/kpi', async (req, res) => {
  try {
    const kpiQuery = `
      SELECT 
        c.segment, 
        SUM(od.sales) as total_sales,
        SUM(od.profit) as total_profit,
        ROUND((SUM(od.profit) / NULLIF(SUM(od.sales), 0)) * 100, 2) as profit_margin,
        ROUND(AVG(o.ship_date - o.order_date), 1) as avg_delivery_days,
        SUM(od.shipping_cost) as total_shipping_cost
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.ship_date IS NOT NULL AND o.order_date IS NOT NULL
      GROUP BY c.segment
      ORDER BY total_sales DESC;
    `;
    const result = await pool.query(kpiQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Sales & Profit over Time & Market
app.get('/api/sales', async (req, res) => {
  try {
    const salesQuery = `
      SELECT 
        EXTRACT(YEAR FROM o.order_date) as ord_year,
        EXTRACT(MONTH FROM o.order_date) as ord_month,
        l.market,
        SUM(od.sales) as total_sales,
        SUM(od.profit) as total_profit
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      JOIN locations l ON o.location_id = l.location_id
      WHERE o.order_date IS NOT NULL
      GROUP BY ord_year, ord_month, l.market
      ORDER BY ord_year, ord_month;
    `;
    const result = await pool.query(salesQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Product Performance: Discount vs Profit by Category
app.get('/api/products', async (req, res) => {
  try {
    const prodQuery = `
      SELECT 
        cat.category_name,
        AVG(od.discount) as avg_discount,
        SUM(od.profit) as total_profit,
        SUM(od.sales) as total_sales
      FROM order_details od
      JOIN products p ON od.product_id = p.product_id
      JOIN categories cat ON p.category_id = cat.category_id
      GROUP BY cat.category_name
      ORDER BY total_profit DESC;
    `;
    const result = await pool.query(prodQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Overall Ticker KPIs
app.get('/api/ticker', async (req, res) => {
  try {
    const tickerQuery = `
      SELECT 
        SUM(od.sales) as gross_sales,
        SUM(od.profit) as gross_profit,
        ROUND(AVG(o.ship_date - o.order_date), 1) as avg_delivery_days,
        SUM(od.shipping_cost) as total_shipping
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      WHERE o.ship_date IS NOT NULL AND o.order_date IS NOT NULL;
    `;
    const result = await pool.query(tickerQuery);
    res.json(result.rows[0]);
  } catch (err) {
     console.error(err);
     res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
