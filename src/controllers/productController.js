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
          tytul: "Produkt nieznaleziony",
          szczegoly: `Nie znaleziono produktu o identyfikatorze: ${id}`,
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          poszukiwane_id: id
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

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SEO Opis: ${product.product_name}</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f9f9f9;
              }
              .container {
                  background: white;
                  padding: 40px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              .meta { font-size: 0.9em; color: #666; margin-bottom: 20px; }
              h2 { color: #d35400; margin-top: 25px; }
              ul { background: #fdfdfd; padding: 15px 40px; border: 1px solid #eee; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Podgląd opisu SEO</h1>
              <div class="meta">Produkt: <strong>${product.product_name}</strong> | ID: ${id}</div>
              <hr>
              
              ${content}
              
          </div>
      </body>
      </html>
    `;

    res.set('Content-Type', 'text/html');
    res.send(fullHtml);

  } catch (error) {
    const isAxiosError = axios.isAxiosError(error);
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: isAxiosError ? "https://example.com/bledy/blad-api-ai" : "https://example.com/bledy/blad-serwera",
        tytul: isAxiosError ? "Błąd generowania opisu AI" : "Błąd wewnętrzny serwera",
        szczegoly: isAxiosError ? error.response?.data?.error?.message || error.message : error.message,
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
  deleteProduct,
  getSeoDescription
};