import { testDatabaseConnection } from './db.js';

testDatabaseConnection()
  .then((result) => {
    console.log('PostgreSQL connected:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('PostgreSQL connection failed:', error);
    process.exit(1);
  });
