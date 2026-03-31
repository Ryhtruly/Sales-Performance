const { Client } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const dbName = 'sales_performance';
const defaultDbConfig = {
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'postgres',
};

const targetDbConfig = { ...defaultDbConfig, database: dbName };

async function createDatabase() {
    const client = new Client(defaultDbConfig);
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created successfully.`);
    } else {
        console.log(`Database ${dbName} already exists.`);
    }
    await client.end();
}

async function createTables(client) {
    const schema = `
        DROP TABLE IF EXISTS order_details CASCADE;
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS products CASCADE;
        DROP TABLE IF EXISTS categories CASCADE;
        DROP TABLE IF EXISTS locations CASCADE;
        DROP TABLE IF EXISTS customers CASCADE;

        CREATE TABLE customers (
            customer_id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            segment TEXT
        );

        CREATE TABLE locations (
            location_id TEXT PRIMARY KEY,
            city TEXT,
            state TEXT,
            country TEXT,
            region TEXT,
            market TEXT
        );

        CREATE TABLE categories (
            category_id TEXT PRIMARY KEY,
            category_name TEXT NOT NULL,
            parent_id TEXT
        );

        CREATE TABLE products (
            product_id TEXT PRIMARY KEY,
            product_name TEXT NOT NULL,
            category_id TEXT NOT NULL,
            CONSTRAINT fk_products_category
                FOREIGN KEY (category_id) REFERENCES categories(category_id)
        );

        CREATE TABLE orders (
            order_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            location_id TEXT NOT NULL,
            order_date DATE,
            ship_date DATE,
            ship_mode TEXT,
            order_priority TEXT,
            CONSTRAINT fk_orders_customer
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
            CONSTRAINT fk_orders_location
                FOREIGN KEY (location_id) REFERENCES locations(location_id)
        );

        CREATE TABLE order_details (
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            sales NUMERIC(12,4),
            quantity INTEGER,
            discount NUMERIC(6,4),
            profit NUMERIC(12,4),
            shipping_cost NUMERIC(12,4),
            CONSTRAINT fk_orderdetails_order
                FOREIGN KEY (order_id) REFERENCES orders(order_id),
            CONSTRAINT fk_orderdetails_product
                FOREIGN KEY (product_id) REFERENCES products(product_id)
        );
    `;
    await client.query(schema);
    console.log("Tables created with Primary Keys, Foreign Keys and proper data types.");
}


function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            console.log("Not found:", filePath);
            return resolve([]);
        }
        fs.createReadStream(filePath)
            // Some BOM removals might be needed, let's map keys to remove BOM
            .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\\uFEFF/, '').replace(/^\\xEF\\xBB\\xBF/, '') }))
            .on('data', (data) => {
                // Trim all keys
                const cleanData = {};
                for (let key in data) {
                    cleanData[key.trim()] = data[key];
                }
                results.push(cleanData);
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

const cleanNum = (str) => {
    if (!str) return 0;
    const s = String(str).replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return parseFloat(s) || 0;
};

async function insertData(client) {
    const basePath = '../';

    console.log("Importing Customers...");
    const customers = await parseCSV(basePath + 'Customers.csv');
    for (let c of customers) {
        if (!c.Customer_ID) continue;
        await client.query(`INSERT INTO customers (customer_id, customer_name, segment) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, 
            [c.Customer_ID, c.Customer_Name, c.Segment]);
    }

    console.log("Importing Locations...");
    const locations = await parseCSV(basePath + 'Locations.csv');
    for (let l of locations) {
        if (!l.Location_ID) continue;
        await client.query(`INSERT INTO locations (location_id, city, state, country, region, market) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [String(l.Location_ID), l.City, l.State, l.Country, l.Region, l.Market]);
    }

    console.log("Importing Categories...");
    const categories = await parseCSV(basePath + 'Categories (1).csv');
    for (let c of categories) {
        if (!c.Category_ID) continue;
        await client.query(`INSERT INTO categories (category_id, category_name, parent_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [String(c.Category_ID), c.Category_Name, c.Parent_ID || null]);
    }

    console.log("Importing Products...");
    const products = await parseCSV(basePath + 'Products.csv');
    for (let p of products) {
        if (!p.Product_ID) continue;
        await client.query(`INSERT INTO products (product_id, product_name, category_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [p.Product_ID, p.Product_Name, String(p.Category_ID)]);
    }

    console.log("Importing Orders...");
    const orders = await parseCSV(basePath + 'Orders.csv');
    const parseDate = (str) => {
        if (!str) return null;
        // Hỗ trợ DD-MM-YYYY
        const m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return null;
    };
    for (let o of orders) {
        if (!o.Order_ID) continue;
        await client.query(`INSERT INTO orders (order_id, customer_id, location_id, order_date, ship_date, ship_mode, order_priority) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
            [o.Order_ID, o.Customer_ID, String(o.Location_ID), parseDate(o.Order_Date), parseDate(o.Ship_Date), o.Ship_Mode, o.Order_Priority]);
    }


    console.log("Importing Order Details (Chunked)...");
    const orderDetails = await parseCSV(basePath + 'Order_details.csv');
    
    // Chunk insertion for speed
    const chunkSize = 1000;
    for (let i = 0; i < orderDetails.length; i += chunkSize) {
        const chunk = orderDetails.slice(i, i + chunkSize);
        
        let valueStrings = [];
        let params = [];
        let pIndex = 1;
        
        for (let od of chunk) {
            valueStrings.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
            params.push(
                od.Order_ID || null, 
                od.Product_ID || null, 
                cleanNum(od.Sales), 
                Math.round(cleanNum(od.Quantity)), 
                cleanNum(od.Discount), 
                cleanNum(od.Profit), 
                cleanNum(od.Shipping_Cost)
            );
        }
        
        if (valueStrings.length > 0) {
            const query = `INSERT INTO order_details (order_id, product_id, sales, quantity, discount, profit, shipping_cost) VALUES ${valueStrings.join(', ')}`;
            try {
                await client.query(query, params);
            } catch (e) {
                console.error("Batch insert error:", e.message);
                // Fallback to individual
                for(let od of chunk) {
                   try {
                     await client.query(`INSERT INTO order_details (order_id, product_id, sales, quantity, discount, profit, shipping_cost) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                          [od.Order_ID || null, od.Product_ID || null, cleanNum(od.Sales), Math.round(cleanNum(od.Quantity)), cleanNum(od.Discount), cleanNum(od.Profit), cleanNum(od.Shipping_Cost)]);
                   } catch (err2) {}
                }
            }
        }
    }
    console.log("Import Complete!");
}

async function run() {
    try {
        await createDatabase();
        const client = new Client(targetDbConfig);
        await client.connect();
        await createTables(client);
        await insertData(client);
        await client.end();
        console.log("All tasks finished successfully.");
    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

run();
