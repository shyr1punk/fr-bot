const token = process.env.TOKEN;

const Bot = require('node-telegram-bot-api');
const Promise = require('bluebird');
const stat = require('bot-metrica')('47260884');

let bot;
const { searchByName, searchByINN, searchByOKPO } = require('./database');
const description = require('./description');

const HELP_MESSAGE =
  'Бот позволяет получить финансовую отчётность организаций\n' +
  'Введите *название организации*, номер *ИНН* или код *ОКПО*';

if (process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

/**
 * Разбиваем большое сообщение на < 4096 байт каждое
 * @param {String[]} lines
 * @returns {String[]}
 */
function splitMessage(lines) {
  const messages = [];
  let currentMessage = '';

  lines.forEach(line => {
    if ((currentMessage + '\n' + line).length > 4096) {
      messages.push(currentMessage);
      currentMessage = '';
    }
    currentMessage = currentMessage + '\n' + line;
  });
  messages.push(currentMessage);

  return messages;
}

/**
 * Финансовый отчёт компании
 * @param {Object[]} companyData
 * @returns {String[]}
 */
function companyReport(companyData) {
  const lines = Object.keys(companyData)
    .filter(key => companyData[key] !== '0')
    .map(key => `${description[key]}: ${companyData[key]}`);

  return splitMessage(lines);
}

/**
 * Отправка сообщений последовательно
 *
 * @param {Number} chatId
 * @param {String[]} messages
 * @returns Promise
 */
function sendMessages(chatId, messages) {
  return Promise
    .mapSeries(messages, message => bot.sendMessage(chatId, message));
}

function replyMessage(chatId, res) {
  if (res.rows.length === 0) {
    console.log('Ничего не нашли');
    bot.sendMessage(chatId, 'Ничего не нашли').then(() => {
      console.log('Отправили сообщение: Ничего не нашли');
    });
  } else if (res.rows.length === 1) {
    console.log('Нашли одну компанию: ' + res.rows[0].company_name);
    sendMessages(chatId, companyReport(res.rows[0])).then(() => {
      console.log('Отправили данные по компании ' + res.rows[0].company_name);
    });
  } else {
    const companyList = res.rows.map((row, i) => `${i + 1}. ${row.company_name} (${row.okpo})`);
    console.log('Нашли несколько компаний: \n' + companyList.length);
    bot.sendMessage(chatId, `Нашли ${companyList.length} компаний:\n` +
      'Уточните запрос или введите код ОКПО нужной компании\n' +
      '№. Название компании (Код ОКПО)');
    sendMessages(chatId, splitMessage(companyList)).then(() => {
      console.log(`Отправили сообщение: Нашли ${companyList.length} компаний`);
    });
  }
}

async function handleOKPO(msg) {
  console.log('Поиск по ОКПО');

  bot.sendMessage(msg.chat.id, 'Ищем по коду ОКПО: ' + msg.text).then(() => {
    console.log('Ищем по коду ОКПО: ' + msg.text);
  });

  console.time('searchByINN');
  const { err, res } = await searchByOKPO(msg.text);
  console.timeEnd('searchByINN');
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

async function handleINN(msg) {
  console.log('Поиск по ИНН');

  bot.sendMessage(msg.chat.id, 'Ищем по коду ИНН: ' + msg.text).then(() => {
    console.log('Ищем по коду ИНН: ' + msg.text);
  });

  console.time('searchByINN');
  const { err, res } = await searchByINN(msg.text);
  console.timeEnd('searchByINN');
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

async function handleCompanyName(msg) {
  bot.sendMessage(msg.chat.id, 'Ищем по названию организации: ' + msg.text).then(() => {
    console.log('Ищем по названию организации: ' + msg.text);
  });

  console.time('searchByCompanyName');
  const { err, res } = await searchByName(msg.text);
  console.timeEnd('searchByCompanyName');
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

/**
 * Обработка команд
 */
bot.onText(/\/.*/, (msg, match) => {
  console.log('Получили команду: ' + match[0]);
  const command = match[0];
  if (command === '/start' || command === '/help') {
    bot.sendMessage(msg.chat.id, HELP_MESSAGE, { parse_mode: 'Markdown' });
    return;
  }

  console.log('Обработчик по-умолчанию, команда ' + match[0]);
  bot.sendMessage(msg.chat.id, 'Неизвестная команда: ' + match[0]).then(() => {
    console.log('Неизвестная команда: ' + match[0]);
  });
});

/**
 * Обработка любого сообщения, кроме начинающегося на "/"
 */
bot.onText(/^[^/].*$/, msg => {
  stat.track(msg.from.id, msg);

  console.log('Получили сообщение: ', msg.text);

  if (/^\d{8}$/.test(msg.text)) {
    handleOKPO(msg);
  } else if (/^\d{10}$/.test(msg.text)) {
    handleINN(msg);
  } else {
    handleCompanyName(msg);
  }
});

module.exports = bot;
