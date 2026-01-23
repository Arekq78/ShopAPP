const db = require('../../db');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");

const createOrder = async (req, res) => {
  try {
    const { customer_name, email, phone, products } = req.body;
    const userId = req.user ? req.user.id : null;

    // Walidacja danych klienta (Puste pola)
    const missingFields = [];
    if (!customer_name) missingFields.push('customer_name');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-pol",
          title: "Brak wymaganych danych klienta",
          details: "Wymagane pola dotyczące klienta są puste.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl,
          missing_fields: missingFields
        })
      );
    }

    // Walidacja formatu telefonu
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/niepoprawne-dane",
          title: "Niepoprawny format numeru telefonu",
          details: "Numer telefonu zawiera niedozwolone znaki, jest złej długości (długość numeru musi być od 7 do 14) albo nie zaczyna się od +.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl,
          provided_number: phone,
          number_length: phone.length
        })
      );
    }

    // Walidacja listy produktów (czy lista istnieje)
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-produktow",
          title: "Puste zamówienie",
          details: "Zamówienie musi zawierać przynajmniej jeden produkt.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl
        })
      );
    }

    // Walidacja ilości produktów (ujemne, zerowe, nieliczbowe)
    for (const item of products) {
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          problem.createProblem({
            type: "https://example.com/bledy/niepoprawna-ilosc",
            title: "Błędna ilość towaru",
            details: `Produkt o ID ${item.product_id} ma nieprawidłową ilość (${item.quantity}). Ilość musi być liczbą większą od zera.`,
            status: StatusCodes.BAD_REQUEST,
            instance: req.originalUrl,
            product_id: item.product_id,
            provided_quantity: item.quantity
          })
        );
      }
    }

    // Walidacja istnienia produktów w bazie
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
          title: "Nieznany produkt",
          details: "Próba zamówienia towarów, których nie ma w bazie danych.",
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl,
          missing_product_ids: missingIds
        })
      );
    }

    // TRANSAKCJA (Tworzenie zamówienia)
    const result = await db.transaction(async (trx) => {
      const [newOrder] = await trx('orders')
        .insert({
          user_id: userId,
          customer_name,
          email,
          phone,
          status_id: 1, 
          order_date: new Date()
        })
        .returning('order_id');

      const orderId = newOrder.order_id || newOrder;

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
        title: "Błąd wewnętrzny serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl,
      })
    );
  }
};

const getClientOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await db('orders')
      .join('order_status', 'orders.status_id', 'order_status.status_id')
      .leftJoin('order_opinions', 'orders.order_id', 'order_opinions.order_id') 
      .where({ 'orders.user_id': userId }) 
      .select(
        'orders.*', 
        'order_status.status_name',
        'order_opinions.rating',      
        'order_opinions.content'    
      )
      .orderBy('orders.order_date', 'desc');
      
    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd pobierania historii",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl
      })
    );
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await db('orders')
      .join('order_status', 'orders.status_id', 'order_status.status_id')
      .leftJoin('order_opinions', 'orders.order_id', 'order_opinions.order_id') 
      .select(
          'orders.*', 
          'order_status.status_name',
          'order_opinions.rating',  
          'order_opinions.content'  
      )
      .orderBy('orders.order_date', 'desc');
      
    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd pobierania zamówień",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl
      })
    );
  }
};

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { new_status_id } = req.body;

    try {
        const currentOrder = await db('orders')
            .join('order_status', 'orders.status_id', 'order_status.status_id')
            .where({ 'orders.order_id': id })
            .select('orders.*', 'order_status.status_name') 
            .first();
        
        if (!currentOrder) {
            return res.status(StatusCodes.NOT_FOUND).json(
                problem.createProblem({
                  type: "https://example.com/bledy/nie-znaleziono",
                  title: "Zamówienie nie istnieje",
                  details: `Nie znaleziono zamówienia o ID: ${id}`,
                  status: StatusCodes.NOT_FOUND,
                  instance: req.originalUrl,
                  provided_id: id
                })
            );
        }

        const targetStatus = await db('order_status')
            .where({ status_id: new_status_id })
            .first();

        if (!targetStatus) {
             return res.status(StatusCodes.BAD_REQUEST).json(
                problem.createProblem({
                    type: "https://example.com/bledy/nieznany-status",
                    title: "Nieznany status docelowy",
                    details: `Status o ID ${new_status_id} nie istnieje w bazie.`,
                    status: StatusCodes.BAD_REQUEST,
                    instance: req.originalUrl,
                    provided_id: new_status_id
                })
            );
        }

        if (currentOrder.status_id === 3) {
          return res.status(StatusCodes.BAD_REQUEST).json(
            problem.createProblem({
              type: "https://example.com/bledy/edycja-zablokowana",
              title: "Zamówienie anulowane",
              details: "Nie można zmieniać statusu zamówienia, które zostało już anulowane.",
              status: StatusCodes.BAD_REQUEST,
              instance: req.originalUrl,
              current_status: currentOrder.status_name
            })
          );
        }

        const isRegressive = new_status_id <= currentOrder.status_id;

        if (isRegressive) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                problem.createProblem({
                    type: "https://example.com/bledy/nieprawidlowa-zmiana-statusu",
                    title: "Regresja statusu niedozwolona",
                    details: `Nie można cofnąć statusu zamówienia z ${currentOrder.status_id} na ${new_status_id}.`,
                    status: StatusCodes.BAD_REQUEST,
                    instance: req.originalUrl,
                    current_status: currentOrder.status_name,
                    current_status_id: currentOrder.status_id,
                    suggested_new_status_id: new_status_id
                })
            );
        }

        await db('orders')
            .where({ order_id: id })
            .update({ status_id: new_status_id });

        res.status(StatusCodes.OK).json({ 
            wiadomosc: 'Status zamówienia został zmieniony',
            stary_status: currentOrder.status_name,
            nowy_status: targetStatus.status_name
        });

    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        problem.createProblem({
          type: "https://example.com/bledy/blad-serwera",
          title: "Błąd zmiany statusu",
          details: error.message,
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          instance: req.originalUrl
        })
      );
    }
};

const getAllStatuses = async (req, res) => {
  try {
    const statuses = await db('order_status').select('*');
    res.status(StatusCodes.OK).json(statuses);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        problem.createProblem({
            type: "https://example.com/bledy/blad-serwera",
            title: "Błąd pobierania statusów",
            details: error.message,
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            instance: req.originalUrl
          })
    );
  }
};

const addOrderOpinion = async (req, res) => {
  const { id } = req.params; 
  const { rating, content } = req.body;
  const loggedUserId = req.user.id; 

  try {
    // Walidacja danych wejściowych (Ocena i Treść)
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/nieprawidlowa-ocena",
          title: "Nieprawidłowa ocena",
          details: "Ocena musi być liczbą całkowitą z zakresu 1-5.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl,
          provided_rating: rating
        })
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-tresci",
          title: "Brak treści opinii",
          details: "Treść opinii jest wymagana i nie może być pusta.",
          status: StatusCodes.BAD_REQUEST,
          instance: req.originalUrl
        })
      );
    }

    // Pobranie zamówienia z bazy
    const order = await db('orders').where({ order_id: id }).first();

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/nie-znaleziono",
          title: "Zamówienie nie istnieje",
          details: `Nie znaleziono zamówienia o ID ${id}.`,
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl
        })
      );
    }

    // Weryfikacja właściciela
    // Sprawdzamy, czy ID użytkownika z tokena zgadza się z ID w zamówieniu
    if (order.user_id !== loggedUserId) {
        return res.status(StatusCodes.FORBIDDEN).json(
            problem.createProblem({
                type: "https://example.com/bledy/brak-dostepu",
                title: "Brak uprawnień",
                details: "Możesz dodać opinię tylko do własnych zamówień.",
                status: StatusCodes.FORBIDDEN,
                instance: req.originalUrl
            })
        );
    }

    // Weryfikacja statusu
    // ID: 3 = ANULOWANE, 4 = ZREALIZOWANE
    const ALLOWED_STATUSES = [3, 4];
    
    const targetStatus = await db('order_status')
            .where({ status_id: order.status_id})
            .first();
    
    if (!ALLOWED_STATUSES.includes(order.status_id)) {
        return res.status(StatusCodes.BAD_REQUEST).json(
            problem.createProblem({
                type: "https://example.com/bledy/niedozwolony-status",
                title: "Nie można dodać opinii",
                details: "Opinie można dodawać tylko do zamówień zrealizowanych lub anulowanych.",
                status: StatusCodes.BAD_REQUEST,
                instance: req.originalUrl,
                current_status: targetStatus
            })
        );
    }

    const existingOpinion = await db('order_opinions').where({ order_id: id }).first();
    if (existingOpinion) {
        return res.status(StatusCodes.CONFLICT).json( // 409 Conflict
            problem.createProblem({
                type: "https://example.com/bledy/duplikat-opinii",
                title: "Opinia już istnieje",
                details: "Do tego zamówienia została już dodana opinia.",
                status: StatusCodes.CONFLICT,
                instance: req.originalUrl
            })
        );
    }

    // Dodanie opinii
    await db('order_opinions').insert({
        order_id: id,
        rating: rating,
        content: content
    });

    res.status(StatusCodes.CREATED).json({ 
        message: "Opinia została dodana pomyślnie." 
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd serwera",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl
      })
    );
  }
};

const getOrdersByStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const statusInfo = await db('order_status')
        .where({ status_id: id })
        .first();

    if (!statusInfo) {
      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/nieznany-status",
          title: "Status nie istnieje",
          details: `W bazie nie zdefiniowano statusu o ID: ${id}.`,
          status: StatusCodes.NOT_FOUND,
          instance: req.originalUrl,
          provided_id: id
        })
      );
    }

    const orders = await db('orders')
      .where({ status_id: id })
      .select('*'); 

    res.status(StatusCodes.OK).json(orders);

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd pobierania zamówień",
        details: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instance: req.originalUrl
      })
    );
  }
};

module.exports = { createOrder, getOrders, getClientOrders, updateOrderStatus, getAllStatuses, addOrderOpinion, getOrdersByStatus };