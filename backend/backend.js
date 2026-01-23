const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const statusRoutes = require('./src/routes/statusRoutes.js');
const categoryRoutes = require('./src/routes/categoryRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const db = require('./db.js');

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json({ limit: '10mb' })); 
app.use(express.text({ type: 'text/csv', limit: '10mb' }));

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);


app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});