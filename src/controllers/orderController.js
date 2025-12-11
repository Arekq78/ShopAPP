const db = require('../../db');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");

const createOrder = async (req, res) => {
  try {
    const { customer_name, email, phone, products } = req.body;

    // --- 1. Walidacja danych klienta (Puste pola) ---
    const missingFields = [];
    if (!customer_name) missingFields.push('customer_name');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-pol",
          tytul: "Brak wymaganych danych klienta",
          szczegoly: "Wymagane pola dotyczące klienta są puste.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          brakujące_pola: missingFields
        })
      );
    }

    // --- 2. Walidacja formatu telefonu ---
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/niepoprawne-dane",
          tytul: "Niepoprawny format numeru telefonu",
          szczegoly: "Numer telefonu zawiera niedozwolone znaki, jest złej długości (długość numeru musi być od 7 do 14) albo nie zaczyna się od +.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          podany_numer: phone,
          dlugosc_numeru: phone.length
        })
      );
    }

    // --- 3. Walidacja listy produktów (czy lista istnieje) ---
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-produktow",
          tytul: "Puste zamówienie",
          szczegoly: "Zamówienie musi zawierać przynajmniej jeden produkt.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl
        })
      );
    }

    // --- 4. Walidacja ilości produktów (ujemne, zerowe, nieliczbowe) ---
    for (const item of products) {
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          problem.createProblem({
            type: "https://example.com/bledy/niepoprawna-ilosc",
            tytul: "Błędna ilość towaru",
            szczegoly: `Produkt o ID ${item.product_id} ma nieprawidłową ilość (${item.quantity}). Ilość musi być liczbą większą od zera.`,
            status: StatusCodes.BAD_REQUEST,
            instancja: req.originalUrl,
            produkt_id: item.product_id,
            podana_ilosc: item.quantity
          })
        );
      }
    }

    // --- 5. Walidacja istnienia produktów w bazie ---
    // Pobieramy ID wszystkich produktów z requestu
    const requestedProductIds = products.map(p => p.product_id);
    
    // Szukamy ich w bazie
    const foundProducts = await db('products')
      .whereIn('product_id', requestedProductIds)
      .select('product_id', 'price');

    // Sprawdzamy, czy liczba znalezionych równa się liczbie szukanych (unikalnych)
    if (foundProducts.length !== requestedProductIds.length) {
      // Znajdź, którego brakuje, aby dać precyzyjny komunikat
      const foundIds = foundProducts.map(fp => fp.product_id);
      const missingIds = requestedProductIds.filter(id => !foundIds.includes(id));

      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/produkt-nie-istnieje",
          tytul: "Nieznany produkt",
          szczegoly: "Próba zamówienia towarów, których nie ma w bazie danych.",
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          brakujące_id_produktow: missingIds
        })
      );
    }

    // --- TRANSAKCJA (Tworzenie zamówienia) ---
    const result = await db.transaction(async (trx) => {
      // 1. Wstaw nagłówek zamówienia
      // Uwaga: Dla pewności używamy tablicy w destrukturyzacji, bo returning zwraca tablicę
      const [newOrder] = await trx('orders')
        .insert({
          customer_name,
          email,
          phone,
          status_id: 1, // Zakładamy 1 = NIEZATWIERDZONE / NOWE
          order_date: new Date()
        })
        .returning('order_id');

      const orderId = newOrder.order_id || newOrder; // Obsługa różnic w wersjach knex/pg

      // 2. Wstaw pozycje zamówienia
      // Mapujemy foundProducts dla szybkiego dostępu do ceny
      const priceMap = {};
      foundProducts.forEach(fp => {
        priceMap[fp.product_id] = fp.price;
      });

      const orderItems = products.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        list_price: priceMap[item.product_id] // Cena z momentu zakupu
      }));

      await trx('order_items').insert(orderItems);

      return orderId;
    });

    res.status(StatusCodes.CREATED).json({
      message: 'Zamówienie złożone pomyślnie',
      order_id: result
    });

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


const getOrders = async (req, res) => {
  try {
    const orders = await db('orders')
      .join('order_status', 'orders.status_id', 'order_status.status_id')
      .select('orders.*', 'order_status.status_name');
      
    res.status(StatusCodes.OK).json(orders);
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