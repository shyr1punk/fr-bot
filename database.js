const { Client } = require('pg');
const client = new Client();
client.connect();

async function search(criteria) {
  const query =
    "SELECT company_name FROM reports WHERE company_name LIKE '%РОСНЕФТЬ%'";
  const params = [];
  const res = await client.query(query, params);

  if(res.rows.length > 0) {
    return res.rows[0].company_name;
  } else {
    return 'Компания не найдена'
  }
}

module.exports = {
  search
};
