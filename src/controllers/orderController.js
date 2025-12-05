const db = require('../db');
const { StatusCodes } = require('http-status-codes');

const createOrder = async (req, res) => {
  const { customer_name, email, phone, products } = req.body;

  if (!products || products.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Zamówienie musi zawierać produkty' });
  }

  try {
    await db.transaction(async (trx) => {
      
      const [newOrder] = await trx('orders')
        .insert({
          customer_name,
          email,
          phone,
          status_id: 1, 
          order_date: new Date() 
        })
        .returning('order_id'); 

      const orderId = newOrder.order_id;
      for (const item of products) {
        const productInfo = await trx('products')
            .where({ product_id: item.product_id })
            .first();

        if (!productInfo) {
           throw new Error(`Produkt o ID ${item.product_id} nie istnieje`);
        }

        await trx('order_items').insert({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          list_price: productInfo.price
        });
      }
    
      res.status(StatusCodes.CREATED).json({ 
          message: 'Zamówienie złożone', 
          order_id: orderId 
      });
    });

  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};


const getOrders = async (req, res) => {
  try {
    const orders = await db('orders')
      .join('order_status', 'orders.status_id', 'order_status.status_id')
      .select('orders.*', 'order_status.status_name');
      
    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { new_status_id } = req.body;

    try {
        const currentOrder = await db('orders').where({ order_id: id }).first();
        
        if (!currentOrder) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'Zamówienie nie istnieje' });
        }

        if (currentOrder.status_id === 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Nie można edytować anulowanego zamówienia!' });
        }

        await db('orders')
            .where({ order_id: id })
            .update({ status_id: new_status_id });

        res.status(StatusCodes.OK).json({ message: 'Status zmieniony' });

    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};


const getAllStatuses = async (req, res) => {
  try {
    const statuses = await db('order_status').select('*');
    res.status(StatusCodes.OK).json(statuses);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

module.exports = { createOrder, getOrders, updateOrderStatus, getAllStatuses };