const express = require('express');
const app = express();
require('dotenv').config();

const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const statusRoutes = require('./src/routes/statusRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const db = require('./src/db');

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/status', statusRoutes);
app.use('/categories', categoryRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});