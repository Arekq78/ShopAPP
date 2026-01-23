const db = require('../../db');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");
const axios = require('axios');

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
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
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
            title: "Brak wymaganych pól",
            details: "Pola 'product_name' oraz 'description' są wymagane i nie mogą być puste.",
            status: StatusCodes.BAD_REQUEST,
            instance: req.originalUrl,
            product_name: product_name,
            description: description
          })
        );

    }

    if (price <= 0 || weight <= 0) {
      return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        problem.createProblem({
          type: "https://example.com/bledy/bledne-wartosci",
          title: "Błędne wartości pól",
          details: "Cena oraz waga muszą być większe od zera.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl,
          current_price: price,
          current_weight: weight
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
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
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
          title: "Produkt nieznaleziony",
          details: `Nie znaleziono produktu o identyfikatorze: ${id}`,
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl,
          wanted_id: id
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
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
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
          title: "Produkt nieznaleziony",
          details: `Nie udało się zaktualizować. Produkt o id ${id} nie istnieje.`,
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl,
          wanted_id: id
        })
      );
    }

    if (!product_name || !description) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          problem.createProblem({
            type: "https://example.com/bledy/brak-pol",
            title: "Brak wymaganych pól",
            details: "Pola 'product_name' oraz 'description' są wymagane i nie mogą być puste.",
            status: StatusCodes.BAD_REQUEST,
            instance: req.originalUrl,
            current_name: product_name,
            current_description: description
          })
        );

    }

    if (price <= 0 || weight <= 0) {
      return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        problem.createProblem({
          type: "https://example.com/bledy/bledne-wartosci",
          title: "Błędne wartości pól",
          details: "Cena oraz waga muszą być większe od zera.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl,
          current_price: price,
          current_weight: weight
        })
      );
    }

    res.status(StatusCodes.OK).json(updatedRows[0]);

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
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
            title: "Produkt nieznaleziony",
            details: `Nie udało się usunąć. Produkt o id ${id} nie istnieje.`,
            status: StatusCodes.NOT_FOUND,
            instance: req.originalUrl,
            wanted_id: id
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
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
      })
    );
  }
}; 

const getSeoDescription = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db('products')
      .where({ product_id: id })
      .first();

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/nie-znaleziono",
          title: "Produkt nieznaleziony",
          details: `Nie znaleziono produktu o identyfikatorze: ${id}`,
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl,
          wanted_id: id
        })
      );
    }

    const prompt = `
      Jesteś ekspertem SEO i copywriterem.
      Przygotuj atrakcyjny opis produktu w formacie HTML (użyj tagów takich jak <h2>, <p>, <ul>, <li>, <strong>).
      Nie dodawaj znaczników markdown (jak \`\`\`html), zwróć czysty kod HTML.
      Opis ma być zoptymalizowany pod kątem SEO, zachęcający do zakupu i uwzględniać poniższe dane.

      Nazwa produktu: ${product.product_name}
      Kategoria: ${product.category_name}
      Cena: ${product.price} PLN
      Waga: ${product.weight} kg
      Krótki opis techniczny: ${product.description}
    `;

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "Jesteś pomocnym asystentem generującym kod HTML." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let content = groqResponse.data.choices[0]?.message?.content || "";

    content = content.replace(/```html/g, '').replace(/```/g, '');

    res.status(StatusCodes.OK).json({
        product_id: id,
        product_name: product.product_name,
        seo_description_html: content 
    });

  } catch (error) {
    const isAxiosError = axios.isAxiosError(error);
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: isAxiosError ? "https://example.com/bledy/blad-api-ai" : "https://example.com/bledy/blad-serwera",
        title: isAxiosError ? "Błąd generowania opisu AI" : "Błąd wewnętrzny serwera",
        details: isAxiosError ? error.response?.data?.error?.message || error.message : error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
      })
    );
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getSeoDescription
};