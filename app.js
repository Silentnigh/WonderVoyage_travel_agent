require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./config/init');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/client'));

// 404
app.use((req, res) => res.status(404).send('<h2>404 – Page not found</h2><a href="/">Go home</a>'));

// Start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 WonderVoyage running at http://localhost:${PORT}`);
    console.log(`   Admin:  admin@travel.com / admin123`);
    console.log(`   Client: client@travel.com / client123\n`);
  });
}).catch(console.error);
