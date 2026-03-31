# 📊 Sales Performance Dashboard

> Hệ thống quản lý và phân tích hiệu suất bán hàng — Đồ án môn Phát triển Hệ thống Thông tin Quản lý  
> Học viện Công nghệ Bưu chính Viễn thông — Nhóm 4

---

## 🖥️ Demo

![Dashboard Overview](https://i.imgur.com/placeholder.png)

| Tab | Nội dung |
|---|---|
| **Tổng quan** | KPI cards, Line Chart xu hướng, Bar Chart thị trường, Scatter chiết khấu |
| **Sản phẩm** | Bar Chart theo sub-category, Gauge phân tích discount |
| **Chỉ số KPI** | Cross-tabulation Segment, Gauge biên lợi nhuận & thời gian giao hàng |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────┐     HTTP/REST     ┌──────────────────────┐     SQL      ┌──────────────┐
│  Frontend (React)   │ ────────────────▶ │  Backend (Express)   │ ──────────▶ │  PostgreSQL  │
│  localhost:5173     │ ◀──────────────── │  localhost:5000      │ ◀────────── │  Port 5432   │
└─────────────────────┘       JSON        └──────────────────────┘             └──────────────┘
```

## 🛠️ Công nghệ sử dụng

**Backend**
- Node.js 22 + Express.js 4
- PostgreSQL 18 (via `node-postgres`)
- dotenv — quản lý biến môi trường

**Frontend**
- React 18 + TypeScript 5
- Vite 6 — build tool
- Chart.js 4 + react-chartjs-2 — biểu đồ
- Axios — HTTP client

---

## 📦 Cài đặt và chạy

### Yêu cầu
- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) >= 14

### 1. Clone repository

```bash
git clone https://github.com/Ryhtruly/Sales-Performance.git
cd Sales-Performance
```

### 2. Cấu hình Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
PG_USER=postgres
PG_PASSWORD=your_password_here
PG_HOST=localhost
PG_PORT=5432
```

> ⚠️ File `.env` **không được commit** lên Git. Xem `.env.example` để biết cấu trúc.

### 3. Tạo database và nạp dữ liệu

```bash
# Tạo database trong PostgreSQL trước
# psql -U postgres -c "CREATE DATABASE sales_performance;"

# Nạp toàn bộ dữ liệu CSV vào PostgreSQL (chỉ làm 1 lần)
node import_data.js
```

Khi thấy dòng `Import Complete! All tasks finished successfully.` là xong.

### 4. Cài đặt Frontend

```bash
cd ../frontend
npm install
```

### 5. Khởi động

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
# ✅ Server running on port 5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# ✅ Local: http://localhost:5173/
```

Mở trình duyệt tại **http://localhost:5173** 🎉

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/ticker` | KPI tổng quan: doanh thu, lợi nhuận, giao hàng, vận chuyển |
| GET | `/api/sales` | Doanh thu & lợi nhuận theo tháng và thị trường |
| GET | `/api/products` | Phân tích discount & profit theo sub-category |
| GET | `/api/kpi` | Cross-tabulation KPI theo phân khúc khách hàng |

---

## 🗄️ Cấu trúc Database (3NF)

```
customers ──────────┐
                    ▼
locations ─────▶ orders ──▶ order_details ◀── products ◀── categories
```

6 bảng quan hệ với 5 Foreign Key đảm bảo toàn vẹn dữ liệu.

| Bảng | Số lượng bản ghi |
|---|---|
| customers | 17,415 |
| locations | 3,828 |
| categories | 20 |
| products | 3,788 |
| orders | 25,728 |
| order_details | 51,248 |

---

## 📁 Cấu trúc thư mục

```
Sales-Performance/
├── backend/
│   ├── server.js           # API endpoints (Express)
│   ├── import_data.js      # Script ETL: CSV → PostgreSQL
│   ├── .env.example        # Mẫu cấu hình môi trường
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Component Dashboard chính
│   │   ├── index.css       # Design system
│   │   ├── api.ts          # Axios API calls
│   │   └── chartSetup.ts   # Chart.js config
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 👥 Nhóm thực hiện

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Nguyễn Minh Tú | N22DCCN094 | Data & Backend (Database, API, ETL) |
| Lê Hữu Trí | N22DCCN089 | Nghiệp vụ & Tích hợp (KPI, Cross-tabulation) |
| Nguyễn Đức Vĩ | N22DCCN096 | Frontend & UI/UX (React, Chart.js, CSS) |

---

## 📄 License

MIT License — Free to use for educational purposes.
