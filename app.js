var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sqlite3 = require('sqlite3').verbose();

// 建立數據庫連接
const dbPath = path.join(__dirname, 'db', 'sqlite.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('數據庫連接失敗:', err.message);
    } else {
        console.log('成功連接到數據庫');
    }
});

// 將數據庫連接添加到 app 對象中，使其可以在路由中使用
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// 將數據庫連接添加到 app 對象中
app.locals.db = db;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// API 路由：獲取所有市場價格數據
app.get('/api/prices', (req, res) => {
    db.all('SELECT * FROM market_prices ORDER BY date ASC', [], (err, rows) => {
        if (err) {
            console.error('查詢數據時發生錯誤:', err.message);
            return res.status(500).json({
                error: '內部伺服器錯誤',
                message: err.message
            });
        }
        res.json(rows);
    });
});

// API 路由：根據日期範圍獲取市場價格數據
app.get('/api/prices/date/:date', (req, res) => {
    const date = req.params.date;
    db.all('SELECT * FROM market_prices WHERE date = ?', [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API 路由：根據日期範圍查詢市場價格數據
app.get('/api/prices/range', (req, res) => {
    const startDate = req.query.start;
    const endDate = req.query.end;

    if (!startDate || !endDate) {
        return res.status(400).json({
            error: '必須提供起始和結束日期'
        });
    }

    const sql = `
        SELECT * FROM market_prices 
        WHERE date >= ? AND date <= ? 
        ORDER BY date ASC, market ASC
    `;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error('查詢數據時發生錯誤:', err.message);
            return res.status(500).json({
                error: '內部伺服器錯誤',
                message: err.message
            });
        }
        res.json(rows);
    });
});

// API 路由：插入新的市場價格數據
app.post('/api/insert', (req, res) => {
    const {
        date,
        market,
        product,
        high_price,
        medium_price,
        low_price,
        average_price,
        trading_volume
    } = req.body;

    const created_at = new Date().toISOString();

    const sql = `
        INSERT INTO market_prices (
            date,
            market,
            product,
            high_price,
            medium_price,
            low_price,
            average_price,
            trading_volume,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        date,
        market,
        product,
        high_price,
        medium_price,
        low_price,
        average_price,
        trading_volume,
        created_at
    ], function(err) {
        if (err) {
            console.error('插入數據時發生錯誤:', err.message);
            return res.status(500).json({
                error: '內部伺服器錯誤',
                message: err.message
            });
        }

        res.status(201).json({
            message: '數據插入成功',
            id: this.lastID
        });
    });
});

// API 路由：查詢特定日期的市場價格數據
app.get('/api', (req, res) => {
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({
            error: '必須提供日期參數',
            message: '請使用 /api?date=YYYY-MM-DD 格式進行查詢'
        });
    }

    const sql = 'SELECT * FROM market_prices WHERE date = ? ORDER BY market';

    db.all(sql, [date], (err, rows) => {
        if (err) {
            console.error('查詢數據時發生錯誤:', err.message);
            return res.status(500).json({
                error: '內部伺服器錯誤',
                message: err.message
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: '找不到指定日期的數據'
            });
        }

        res.json(rows);
    });
});

// 在 module.exports 之前添加數據庫關閉處理
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('關閉數據庫時發生錯誤:', err.message);
        } else {
            console.log('數據庫連接已關閉');
        }
        process.exit(0);
    });
});

module.exports = app;
