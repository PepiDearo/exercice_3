//configuration pour la base de donnees
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
      filename: './db.sqlite3',
    },
    useNullAsDefault: true, 
  });


  //fonction pour creer les base de donnes comptes et transactions avec les parametres necessaires
  async function creationDatabase() {
    try {
      await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable(); 
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.enum('role', ['user', 'technician', 'admin']).notNullable().defaultTo('user');
        
    
      });

      await knex.schema.createTable('tickets', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.string('description').notNullable();
        table.enum('status', ['open', 'in progress', 'closed']).notNullable().defaultTo('open');
        table.integer('userId').references('id').inTable('users');
        table.integer('technicianId').nullable().references('id').inTable('users');
        table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable();
        table.timestamp('closedAt').nullable();
      });
  
      console.log('Tables créées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la création des tables :', err);
    
  }
}
  

creationDatabase();