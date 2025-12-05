const db = require('../db');
const { StatusCodes } = require('http-status-codes');

const getAllProducts = async (req, res) => {
  try {
    const products = await db('products')
      .join('categories', 'products.category_id', 'categories.category_id')
      .select('products.*', 'categories.category_name');

    res.status(StatusCodes.OK).json(products);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_name, description, price, weight, category_id } = req.body;

    if (!product_name || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Nazwa i opis są wymagane' });
    }

    if (price < 0 || weight <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Cena nie może być ujemna, a waga musi być większa od zera' });
    }


    const newProduct = await db('products')
      .insert({ product_name, description, price, weight, category_id })
      .returning('*'); // returning('*') sprawia, że baza odsyła nam nowo utworzony obiekt (np. z nowym ID)

    res.status(StatusCodes.CREATED).json(newProduct[0]);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db('products')
      .where({ product_id: id })
      .first();
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Produkt nie znaleziony' });
    }
    res.status(StatusCodes.OK).json(product);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, description, price, weight, category_id } = req.body;
    const updatedRows = await db('products')
      .where({ product_id: id })
      .update({ product_name, description, price, weight, category_id });
    if (updatedRows === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Produkt nie znaleziony' });
    }   
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;  
    const deletedRows = await db('products')
        .where({ product_id: id })
        .del();
    if (deletedRows === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Produkt nie znaleziony' });
        }
    res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
}; 

module.exports = {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct
};