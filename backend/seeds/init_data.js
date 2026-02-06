/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  await knex('order_opinions').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('products').del();
  await knex('refresh_tokens').del();
  await knex('users').del();
  await knex('order_status').del();
  await knex('categories').del();

  await knex('order_status').insert([
    { status_id: 1, status_name: "NIEZATWIERDZONE" },
    { status_id: 2, status_name: "ZATWIERDZONE" },
    { status_id: 4, status_name: "ZREALIZOWANE" },
    { status_id: 3, status_name: "ANULOWANE" }
  ]);
  
  await knex.raw("SELECT setval('order_status_status_id_seq', (SELECT MAX(status_id) FROM order_status))");

  await knex('categories').insert([
    { category_id: 1, category_name: "Elektronika" },
    { category_id: 2, category_name: "Książki" },
    { category_id: 3, category_name: "Odzież" },
    { category_id: 4, category_name: "Artykuły spożywcze" },
    { category_id: 5, category_name: "Narzędzia" }
  ]);

  await knex.raw("SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories))");

  const hashedPassword = await bcrypt.hash('12345', 10);
  await knex('users').insert([
    { username: 'admin', password: hashedPassword, role: 'PRACOWNIK' },
    { username: 'klient', password: hashedPassword, role: 'KLIENT' }
  ]);

  await knex('products').insert([
    {
        "category_id": 3,
        "product_name": "T-shirt Bawełniany M",
        "description": "100% bawełna, kolor czarny.",
        "price": 39.9,
        "weight": 0.2
    },
    {
        "category_id": 3,
        "product_name": "Jeansy Slim Fit",
        "description": "Modny krój, wysoka jakość.",
        "price": 189.99,
        "weight": 0.75
    },
    {
        "category_id": 3,
        "product_name": "Kurtka Przeciwdeszczowa L",
        "description": "Lekka, wodoodporna, kolor niebieski.",
        "price": 249.0,
        "weight": 0.6
    },
    {
        "category_id": 3,
        "product_name": "Skarpetki (3-pak)",
        "description": "Wygodne i trwałe.",
        "price": 19.99,
        "weight": 0.1
    },
    {
        "category_id": 4,
        "product_name": "Kawa ziarnista 1kg",
        "description": "Arabica 100%, intensywny smak.",
        "price": 65.0,
        "weight": 1.0
    },
    {
        "category_id": 4,
        "product_name": "Herbata zielona (50 torebek)",
        "description": "Delikatna i aromatyczna.",
        "price": 24.5,
        "weight": 0.15
    },
    {
        "category_id": 5,
        "product_name": "Zestaw wkrętaków precyzyjnych",
        "description": "Do drobnych napraw RTV.",
        "price": 89.0,
        "weight": 0.3
    },
    {
        "category_id": 5,
        "product_name": "Młotek 500g",
        "description": "Wytrzymały, trzonek drewniany.",
        "price": 49.99,
        "weight": 0.5
    },
    {
        "category_id": 1,
        "product_name": "Słuchawki Bezprzewodowe",
        "description": "Podstawowy opis produktu Słuchawki Bezprzewodowe.",
        "price": 599.99,
        "weight": 0.05
    },
    {
        "category_id": 1,
        "product_name": "Powerbank 20000mAh",
        "description": "Podstawowy opis produktu Powerbank 20000mAh.",
        "price": 129.0,
        "weight": 0.4
    },
    {
        "category_id": 1,
        "product_name": "Laptop UltraBook",
        "description": "Podstawowy opis produktu Laptop UltraBook.",
        "price": 4850.5,
        "weight": 1.25
    },
    {
        "category_id": 2,
        "product_name": "PostgreSQL dla Początkujących",
        "description": "Podstawowy opis produktu PostgreSQL dla Początkujących.",
        "price": 79.5,
        "weight": 0.35
    },
    {
        "category_id": 2,
        "product_name": "Fantastyka: Nowy Świat",
        "description": "Podstawowy opis produktu Fantastyka: Nowy Świat. (SEO do wygenerowania).",
        "price": 1.0,
        "weight": 1.0
    },
    {
        "category_id": 2,
        "product_name": "Atlas Świata",
        "description": "Podstawowy opis produktu Atlas Świata. (SEO do wygenerowania).",
        "price": 120.0,
        "weight": 1.8
    }
  ]);
};