const db = require('../../db');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");
const { parse } = require('csv-parse/sync'); 

const initProducts = async (req, res) => {
  try {
    const countResult = await db('products1').count('product_id as count').first();
    const count = parseInt(countResult.count, 10);

    if (count > 0) {
      return res.status(StatusCodes.CONFLICT).json(
        problem.createProblem({
          type: "https://example.com/bledy/baza-nie-pusta",
          title: "Baza danych nie jest pusta",
          details: "Inicjalizacja niemożliwa. W bazie znajdują się już produkty.",
          status: StatusCodes.CONFLICT,
          instance: req.originalUrl,
          number_of_products: count
        })
      );
    }

    // DETEKCJA I PARSOWANIE DANYCH
    const contentType = req.headers['content-type'];
    let productsToInsert = [];

    if (contentType === 'application/json') {
      productsToInsert = req.body;
      
      if (!Array.isArray(productsToInsert)) {
         return res.status(StatusCodes.BAD_REQUEST).json(
            problem.createProblem({
               type: "https://example.com/bledy/nieprawidlowy-format",
               title: "Nieprawidłowy format danych",
               details: "Przesłane dane JSON muszą być tablicą (listą) obiektów, nawet jeśli przesyłasz tylko jeden produkt.",
               status: StatusCodes.BAD_REQUEST,
               instance: req.originalUrl,
               tip: "Upewnij się, że dane są objęte nawiasami kwadratowymi [ ... ]."
            })
         );
      }

    } else if (contentType === 'text/csv') {
      try {
        productsToInsert = parse(req.body, { 
          columns: true, 
          skip_empty_lines: true,
          trim: true 
        });
        
        // CSV często wczytuje liczby jako stringi, trzeba je przekonwertować
        productsToInsert = productsToInsert.map(p => ({
            ...p,
            price: parseFloat(p.price),
            weight: parseFloat(p.weight),
            category_id: parseInt(p.category_id, 10)
        }));

      } catch (err) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          problem.createProblem({
            type: "https://example.com/bledy/niepoprawny-csv",
            title: "Błąd parsowania CSV",
            details: "Przesłany plik CSV ma niepoprawny format.",
            status: StatusCodes.BAD_REQUEST,
            instance: req.originalUrl
          })
        );
      }
    } else {
      return res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE).json(
        problem.createProblem({
            type: "https://example.com/bledy/nieobsługiwany-format",
            title: "Nieobsługiwany format danych",
            details: "Obsługiwane formaty to application/json lub text/csv.",
            status: StatusCodes.UNSUPPORTED_MEDIA_TYPE,
            instance: req.originalUrl
        })
      );
    }

    // WALIDACJA KATEGORII
    const categoryIds = [...new Set(productsToInsert.map(p => p.category_id))];
    
    const existingCategories = await db('categories')
        .whereIn('category_id', categoryIds)
        .select('category_id');
        
    const existingIds = existingCategories.map(c => c.category_id);
    
    const missingCategories = categoryIds.filter(id => !existingIds.includes(id));

    if (missingCategories.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json(
            problem.createProblem({
                type: "https://example.com/bledy/nieznana-kategoria",
                title: "Nieznane kategorie",
                details: "Nie można dodać produktów przypisanych do nieistniejących kategorii.",
                status: StatusCodes.BAD_REQUEST,
                instance: req.originalUrl,
                missing_categorie_id: missingCategories
            })
        );
    }

    // TRANSKACJA I ZAPIS
    await db.transaction(async (trx) => {
        // Mapowanie danych na strukturę bazy (żeby nie wrzucić śmieci z CSV)
        const cleanData = productsToInsert.map(p => ({
            product_name: p.product_name,
            description: p.description,
            price: p.price,
            weight: p.weight,
            category_id: p.category_id
        }));

        await trx('products1').insert(cleanData);
    });

    res.status(StatusCodes.OK).json({ 
        message: "Inicjalizacja zakończona sukcesem.", 
        added_count: productsToInsert.length 
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

module.exports = { initProducts };