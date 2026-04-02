import React, { useEffect, useState } from 'react';
import './index.css';
import './chartSetup';
import { Line, Bar, Scatter, Doughnut } from 'react-chartjs-2';
import {
  fetchTicker, fetchKpi, fetchSales, fetchProducts
} from './api';
import type { TickerData, KpiRow, SalesRow, ProductRow } from './api';

// ── Helpers ──────────────────────────────────────────────
const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

const fmtM = (n: number) => {
  if (!n && n !== 0) return '$0';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${fmt(n, 2)}`;
};

// ── Base chart options (professional palette) ─────────────
const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false as const,
  plugins: {
    legend: {
      labels: { color: '#374151', font: { size: 11, family: 'Inter' }, boxWidth: 12, padding: 12 },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#cbd5e1',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      ticks: { color: '#9ca3af', font: { size: 10 } },
      grid: { color: '#f3f4f6' },
      border: { color: '#e5e7eb' },
    },
    y: {
      ticks: { color: '#9ca3af', font: { size: 10 } },
      grid: { color: '#f3f4f6' },
      border: { color: '#e5e7eb' },
    },
  },
};

const CHART_COLORS = {
  blue:   { solid: '#1d4ed8', light: 'rgba(29,78,216,0.08)' },
  green:  { solid: '#16a34a', light: 'rgba(22,163,74,0.08)' },
  amber:  { solid: '#d97706', light: 'rgba(217,119,6,0.08)' },
  red:    { solid: '#dc2626', light: 'rgba(220,38,38,0.08)' },
  slate:  { solid: '#475569', light: 'rgba(71,85,105,0.08)' },
  purple: { solid: '#7c3aed', light: 'rgba(124,58,237,0.08)' },
};

// ── Gauge bar ─────────────────────────────────────────────
function GaugeBar({ label, value, max, color, suffix = '%' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  return (
    <div className="gauge-item">
      <div className="gauge-row">
        <span className="gauge-name">{label}</span>
        <span className="gauge-val">{fmt(value, 1)}{suffix}</span>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [kpi,    setKpi]    = useState<KpiRow[]>([]);
  const [sales,  setSales]  = useState<SalesRow[]>([]);
  const [prods,  setProds]  = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'products' | 'kpi'>('overview');
  const [yearFilter, setYearFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = { year: yearFilter, quarter: quarterFilter, month: monthFilter };
    Promise.all([fetchTicker(params), fetchKpi(params), fetchSales(params), fetchProducts(params)])
      .then(([t, k, s, p]) => { 
        setTicker(t); setKpi(k); setSales(s); setProds(p); 
        if (yearFilter === 'all' && quarterFilter === 'all' && monthFilter === 'all' && availableYears.length === 0) {
          setAvailableYears((Array.from(new Set(s.map((r: SalesRow) => String(r.ord_year)))) as string[]).sort());
        }
      })
      .finally(() => setLoading(false));
  }, [yearFilter, quarterFilter, monthFilter]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-text">Đang tải dữ liệu từ cơ sở dữ liệu...</p>
    </div>
  );

  // ── Sales line chart data ──
  const filtered = sales; // We removed client side yearFilter since it's global now
  const MONTHS   = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

  const byMonth: Record<string, { s: number; p: number }> = {};
  for (const r of filtered) {
    const key = `${r.ord_year}-${String(r.ord_month).padStart(2,'0')}`;
    if (!byMonth[key]) byMonth[key] = { s:0, p:0 };
    byMonth[key].s += Number(r.total_sales);
    byMonth[key].p += Number(r.total_profit);
  }
  const sortedKeys = Object.keys(byMonth).sort();
  const lineLabels = sortedKeys.map(k => {
    const [yr, mo] = k.split('-');
    return `${MONTHS[parseInt(mo)-1]} ${yr}`;
  });
  const lineData = {
    labels: lineLabels,
    datasets: [
      { label: 'Doanh thu', data: sortedKeys.map(k => byMonth[k].s),
        borderColor: CHART_COLORS.blue.solid, backgroundColor: CHART_COLORS.blue.light,
        fill: true, tension: 0.35, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
      { label: 'Lợi nhuận', data: sortedKeys.map(k => byMonth[k].p),
        borderColor: CHART_COLORS.green.solid, backgroundColor: CHART_COLORS.green.light,
        fill: true, tension: 0.35, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
    ],
  };

  // ── Market bar chart ──
  const mkMap: Record<string, number> = {};
  for (const r of filtered) {
    if (!mkMap[r.market]) mkMap[r.market] = 0;
    mkMap[r.market] += Number(r.total_sales);
  }
  const mkKeys = Object.keys(mkMap).sort((a,b) => mkMap[b]-mkMap[a]);
  const barPalette = [CHART_COLORS.blue.solid, CHART_COLORS.slate.solid, CHART_COLORS.green.solid,
                      CHART_COLORS.amber.solid, CHART_COLORS.red.solid, CHART_COLORS.purple.solid];
  const marketBar = {
    labels: mkKeys,
    datasets: [{
      label: 'Doanh thu',
      data: mkKeys.map(m => mkMap[m]),
      backgroundColor: mkKeys.map((_, i) => barPalette[i % barPalette.length]),
      borderWidth: 0,
      borderRadius: 4,
    }],
  };

  // ── Scatter discount vs profit ──
  const scatterData = {
    datasets: prods.map((p, i) => ({
      label: p.category_name,
      data: [{ x: Number(p.avg_discount) * 100, y: Number(p.total_profit) / 1000 }],
      backgroundColor: barPalette[i % barPalette.length] + 'cc',
      borderColor: barPalette[i % barPalette.length],
      pointRadius: 12,
      pointHoverRadius: 16,
    })),
  };

  // ── Doughnut segments ──
  const doughnutData = {
    labels: kpi.map(k => k.segment),
    datasets: [{
      data: kpi.map(k => Number(k.total_sales)),
      backgroundColor: [CHART_COLORS.blue.solid, CHART_COLORS.slate.solid, CHART_COLORS.green.solid],
      borderColor: '#ffffff',
      borderWidth: 3,
    }],
  };

  const maxMargin  = Math.max(...kpi.map(k => Number(k.profit_margin)));
  const maxDays    = Math.max(...kpi.map(k => Number(k.avg_delivery_days)));
  const profitMargin = ticker ? (Number(ticker.gross_profit) / Number(ticker.gross_sales)) * 100 : 0;

  const segColor: Record<string,string> = {
    consumer: CHART_COLORS.blue.solid,
    corporate: CHART_COLORS.slate.solid,
    'home office': CHART_COLORS.green.solid,
  };
  const getSegColor = (seg: string) =>
    Object.entries(segColor).find(([k]) => seg?.toLowerCase().includes(k))?.[1] || CHART_COLORS.blue.solid;

  const yFmt = (v: number | string) => fmtM(Number(v));

  const navItems = [
    { id: 'overview', icon: '▦', label: 'Tổng quan' },
    { id: 'products', icon: '☰', label: 'Phân tích Sản phẩm' },
    { id: 'kpi',      icon: '◎', label: 'Chỉ số KPI' },
  ] as const;

  return (
    <div className="app-wrapper">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">SP</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">Sales Performance</div>
            <div className="sidebar-logo-sub">Hệ thống quản lý bán hàng</div>
          </div>
        </div>

        <div className="sidebar-section-label">Danh mục</div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-dot" />
          PostgreSQL · Đang kết nối
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-area">

        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <h2>{tab === 'overview' ? 'Tổng quan doanh thu' : tab === 'products' ? 'Phân tích sản phẩm & danh mục' : 'Chỉ số KPI vận hành'}</h2>
            <p>Cập nhật theo thời gian thực từ cơ sở dữ liệu</p>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '16px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Năm:</label>
              <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quý:</label>
              <select className="filter-select" value={quarterFilter} onChange={e => {
                setQuarterFilter(e.target.value);
                if (e.target.value !== 'all') setMonthFilter('all'); // Reset month if quarter changed
              }}>
                <option value="all">Tất cả</option>
                <option value="1">Quý 1</option>
                <option value="2">Quý 2</option>
                <option value="3">Quý 3</option>
                <option value="4">Quý 4</option>
              </select>

              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tháng:</label>
              <select className="filter-select" value={monthFilter} onChange={e => {
                setMonthFilter(e.target.value);
                if (e.target.value !== 'all') setQuarterFilter('all'); // Reset quarter if month changed
              }}>
                <option value="all">Tất cả</option>
                {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
              </select>
            </div>
            <div className="topbar-badge">
              <span className="topbar-badge-dot" />
              Kết nối thành công
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">

          {/* ── KPI row (always visible) ── */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Tổng doanh thu</span>
                <div className="kpi-card-icon blue">$</div>
              </div>
              <div className="kpi-card-value">{fmtM(ticker ? Number(ticker.gross_sales) : 0)}</div>
              <div className="kpi-card-sub">Tất cả thị trường · tất cả năm</div>
              <div className="kpi-divider blue" />
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Tổng lợi nhuận</span>
                <div className="kpi-card-icon green">↑</div>
              </div>
              <div className="kpi-card-value">{fmtM(ticker ? Number(ticker.gross_profit) : 0)}</div>
              <div className="kpi-card-sub">Biên lợi nhuận: <span className="up">{fmt(profitMargin, 1)}%</span></div>
              <div className="kpi-divider green" />
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Thời gian giao hàng TB</span>
                <div className="kpi-card-icon amber">⏱</div>
              </div>
              <div className="kpi-card-value">{fmt(ticker ? Number(ticker.avg_delivery_days) : 0, 1)} ngày</div>
              <div className="kpi-card-sub">Từ ngày đặt đến ngày giao</div>
              <div className="kpi-divider amber" />
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Chi phí vận chuyển</span>
                <div className="kpi-card-icon red">↓</div>
              </div>
              <div className="kpi-card-value">{fmtM(ticker ? Number(ticker.total_shipping) : 0)}</div>
              <div className="kpi-card-sub">Tổng cộng toàn bộ đơn hàng</div>
              <div className="kpi-divider red" />
            </div>
          </div>

          {/* ══════════ TAB: OVERVIEW ══════════ */}
          {tab === 'overview' && (
            <>
              {/* Line + Doughnut */}
              <div className="chart-row">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Xu hướng Doanh thu & Lợi nhuận theo tháng</div>
                      <div className="card-subtitle">Biểu đồ đường — tổng hợp từ tất cả thị trường</div>
                    </div>
                    <span className="card-tag blue">Line Chart</span>
                  </div>
                  <div className="card-body" style={{ height: 270 }}>
                    <Line data={lineData} options={{
                      ...BASE_OPTS,
                      plugins: { ...BASE_OPTS.plugins, tooltip: { ...BASE_OPTS.plugins.tooltip,
                        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtM(Number(ctx.parsed.y))}` }
                      }},
                      scales: { ...BASE_OPTS.scales, y: { ...BASE_OPTS.scales.y,
                        ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => yFmt(v as number) }
                      }},
                    }} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Phân bổ doanh thu theo Phân khúc</div>
                      <div className="card-subtitle">Consumer / Corporate / Home Office</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ height: 270, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <Doughnut data={doughnutData} options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { color:'#374151', font:{size:11}, boxWidth:12, padding:10 }},
                        tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${fmtM(Number(ctx.parsed))}` }},
                      },
                      cutout: '60%',
                    }} />
                  </div>
                </div>
              </div>

              {/* Bar market + Scatter */}
              <div className="chart-row">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Doanh thu theo Thị trường (Market)</div>
                      <div className="card-subtitle">So sánh doanh thu giữa các khu vực địa lý</div>
                    </div>
                    <span className="card-tag green">Bar Chart</span>
                  </div>
                  <div className="card-body" style={{ height: 240 }}>
                    <Bar data={marketBar} options={{
                      ...BASE_OPTS,
                      plugins: { ...BASE_OPTS.plugins,
                        legend: { display: false },
                        tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => ` Doanh thu: ${fmtM(Number(ctx.parsed.y))}` }},
                      },
                      scales: { ...BASE_OPTS.scales, y: { ...BASE_OPTS.scales.y,
                        ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => yFmt(v as number) }
                      }},
                    }} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Chiết khấu vs Lợi nhuận</div>
                      <div className="card-subtitle">Scatter — ảnh hưởng của Discount đến Profit</div>
                    </div>
                    <span className="card-tag amber">Scatter</span>
                  </div>
                  <div className="card-body" style={{ height: 240 }}>
                    <Scatter data={scatterData} options={{
                      ...BASE_OPTS,
                      scales: {
                        x: { ...BASE_OPTS.scales.x, title: { display:true, text:'Chiết khấu TB (%)', color:'#9ca3af', font:{size:10} }},
                        y: { ...BASE_OPTS.scales.y, title: { display:true, text:'Lợi nhuận (K$)', color:'#9ca3af', font:{size:10} }},
                      },
                    }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════════ TAB: PRODUCTS ══════════ */}
          {tab === 'products' && (
            <>
              <div className="chart-row">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Doanh thu & Lợi nhuận theo Danh mục sản phẩm</div>
                      <div className="card-subtitle">Grouped Bar Chart — so sánh từng sub-category</div>
                    </div>
                    <span className="card-tag blue">Bar Chart</span>
                  </div>
                  <div className="card-body" style={{ height: 300 }}>
                    <Bar data={{
                      labels: prods.map(p => p.category_name),
                      datasets: [
                        { label:'Doanh thu', data: prods.map(p => Number(p.total_sales)),
                          backgroundColor: CHART_COLORS.blue.solid, borderWidth:0, borderRadius:3 },
                        { label:'Lợi nhuận', data: prods.map(p => Number(p.total_profit)),
                          backgroundColor: CHART_COLORS.green.solid, borderWidth:0, borderRadius:3 },
                      ],
                    }} options={{
                      ...BASE_OPTS,
                      scales: { ...BASE_OPTS.scales, y: { ...BASE_OPTS.scales.y,
                        ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => yFmt(v as number) }
                      }},
                    }} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Phân tích Chiết khấu & Lợi nhuận</div>
                      <div className="card-subtitle">Tác động của Discount theo từng danh mục</div>
                    </div>
                    <span className="card-tag amber">Discount Analysis</span>
                  </div>
                  <div className="card-body">
                    <div className="gauge-list">
                      {prods.map((p, i) => (
                        <div key={p.category_name} style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.25rem' }}>
                            <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-heading)' }}>{p.category_name}</span>
                            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                              Discount: {(Number(p.avg_discount)*100).toFixed(1)}% &nbsp;|&nbsp;
                              <span style={{ color: Number(p.total_profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight:700 }}>
                                {fmtM(Number(p.total_profit))}
                              </span>
                            </span>
                          </div>
                          <div className="gauge-track">
                            <div className="gauge-fill" style={{
                              width: `${Math.max(Math.min((Number(p.total_profit)/Math.max(...prods.map(x=>Number(x.total_profit))))*100, 100), 0)}%`,
                              background: barPalette[i % barPalette.length],
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════════ TAB: KPI ══════════ */}
          {tab === 'kpi' && (
            <>
              <div className="chart-row">
                {/* Table */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Bảng KPI theo Phân khúc khách hàng (Cross-tabulation)</div>
                      <div className="card-subtitle">Tổng hợp các chỉ số vận hành theo Segment</div>
                    </div>
                    <span className="card-tag blue">Bảng thống kê</span>
                  </div>
                  <div className="kpi-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Phân khúc</th>
                          <th>Doanh thu</th>
                          <th>Lợi nhuận</th>
                          <th>Tỷ suất LN</th>
                          <th>Giao hàng TB</th>
                          <th>Chi phí VC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpi.map(k => {
                          const seg = k.segment?.toLowerCase() || '';
                          const cls = seg.includes('consumer') ? 'blue' : seg.includes('corporate') ? 'purple' : 'green';
                          const margin = Number(k.profit_margin);
                          return (
                            <tr key={k.segment}>
                              <td><span className={`badge ${cls}`}>{k.segment}</span></td>
                              <td className="bold">{fmtM(Number(k.total_sales))}</td>
                              <td className={Number(k.total_profit) >= 0 ? 'positive' : 'negative'}>
                                {fmtM(Number(k.total_profit))}
                              </td>
                              <td>
                                <span style={{ fontWeight:700,
                                  color: margin >= 10 ? 'var(--success)' : margin >= 0 ? 'var(--warning)' : 'var(--danger)' }}>
                                  {fmt(margin, 2)}%
                                </span>
                              </td>
                              <td>{fmt(Number(k.avg_delivery_days), 1)} ngày</td>
                              <td>{fmtM(Number(k.total_shipping_cost))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gauges */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">KPI Gauge — Tỷ suất Lợi nhuận</div>
                      <div className="card-subtitle">Profit Margin (%) theo từng Segment</div>
                    </div>
                    <span className="card-tag green">KPI</span>
                  </div>
                  <div className="card-body">
                    <div className="gauge-list">
                      {kpi.map(k => (
                        <GaugeBar key={k.segment}
                          label={k.segment}
                          value={Number(k.profit_margin)}
                          max={maxMargin * 1.4}
                          color={getSegColor(k.segment)}
                          suffix="%"
                        />
                      ))}
                    </div>

                    <div style={{ marginTop:'1.5rem', paddingTop:'1.25rem', borderTop:'1px solid var(--border)' }}>
                      <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-heading)', marginBottom:'0.75rem' }}>
                        Tốc độ giao hàng trung bình (ngày)
                      </div>
                      <div className="gauge-list">
                        {kpi.map(k => (
                          <GaugeBar key={k.segment}
                            label={k.segment}
                            value={Number(k.avg_delivery_days)}
                            max={maxDays * 1.3}
                            color={CHART_COLORS.amber.solid}
                            suffix=" ngày"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
