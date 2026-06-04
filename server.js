/* ============================================================
   ИГРА В АРТЁМА — сервер (v2)
   Node.js + Express + Socket.io
   Запуск:  npm install  &&  npm start
   ============================================================ */

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const MATCH_QUESTIONS = 20; // длина матча — пока не кончатся вопросы (берутся случайно из банка)

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Банк вопросов ---------- */
const QUESTIONS = [
  // --- Dota 2 ---
  'Назови героя Доты, которого ненавидишь больше всего, и почему',
  'Твоя любимая роль: керри, мид, оффлейн или саппорт?',
  'Опиши самую обидную смерть в Доте',
  'Какой первый предмет ты собираешь на любимом герое?',
  'Назови героя, которого вечно нерфят, но он всё равно имба',
  'Что бесит в пабах Доты больше всего?',
  'Самый сложный герой в освоении, по-твоему?',
  'Опиши идеального тиммейта в Доте одной фразой',
  'Что важнее в Доте: фарм или драки?',
  'Что ты делаешь, когда команда начинает флеймить?',
  'Назови самую имбовую связку героев',
  'Рошан или пуш — что важнее в середине игры?',
  'За что не грех зарепортить тиммейта?',
  'Твой стиль игры в Доте одним словом',
  'Какой ранг — потолок среднего игрока, по-твоему?',
  'ТП домой или остаться добивать — твой выбор по умолчанию?',
  'Какой герой первым попадает в бан у тебя?',
  'Ласт-хит или деним важнее на лайне?',
  'Самый токсичный герой по ощущениям против него?',
  'Что делать, если мид проигран на 10-й минуте?',
  'Аганим или Рефреш на твоём любимом герое?',
  'Сейв тиммейта или килл — что выбираешь в замесе?',
  'Лучший саппорт-герой всех времён?',
  'Стакать лес или давить лайн на старте?',
  'Смоук-ганк или сплит-пуш?',
  'Самый недооценённый герой текущего патча?',
  'Кого пикаешь, когда нужно просто вытащить катку?',
  'BKB до или после основного дамага?',
  'Сколько игр подряд у тебя бывает «ещё одна последняя»?',
  'Что обиднее: отменённый ультимейт или дисконнект в драке?',
  'Главная причина твоего ММР-дна, признавайся?',
  'Поставить вард или сэкономить слот под предмет?',
  'Топ-1 самый раздражающий звук в Доте?',
  'Признайся: сколько раз ты фидил специально?',
  'Курьер чаще довозит предметы или умирает по пути?',
  'Хард-керри или спейс-крутящий оффлейнер — кто несёт игру?',

  // --- CS2 / CS ---
  'Твоя любимая карта в CS2?',
  'AWP или винтовка — что выбираешь?',
  'Опиши клатч, которым гордишься',
  'Лучший пистолет на пистолетном раунде?',
  'Что бесит сильнее: читеры или тиммейты без микро?',
  'Раш на точку или медленный заход — твой стиль?',
  'Назови самое бесполезное оружие в CS2',
  'Какая граната выигрывает раунды чаще всего?',
  'Что важнее: аим или геймсенс?',
  'Эко или форс, когда экономика просела?',
  'Спрей или одиночные выстрелы?',
  'Привычка нуба, которая сразу его выдаёт?',
  'Если бы дали любой скин бесплатно — какой берёшь?',
  'Как ты сбрасываешь бомбу: по делу или паникуешь?',
  'Раш B или медленный мид-контроль?',
  'Лёрк в одиночку или игра с командой?',
  'Лучшая позиция под AWP на твоей любимой карте?',
  'Префайр по углам или аккуратный пик?',
  'Дропнуть пушку тиммейту или оставить себе?',
  'Покупать на последние деньги или копить?',
  'Флешка себе в глаза — как часто, честно?',
  'Контакт-плей или вся надежда на ютилити?',
  'Что важнее: рефлексы или знание таймингов?',
  'Раунд на ноже — реальный план или чистые понты?',
  'Что бесит больше: тиммейт-кэмпер или вечный раш без плана?',
  'Калаш или M4 — если выбирать раз и навсегда?',
  'Сэйв оружия или геройская попытка вытащить раунд?',
  'Открыть кейс или купить скин напрямую?',
  'Лучшая раскидка, которую ты знаешь наизусть?',
  'Спавн-пик в начале раунда — кайф или зашквар?',
  'Что обиднее: тимкилл флешкой или собственный тиммейт под молотов?',
  'Дигл — оружие скилла или чистого везения?',

  // --- Игры в целом ---
  'Игра, в которую ты вбухал больше всего часов?',
  'Игра, которая разочаровала тебя сильнее всего?',
  'ПК или консоль — и без споров?',
  'Игра, которую все хвалят, а тебе не зашла?',
  'Твой любимый жанр игр?',
  'Лучшая концовка игры, что ты видел?',
  'Одиночные игры или мультиплеер?',
  'Игровой персонаж, за которого реально болеешь?',
  'Игра из детства, которая до сих пор в сердце?',
  'Платить за внутриигровые скины — норм или зашквар?',
  'Игровая механика, которая бесит больше всего?',
  'Самый сложный босс, которого ты одолел?',
  'Когда лучше катать: раннее утро или глубокая ночь?',
  'Что важнее в игре: сюжет или геймплей?',
  'Назови игру, которую ждёшь больше всего',
  'Сложность как задумано или лёгкий режим без стыда?',
  'Игра, которую ты бросил у самого финала?',
  'Открытый мир или линейный сюжет?',
  'Самая страшная игра, в которую ты играл?',
  'Покупать на релизе или ждать скидку?',
  'Гринд ради лута — кайф или мучение?',
  'Какую игру переиграл бы с нуля без памяти о ней?',
  'Соулслайк: достойный вызов или чистый садизм?',
  'Лучший саундтрек в игре?',
  'Микротранзакции в синглплеере — это приговор игре?',
  'Самый запоминающийся напарник-NPC?',
  'Кооп с другом или соло-погружение?',
  'Уровень, на котором ты застрял дольше всего?',
  'Ремейк лучше оригинала — назови пример?',
  'Спидран или исследовать каждый угол карты?',
  'Какая игровая вселенная заслуживает сериал или фильм?',
  'Предзаказ — да или ни за что?',
  'Самая переоценённая игра, по-твоему?',
  'Завершить все ачивки или пройти и забыть?',
  'Какой жанр ты так и не смог понять?',
  'Игра, которая реально заставила тебя психануть?',

  // --- Компьютеры / техника / интернет ---
  'Windows, Mac или Linux — и почему?',
  'Программа, без которой не можешь жить?',
  'Сколько вкладок открыто в браузере прямо сейчас, честно?',
  'Что бесит в современных смартфонах?',
  'Какой был твой первый компьютер или телефон?',
  'Тёмная тема или светлая?',
  'Самый бесполезный гаджет, что ты покупал?',
  'Облако или внешний диск для важных файлов?',
  'Что делаешь первым, когда комп начинает тормозить?',
  'Какую технологию из фантастики хочешь в реальность?',
  'ИИ — больше помогает или пугает?',
  'Сайт, на котором залипаешь чаще всего?',
  'Проводные наушники или беспроводные?',
  'Много мониторов или один большой?',
  'Сколько примерно паролей ты держишь в голове?',
  'Клавиатура: механика или мембрана?',
  'Что раздражает в обновлениях софта?',
  'Собрать ПК самому или купить готовый?',
  'AMD или Nvidia — без священных войн?',
  'Антивирус в 2026 — нужен или паранойя?',
  'RGB-подсветка: красота или детский сад?',
  'Сколько у тебя реально непрочитанных уведомлений?',
  'Чистить кулер от пыли или и так сойдёт?',
  'SSD на всё или HDD под архивы?',
  'Печатаешь вслепую или двумя пальцами?',
  'Обновлять систему сразу или откладывать месяцами?',
  'Качать игру на 100 ГБ или искать что полегче?',
  'Бэкапы делаешь или живёшь на удачу?',
  'Голосовой помощник — пользуешься или сразу выключил?',
  'Тачпад или мышка?',
  'Что первым гуглишь при любой ошибке?',
  'Кабели аккуратно уложены или клубок под столом?',
  'VPN — постоянно включён или по нужде?',
  'Рабочий стол: иконки по линеечке или свалка?',
  'Старый добрый Ctrl+C/Ctrl+V или знаешь горячие клавиши на всё?',

  // --- Мир / жизнь / общее ---
  'Город, в котором мечтаешь побывать?',
  'Кофе или чай по утрам?',
  'Самая бесполезная суперспособность, которую хотел бы?',
  'Что бы ты сделал, выиграв миллион?',
  'Блюдо, которое можешь есть каждый день?',
  'Сова ты или жаворонок?',
  'Идеальная погода для тебя?',
  'Фильм, который пересматривал больше всего раз?',
  'Лето или зима — без компромиссов?',
  'Что бы ты коллекционировал, будь возможность?',
  'Самый странный сон, который помнишь?',
  'Книга или фильм по той же истории?',
  'Навык, который хотел бы освоить за один день?',
  'Привычка, от которой не можешь избавиться?',
  'Что бы ты взял на необитаемый остров?',
  'Самый переоценённый праздник, по-твоему?',
  'Горы или море?',
  'Песня, которая застряла у тебя в голове?',
  'Каким животным ты был бы?',
  'Что ты гуглил последним?',
  'Идеальный способ провести выходной?',
  'Что тебя бесит в людях больше всего?',
  'Назови самую переоценённую еду',
  'Если бы мог поужинать с кем угодно — кто это?',
  'Завтрак обязателен или спокойно пропускаешь?',
  'Ранний подъём или до последнего в кровати?',
  'Наличные или карта с телефоном?',
  'Город или деревня для жизни?',
  'Самый бесполезный школьный предмет, по-твоему?',
  'Планировать отпуск по минутам или ехать наугад?',
  'Сериалы запоем или по серии в день?',
  'Самый странный талант, который у тебя есть?',
  'Что бы ты первым изменил в своём городе?',
  'Текстом или голосовым сообщением?',
  'Готовить дома или заказывать?',
  'Самая переоценённая знаменитость?',
  'Звонок без предупреждения — норм или бесит?',
  'Что ты вечно забываешь купить в магазине?',
  'Самая нелепая трата денег, о которой не жалеешь?',
  'Идеальный размер компании на тусовке?',
  'Делать дела заранее или в последний момент?',
  'Какое супергеройское имя ты бы себе взял?',
  'Сколько будильников ты ставишь утром?',
  'Если бы в сутках было 25 часов — на что лишний час?',
  'Самое переоценённое блюдо в ресторанах?',
  'Что бы ты запретил законом на один день?',
  'Спорт смотреть или заниматься им?',
  'Чему бы ты первым делом научил инопланетянина?',
  'Самая неловкая песня в твоём плейлисте?',
  'Если бы умел телепортироваться — первое место куда?',
  'Что переоценено сильнее: деньги или слава?',
  'Лучший запах в мире, по-твоему?',
  'Долгая дорога с музыкой или быстрая в тишине?',
  'Чего ты боялся в детстве, а сейчас смешно?',
  'Какой совет ты дал бы себе пять лет назад?'
];

/* ---------- Утилиты ---------- */
function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Хранилище комнат ---------- */
const rooms = {};

function playerList(room) {
  return Object.values(room.players)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map(p => ({ id: p.id, name: p.name, ready: p.ready, slot: p.slot }));
}
function emitLobby(room) {
  io.to(room.code).emit('lobbyUpdate', {
    roomCode: room.code,
    hostId: room.hostId,
    minPlayers: MIN_PLAYERS,
    artemClaimed: !!room.artemId,
    players: playerList(room)
  });
}
function openLobbies() {
  return Object.values(rooms)
    .filter(r => r.phase === 'lobby')
    .map(r => {
      const host = r.players[r.hostId];
      return { code: r.code, hostName: host ? host.name : '—', count: Object.keys(r.players).length, max: MAX_PLAYERS };
    })
    .sort((a, b) => b.count - a.count);
}
function broadcastLobbyList() { io.to('browsing').emit('lobbyList', openLobbies()); }

function slotOf(room, id) { return room.players[id] ? room.players[id].slot : null; }
function playerBySlot(room, slot) { return Object.values(room.players).find(p => p.slot === slot); }
function aliveList(room) { return Object.values(room.players).filter(p => p.alive); }

/* ---------- Игровой цикл ---------- */
function startGame(room) {
  const players = Object.values(room.players);
  if (players.length < MIN_PLAYERS) return;
  if (!room.artemId || !room.players[room.artemId]) return;
  if (!players.every(p => p.ready)) return;

  room.phase = 'playing';
  room.answersLog = [];
  room.votes = {};
  room.askedCount = 0;
  room.lastResponderId = null;
  room.responderId = null;

  const shuffled = shuffle(players);
  shuffled.forEach((p, i) => { p.slot = i; p.alive = true; });

  room.totalQuestions = Math.min(MATCH_QUESTIONS, QUESTIONS.length);
  room.deck = shuffle(QUESTIONS).slice(0, room.totalQuestions);

  for (const p of players) {
    io.to(p.id).emit('gameStarted', {
      yourSlot: p.slot,
      isArtem: p.id === room.artemId,
      slotCount: players.length,
      totalQuestions: room.totalQuestions,
      players: players.slice().sort((a, b) => a.slot - b.slot).map(x => ({ slot: x.slot, alive: true }))
    });
  }
  broadcastLobbyList();
  askQuestion(room);
}

function pickResponder(room) {
  const alive = aliveList(room);
  let pool = alive;
  if (alive.length > 1 && room.lastResponderId) pool = alive.filter(p => p.id !== room.lastResponderId);
  if (pool.length === 0) pool = alive;
  return pool[Math.floor(Math.random() * pool.length)];
}

function askQuestion(room) {
  if (room.deck.length === 0) { return endGame(room, 'artem'); }     // вопросы кончились — Артём дожил
  if (aliveList(room).length <= 2) { return endGame(room, 'artem'); } // некому ловить

  const responder = pickResponder(room);
  room.responderId = responder.id;
  room.lastResponderId = responder.id;
  const q = room.deck.pop();
  room.currentQuestion = q;
  room.askedCount += 1;
  room.phase = 'playing';

  for (const p of Object.values(room.players)) {
    const isResponder = p.id === responder.id;
    io.to(p.id).emit('question', {
      questionNumber: room.askedCount,
      total: room.totalQuestions,
      responderSlot: responder.slot,
      question: q,            // все, включая Артёма, видят один и тот же вопрос
      youAnswer: isResponder
    });
  }
}

function startKickVote(room) {
  room.phase = 'voting';
  room.votes = {};
  room.responderId = null;
  io.to(room.code).emit('votingStarted', {
    candidates: aliveList(room).map(p => p.slot).sort((a, b) => a - b)
  });
}

function resolveKick(room) {
  const counts = {};
  let skipN = 0;
  for (const c of Object.values(room.votes)) {
    if (c === 'skip') { skipN++; continue; }
    counts[c] = (counts[c] || 0) + 1;
  }
  let top = null, topN = 0, tie = false;
  for (const [slot, n] of Object.entries(counts)) {
    if (n > topN) { topN = n; top = Number(slot); tie = false; }
    else if (n === topN) { tie = true; }
  }

  if (top === null || tie || skipN >= topN) {
    io.to(room.code).emit('voteResult', { kickedSlot: null, wasArtem: false });
    askQuestion(room);
    return;
  }

  const kicked = playerBySlot(room, top);
  kicked.alive = false;
  const wasArtem = kicked.id === room.artemId;
  io.to(room.code).emit('voteResult', { kickedSlot: top, wasArtem });

  if (wasArtem) return endGame(room, 'crew');
  if (aliveList(room).length <= 2) return endGame(room, 'artem');
  askQuestion(room);
}

function endGame(room, winner) {
  room.phase = 'results';
  const artemSlot = room.players[room.artemId] ? room.players[room.artemId].slot : null;
  io.to(room.code).emit('results', {
    winner, // 'crew' | 'artem'
    artemSlot,
    players: Object.values(room.players)
      .sort((a, b) => a.slot - b.slot)
      .map(p => ({ slot: p.slot, name: p.name, wasArtem: p.id === room.artemId, alive: p.alive }))
  });
}

function returnToLobby(room) {
  room.phase = 'lobby';
  room.artemId = null;
  room.currentQuestion = null;
  room.responderId = null;
  room.answersLog = [];
  room.votes = {};
  for (const p of Object.values(room.players)) { p.ready = false; p.alive = true; }
  io.to(room.code).emit('returnToLobby', {});
  emitLobby(room);
  broadcastLobbyList();
}

/* ---------- Сокеты ---------- */
io.on('connection', (socket) => {
  let joinedRoom = null;

  socket.on('enterBrowser', () => { socket.join('browsing'); socket.emit('lobbyList', openLobbies()); });
  socket.on('leaveBrowser', () => socket.leave('browsing'));

  function leaveCurrentRoom() {
    if (!joinedRoom || !rooms[joinedRoom]) return;
    const room = rooms[joinedRoom];
    const wasArtem = room.artemId === socket.id;
    delete room.players[socket.id];
    socket.leave(room.code);

    if (Object.keys(room.players).length === 0) {
      delete rooms[room.code];
      broadcastLobbyList();
      joinedRoom = null;
      return;
    }
    if (room.hostId === socket.id) room.hostId = Object.keys(room.players)[0];

    if (room.phase === 'lobby') {
      if (wasArtem) room.artemId = null; // освобождаем роль Артёма
      emitLobby(room);
    } else {
      // кто-то вышел во время игры — сбрасываем матч в лобби
      io.to(room.code).emit('playerDropped', { wasArtem });
      returnToLobby(room);
    }
    broadcastLobbyList();
    joinedRoom = null;
  }

  /* Создать лобби */
  socket.on('createLobby', ({ name }, cb) => {
    leaveCurrentRoom(); // нельзя сидеть в двух лобби сразу
    name = (name || '').trim().slice(0, 18) || 'Аноним';
    let code = genRoomCode();
    while (rooms[code]) code = genRoomCode();

    rooms[code] = {
      code, hostId: socket.id, phase: 'lobby', players: {},
      artemId: null, currentQuestion: null, responderId: null, lastResponderId: null,
      askedCount: 0, totalQuestions: 0, deck: [], answersLog: [], votes: {}
    };
    const room = rooms[code];
    room.players[socket.id] = { id: socket.id, name, ready: false, slot: 0, alive: true };
    socket.join(code);
    socket.leave('browsing');
    joinedRoom = code;

    cb && cb({ ok: true, roomCode: code, playerId: socket.id });
    emitLobby(room);
    broadcastLobbyList();
  });

  /* Войти в лобби */
  socket.on('joinLobby', ({ roomCode, name }, cb) => {
    roomCode = (roomCode || '').trim().toUpperCase();
    name = (name || '').trim().slice(0, 18) || 'Аноним';
    const room = rooms[roomCode];
    if (!room) return cb && cb({ ok: false, error: 'Лобби не найдено' });
    if (room.phase !== 'lobby') return cb && cb({ ok: false, error: 'Игра уже идёт' });
    if (Object.keys(room.players).length >= MAX_PLAYERS) return cb && cb({ ok: false, error: 'Лобби заполнено' });

    leaveCurrentRoom(); // нельзя сидеть в двух лобби сразу
    if (!rooms[roomCode]) return cb && cb({ ok: false, error: 'Лобби закрылось' });
    const slot = Object.keys(room.players).length;
    room.players[socket.id] = { id: socket.id, name, ready: false, slot, alive: true };
    socket.join(roomCode);
    socket.leave('browsing');
    joinedRoom = roomCode;

    cb && cb({ ok: true, roomCode, playerId: socket.id });
    emitLobby(room);
    broadcastLobbyList();
  });

  /* Забрать роль Артёма (первый нажавший) */
  socket.on('claimArtem', (cb) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'lobby') return cb && cb({ ok: false });
    if (room.artemId) return cb && cb({ ok: false });
    room.artemId = socket.id;
    cb && cb({ ok: true });
    emitLobby(room);
  });

  /* Готовность */
  socket.on('toggleReady', () => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'lobby') return;
    const p = room.players[socket.id]; if (!p) return;
    p.ready = !p.ready;
    emitLobby(room);
    const players = Object.values(room.players);
    if (room.artemId && players.length >= MIN_PLAYERS && players.every(x => x.ready)) startGame(room);
  });

  /* Лайв-печать (только отвечающий) */
  socket.on('typing', ({ text }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing' || socket.id !== room.responderId) return;
    socket.to(room.code).emit('liveTyping', { slot: slotOf(room, socket.id), text: String(text || '').slice(0, 280) });
  });

  /* Ответ */
  socket.on('submitAnswer', ({ text }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing' || socket.id !== room.responderId) return;
    const answer = String(text || '').trim().slice(0, 280) || '...';
    const slot = slotOf(room, socket.id);
    room.answersLog.push({ questionNumber: room.askedCount, question: room.currentQuestion, slot, text: answer });
    io.to(room.code).emit('answerSubmitted', { slot, text: answer, questionNumber: room.askedCount, question: room.currentQuestion });
    room.responderId = null;
    askQuestion(room);
  });

  /* Созвать кик-голосование */
  socket.on('callVote', () => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing') return;
    const me = room.players[socket.id];
    if (!me || !me.alive) return;
    startKickVote(room);
  });

  /* Голос */
  socket.on('castVote', ({ choice }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'voting') return;
    const me = room.players[socket.id];
    if (!me || !me.alive) return;
    room.votes[socket.id] = (choice === 'skip') ? 'skip' : Number(choice);
    const aliveCount = aliveList(room).length;
    io.to(room.code).emit('voteUpdate', { votedCount: Object.keys(room.votes).length, total: aliveCount });
    if (Object.keys(room.votes).length >= aliveCount) resolveKick(room);
  });

  /* Играть снова — из экрана результатов, лобби сохраняется */
  socket.on('playAgain', () => {
    const room = rooms[joinedRoom];
    if (!room) return;
    if (room.phase !== 'results') return;
    returnToLobby(room);
  });

  /* Чат комнаты */
  socket.on('chat', ({ text }) => {
    const room = rooms[joinedRoom];
    if (!room) return;
    const p = room.players[socket.id];
    if (!p) return;
    const msg = String(text || '').trim().slice(0, 200);
    if (!msg) return;
    io.to(room.code).emit('chatMsg', { slot: p.slot, text: msg });
  });

  socket.on('leaveLobby', () => leaveCurrentRoom());
  socket.on('disconnect', () => leaveCurrentRoom());
});

server.listen(PORT, () => {
  console.log(`\n  🎭  ИГРА В АРТЁМА запущена`);
  console.log(`  ▶  Локально:        http://localhost:${PORT}`);
  console.log(`  ▶  В локальной сети: http://<твой-IP>:${PORT}\n`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM получен — завершаюсь.');
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
});
