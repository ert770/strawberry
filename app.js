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
