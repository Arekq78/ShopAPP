const db = require('../db');
const { StatusCodes } = require('http-status-codes');
const problem = require("../../utils/problem")

const getAllProducts = async (req, res) => {
  try {
    const products = await db('products')
      .join('categories', 'products.category_id', 'categories.category_id')
      .select('products.*', 'categories.category_name');

    res.status(StatusCodes.OK).json(products);
  } catch (error) {
    res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd wewnętrzny serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl,
      })
    );
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_name, description, price, weight, category_id } = req.body;

    if (!product_name || !description) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          problem.createProblem({
            type: "https://example.com/bledy/brak-pol",
            tytul: "Brak wymaganych pól",
            szczegoly: "Pola 'product_name' oraz 'description' są wymagane i nie mogą być puste.",
            status: StatusCodes.BAD_REQUEST,
            instancja: req.originalUrl,
            aktualna_nazwa: product_name,
            aktualny_opis: description
          })
        );

    }

    if (price <= 0 || weight <= 0) {
      return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        problem.createProblem({
          type: "https://example.com/bledy/bledne-wartosci",
          tytul: "Błędne wartości pól",
          szczegoly: "Cena oraz waga muszą być większe od zera.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          aktualna_cena: price,
          aktualna_waga: weight
        })
      );
    }

    const newProduct = await db('products')
      .insert({ product_name, description, price, weight, category_id })
      .returning('*');

    res.status(StatusCodes.CREATED).json(newProduct[0]);
  } catch (error) {
    res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd wewnętrzny serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl,
      })
    );
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db('products')
      .where({ product_id: id })
      .first();
    if (!product) {
      return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        problem.createProblem({
          type: "https://example.com/bledy/nie-znaleziono",
          tytul: "Produkt nieznaleziony",
          szczegoly: `Nie znaleziono produktu o identyfikatorze: ${id}`,
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          poszukiwane_id: id
        })
      );
    }
    res.status(StatusCodes.OK).json(product);
  } catch (error) {
    res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd wewnętrzny serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl,
      })
    );
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, description, price, weight, category_id } = req.body;

    const updatedRows = await db('products')
      .where({ product_id: id })
      .update({ product_name, description, price, weight, category_id })
      .returning('*');

    if (updatedRows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/nie-znaleziono",
          tytul: "Produkt nieznaleziony",
          szczegoly: `Nie udało się zaktualizować. Produkt o id ${id} nie istnieje.`,
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          poszukiwane_id: id
        })
      );
    }

    if (!product_name || !description) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          problem.createProblem({
            type: "https://example.com/bledy/brak-pol",
            tytul: "Brak wymaganych pól",
            szczegoly: "Pola 'product_name' oraz 'description' są wymagane i nie mogą być puste.",
            status: StatusCodes.BAD_REQUEST,
            instancja: req.originalUrl,
            aktualna_nazwa: product_name,
            aktualny_opis: description
          })
        );

    }

    if (price <= 0 || weight <= 0) {
      return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        problem.createProblem({
          type: "https://example.com/bledy/bledne-wartosci",
          tytul: "Błędne wartości pól",
          szczegoly: "Cena oraz waga muszą być większe od zera.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          aktualna_cena: price,
          aktualna_waga: weight
        })
      );
    }

    res.status(StatusCodes.OK).json(updatedRows[0]);

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd wewnętrzny serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl,
      })
    );
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;  
    const deletedRows = await db('products')
        .where({ product_id: id })
        .del();

    if (deletedRows === 0) {
        return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          problem.createProblem({
            type: "https://example.com/bledy/nie-znaleziono",
            tytul: "Produkt nieznaleziony",
            szczegoly: `Nie udało się usunąć. Produkt o id ${id} nie istnieje.`,
            status: StatusCodes.NOT_FOUND,
            instancja: req.originalUrl,
            poszukiwane_id: id
        })
      );
    }
    res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
    res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd wewnętrzny serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl,
      })
    );
  }
}; 

module.exports = {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct
};