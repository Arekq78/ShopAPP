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
          tytul: "Brak wymaganych danych klienta",
          szczegoly: "Wymagane pola dotyczące klienta są puste.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          brakujące_pola: missingFields
        })
      );
    }

    // Walidacja formatu telefonu
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

    // Walidacja listy produktów (czy lista istnieje)
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

    // Walidacja ilości produktów (ujemne, zerowe, nieliczbowe)
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
          tytul: "Nieznany produkt",
          szczegoly: "Próba zamówienia towarów, których nie ma w bazie danych.",
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          brakujące_id_produktow: missingIds
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
        tytul: "Błąd pobierania zamówień",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl
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
                  tytul: "Zamówienie nie istnieje",
                  szczegoly: `Nie znaleziono zamówienia o ID: ${id}`,
                  status: StatusCodes.NOT_FOUND,
                  instancja: req.originalUrl,
                  poszukiwane_id: id
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
                    tytul: "Nieznany status docelowy",
                    szczegoly: `Status o ID ${new_status_id} nie istnieje w bazie.`,
                    status: StatusCodes.BAD_REQUEST,
                    instancja: req.originalUrl,
                    podane_id: new_status_id
                })
            );
        }

        if (currentOrder.status_id === 3) {
          return res.status(StatusCodes.BAD_REQUEST).json(
            problem.createProblem({
              type: "https://example.com/bledy/edycja-zablokowana",
              tytul: "Zamówienie anulowane",
              szczegoly: "Nie można zmieniać statusu zamówienia, które zostało już anulowane.",
              status: StatusCodes.BAD_REQUEST,
              instancja: req.originalUrl,
              obecny_status: currentOrder.status_name
            })
          );
        }

        const isRegressive = new_status_id <= currentOrder.status_id;

        if (isRegressive) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                problem.createProblem({
                    type: "https://example.com/bledy/nieprawidlowa-zmiana-statusu",
                    tytul: "Regresja statusu niedozwolona",
                    szczegoly: `Nie można cofnąć statusu zamówienia z ${currentOrder.status_id} na ${new_status_id}.`,
                    status: StatusCodes.BAD_REQUEST,
                    instancja: req.originalUrl,
                    obecny_status: currentOrder.status_name,
                    obecny_status_id: currentOrder.status_id,
                    proponowany_status_id: new_status_id
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
          tytul: "Błąd zmiany statusu",
          szczegoly: error.message,
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          instancja: req.originalUrl
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
            tytul: "Błąd pobierania statusów",
            szczegoly: error.message,
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            instancja: req.originalUrl
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
          tytul: "Nieprawidłowa ocena",
          szczegoly: "Ocena musi być liczbą całkowitą z zakresu 1-5.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl,
          podana_ocena: rating
        })
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        problem.createProblem({
          type: "https://example.com/bledy/brak-tresci",
          tytul: "Brak treści opinii",
          szczegoly: "Treść opinii jest wymagana i nie może być pusta.",
          status: StatusCodes.BAD_REQUEST,
          instancja: req.originalUrl
        })
      );
    }

    // Pobranie zamówienia z bazy
    const order = await db('orders').where({ order_id: id }).first();

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json(
        problem.createProblem({
          type: "https://example.com/bledy/nie-znaleziono",
          tytul: "Zamówienie nie istnieje",
          szczegoly: `Nie znaleziono zamówienia o ID ${id}.`,
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl
        })
      );
    }

    // Weryfikacja właściciela
    // Sprawdzamy, czy ID użytkownika z tokena zgadza się z ID w zamówieniu
    if (order.user_id !== loggedUserId) {
        return res.status(StatusCodes.FORBIDDEN).json(
            problem.createProblem({
                type: "https://example.com/bledy/brak-dostepu",
                tytul: "Brak uprawnień",
                szczegoly: "Możesz dodać opinię tylko do własnych zamówień.",
                status: StatusCodes.FORBIDDEN,
                instancja: req.originalUrl
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
                tytul: "Nie można dodać opinii",
                szczegoly: "Opinie można dodawać tylko do zamówień zrealizowanych lub anulowanych.",
                status: StatusCodes.BAD_REQUEST,
                instancja: req.originalUrl,
                obecny_status: targetStatus
            })
        );
    }

    const existingOpinion = await db('order_opinions').where({ order_id: id }).first();
    if (existingOpinion) {
        return res.status(StatusCodes.CONFLICT).json( // 409 Conflict
            problem.createProblem({
                type: "https://example.com/bledy/duplikat-opinii",
                tytul: "Opinia już istnieje",
                szczegoly: "Do tego zamówienia została już dodana opinia.",
                status: StatusCodes.CONFLICT,
                instancja: req.originalUrl
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
        tytul: "Błąd serwera",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl
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
          tytul: "Status nie istnieje",
          szczegoly: `W bazie nie zdefiniowano statusu o ID: ${id}.`,
          status: StatusCodes.NOT_FOUND,
          instancja: req.originalUrl,
          poszukiwane_id: id
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
        tytul: "Błąd pobierania zamówień",
        szczegoly: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        instancja: req.originalUrl
      })
    );
  }
};

module.exports = { createOrder, getOrders, updateOrderStatus, getAllStatuses, addOrderOpinion, getOrdersByStatus };