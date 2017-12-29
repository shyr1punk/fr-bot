const { Client } = require('pg');
const client = new Client();
client.connect();

// Поиск по названию
async function search(criteria) {
  const query =
    'SELECT * FROM reports WHERE company_name LIKE $1';
  const params = [`%${criteria}%`];
  const res = await client.query(query, params);

  return res;
}

module.exports = {
  search
};
