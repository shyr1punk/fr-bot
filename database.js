const { Client } = require('pg');

const client = new Client();
client.connect()
  .then(() => console.log('pg connected'))
  .catch(err => console.error('pg connection error', err.stack));

// Поиск по ОКПО
async function searchByOKPO(criteria) {
  try {
    const query =
      'SELECT * FROM companies LEFT JOIN reports ON companies.okpo = reports.okpo WHERE companies.okpo = $1';
    const params = [criteria];
    const res = await client.query(query, params);

    return { err: null, res };
  } catch (err) {
    return { err };
  }
}

// Поиск по ИНН
async function searchByINN(criteria) {
  try {
    const query =
      'SELECT * FROM companies LEFT JOIN reports ON companies.okpo = reports.okpo WHERE companies.inn = $1';
    const params = [criteria];
    const res = await client.query(query, params);

    return { err: null, res };
  } catch (err) {
    return { err };
  }
}

// Поиск по названию
async function searchByName(criteria) {
  try {
    const query =
      'SELECT * FROM companies ' +
        "WHERE to_tsvector('russian', company_name) @@ plainto_tsquery('russian', $1);";
    const params = [`%${criteria}%`];
    const res = await client.query(query, params);

    // Если ничего не нашли или нашли много - возвращаем результат
    if (res.rows.length !== 1) {
      return { err: null, res };
    }

    // если нашли одну организацию - ищем её данные по ОКПО
    return searchByOKPO(res.rows[0].okpo);
  } catch (err) {
    return { err };
  }
}

module.exports = {
  searchByName,
  searchByOKPO,
  searchByINN,
};
