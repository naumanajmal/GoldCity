import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('weather_readings', (table) => {
    table.increments('id').primary();
    table.string('city_name', 100).notNullable();
    table.float('temperature_c').notNullable();
    table.integer('humidity_percent').notNullable();
    table.datetime('recorded_at').notNullable();
    
    // Critical indexes for analytics query performance
    table.index('city_name', 'idx_city_name');
    table.index('recorded_at', 'idx_recorded_at');
    table.index(['city_name', 'recorded_at'], 'idx_city_recorded');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('weather_readings');
}
