/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // 1. Tabela Categories
    .createTable('categories', (table) => {
      table.increments('category_id').primary();
      table.text('category_name').notNullable();
    })
    // 2. Tabela Order Status
    .createTable('order_status', (table) => {
      table.increments('status_id').primary();
      table.text('status_name').notNullable();
    })
    // 3. Tabela Users
    .createTable('users', (table) => {
      table.increments('user_id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('role', 20).notNullable();
      table.check("role::text = ANY (ARRAY['KLIENT'::character varying, 'PRACOWNIK'::character varying]::text[])", [], 'users_role_check');
    })
    // 4. Tabela Refresh Tokens
    .createTable('refresh_tokens', (table) => {
      table.increments('token_id').primary();
      table.integer('user_id').unsigned()
        .references('user_id').inTable('users').onDelete('CASCADE');
      table.text('token').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 5. Tabela Products
    .createTable('products', (table) => {
      table.increments('product_id').primary();
      table.integer('category_id').notNullable()
        .references('category_id').inTable('categories');
      table.text('product_name').notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.decimal('weight', 10, 2).notNullable();
      table.check('price >= 0', [], 'products_price_check');
      table.check('weight > 0', [], 'products_weight_check');
    })
    // 6. Tabela Orders
    .createTable('orders', (table) => {
      table.increments('order_id').primary();
      table.integer('status_id').notNullable()
        .references('status_id').inTable('order_status');
      table.date('order_date');
      table.text('customer_name').notNullable();
      table.text('email').notNullable();
      table.text('phone').notNullable();
      table.integer('user_id')
        .references('user_id').inTable('users');
    })
    // 7. Tabela Order Items
    .createTable('order_items', (table) => {
      table.integer('order_id').notNullable()
        .references('order_id').inTable('orders').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('product_id').notNullable()
        .references('product_id').inTable('products').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('quantity').notNullable();
      table.decimal('list_price', 10, 2).notNullable();
      table.integer('vat').defaultTo(23);
      table.integer('discount').defaultTo(0);

      table.primary(['order_id', 'product_id']);
      table.check('quantity > 0', [], 'order_items_quantity_check');
    })
    // 8. Tabela Order Opinions
    .createTable('order_opinions', (table) => {
      table.increments('opinion_id').primary();
      table.integer('order_id').unique()
        .references('order_id').inTable('orders').onDelete('CASCADE');
      table.integer('rating').notNullable();
      table.text('content');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.check('rating >= 1 AND rating <= 5', [], 'order_opinions_rating_check');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('order_opinions')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('products')
    .dropTableIfExists('refresh_tokens')
    .dropTableIfExists('users')
    .dropTableIfExists('order_status')
    .dropTableIfExists('categories');
};