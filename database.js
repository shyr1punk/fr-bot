const { Client } = require('pg');
const client = new Client();
client.connect();

// Поиск по названию
async function searchByName(criteria) {
  try {
    const query =
      'SELECT * FROM reports WHERE company_name LIKE $1';
    const params = [`%${criteria}%`];
    const res = await client.query(query, params);

    return {err: null, res};
  } catch (err) {
    return {err};
  }

}

// Поиск по ОКПО
async function searchByOKPO(criteria) {
  try {
    const query =
      'SELECT * FROM reports WHERE okpo = $1';
    const params = [criteria];
    const res = await client.query(query, params);

    return {err: null, res};
  } catch (err) {
    return {err};
  }

}

// Поиск по ИНН
async function searchByINN(criteria) {
  try {
    const query =
      'SELECT * FROM reports WHERE inn = $1';
    const params = [criteria];
    const res = await client.query(query, params);

    return {err: null, res};
  } catch (err) {
    return {err};
  }

}
module.exports = {
  searchByName,
  searchByOKPO,
  searchByINN
};
