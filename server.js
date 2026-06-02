/* ============================================================
   ИГРА В АРТЁМА — сервер
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
const MIN_PLAYERS = 3;        // минимум игроков для старта
const MAX_PLAYERS = 10;

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Банк вопросов ---------- */
const QUESTIONS = [
  'Назови блюдо, которое ты можешь есть каждый день',
  'Какой самый странный сон тебе снился?',
  'Что бы ты сделал, если бы выиграл миллион?',
  'Назови суперспособность, которую хотел бы иметь',
  'Какая песня застряла у тебя в голове?',
  'Что ты обычно делаешь, когда не можешь уснуть?',
  'Назови самую переоценённую вещь в мире',
  'Куда бы ты отправился прямо сейчас, если бы мог телепортироваться?',
  'Какой твой бесполезный, но любимый навык?',
  'Что бы ты взял с собой на необитаемый остров?',
  'Назови фильм, который пересматривал больше всего раз',
  'Какая еда выглядит вкусно, но на вкус так себе?',
  'Что ты делаешь первым делом утром?',
  'Назови самое нелепое правило, которое ты когда-либо слышал',
  'Если бы ты был животным, то каким?',
  'Какой звук тебя больше всего раздражает?',
  'Назови привычку, от которой не можешь избавиться',
  'Что ты гуглил последним?',
  'Какой подарок ты бы никогда не хотел получить?',
  'Назови вещь, которую все любят, а ты нет',
  'Какое слово ты используешь слишком часто?',
  'Что бы ты изменил в своём прошлом, если бы мог?',
  'Назови самый бесполезный предмет в твоей комнате',
  'Какой твой план на случай зомби-апокалипсиса?',
  'Что ты делаешь, когда тебе скучно?'
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

/* ---------- Хранилище комнат ----------
   rooms[code] = {
     code, hostId, phase: 'lobby'|'playing'|'voting'|'results',
     players: { socketId: { id, name, ready, slot } },
     artemId, currentQuestion, questionNumber,
     turnOrder: [slot,...], turnIndex,
     answersLog: [{ question, entries:[{slot,text}] }],
     votes: { voterId: slot }
   }
------------------------------------------------------- */
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
    players: playerList(room)
  });
}

/* Список открытых лобби (фаза «lobby») для экрана выбора */
function openLobbies() {
  return Object.values(rooms)
    .filter(r => r.phase === 'lobby')
    .map(r => {
      const host = r.players[r.hostId];
      return {
        code: r.code,
        hostName: host ? host.name : '—',
        count: Object.keys(r.players).length,
        max: MAX_PLAYERS
      };
    })
    .sort((a, b) => b.count - a.count);
}
function broadcastLobbyList() {
  io.to('browsing').emit('lobbyList', openLobbies());
}

function slotOf(room, socketId) {
  return room.players[socketId] ? room.players[socketId].slot : null;
}
function playerBySlot(room, slot) {
  return Object.values(room.players).find(p => p.slot === slot);
}

/* ---------- Запуск игры ---------- */
function startGame(room) {
  const players = Object.values(room.players);
  if (players.length < MIN_PLAYERS) return;

  room.phase = 'playing';
  room.answersLog = [];
  room.votes = {};
  room.questionNumber = 0;

  // назначаем слоты заново и порядок ходов
  const shuffled = shuffle(players);
  shuffled.forEach((p, i) => { p.slot = i; });
  room.turnOrder = shuffled.map(p => p.slot);

  // выбираем Артёма
  const artem = players[Math.floor(Math.random() * players.length)];
  room.artemId = artem.id;

  // приватно сообщаем каждому его роль
  for (const p of players) {
    io.to(p.id).emit('gameStarted', {
      yourSlot: p.slot,
      isArtem: p.id === room.artemId,
      slotCount: players.length
    });
  }

  newQuestion(room);
  broadcastLobbyList();
}

function newQuestion(room) {
  room.questionNumber += 1;
  room.currentQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  room.turnIndex = 0;
  room.answersLog.push({ question: room.currentQuestion, entries: [] });

  // всем, кроме Артёма, шлём текст вопроса; Артёму — скрыто
  for (const p of Object.values(room.players)) {
    io.to(p.id).emit('newQuestion', {
      questionNumber: room.questionNumber,
      question: p.id === room.artemId ? null : room.currentQuestion
    });
  }
  broadcastTurn(room);
}

function broadcastTurn(room) {
  const currentSlot = room.turnOrder[room.turnIndex];
  io.to(room.code).emit('turnUpdate', {
    currentSlot,
    turnIndex: room.turnIndex,
    totalTurns: room.turnOrder.length
  });
}

function advanceTurn(room) {
  room.turnIndex += 1;
  if (room.turnIndex >= room.turnOrder.length) {
    // раунд по текущему вопросу завершён
    io.to(room.code).emit('roundComplete', { hostId: room.hostId });
  } else {
    broadcastTurn(room);
  }
}

function startVoting(room) {
  room.phase = 'voting';
  room.votes = {};
  io.to(room.code).emit('votingStarted', {
    slots: Object.values(room.players).map(p => p.slot).sort((a, b) => a - b)
  });
}

function tallyAndReveal(room) {
  const counts = {};
  for (const slot of Object.values(room.votes)) {
    counts[slot] = (counts[slot] || 0) + 1;
  }
  const artemSlot = slotOf(room, room.artemId);

  // победил ли коллектив: Артём — единоличный лидер по голосам
  let topSlot = null, topCount = -1, tie = false;
  for (const [slot, c] of Object.entries(counts)) {
    if (c > topCount) { topCount = c; topSlot = Number(slot); tie = false; }
    else if (c === topCount) { tie = true; }
  }
  const groupWon = !tie && topSlot === artemSlot && topCount > 0;

  room.phase = 'results';
  io.to(room.code).emit('results', {
    artemSlot,
    votes: counts,
    groupWon,
    players: Object.values(room.players)
      .sort((a, b) => a.slot - b.slot)
      .map(p => ({ slot: p.slot, name: p.name, wasArtem: p.id === room.artemId }))
  });
}

function returnToLobby(room) {
  room.phase = 'lobby';
  room.artemId = null;
  room.currentQuestion = null;
  room.answersLog = [];
  room.votes = {};
  for (const p of Object.values(room.players)) p.ready = false;
  io.to(room.code).emit('returnToLobby', {});
  emitLobby(room);
  broadcastLobbyList();
}

/* ---------- Сокеты ---------- */
io.on('connection', (socket) => {
  let joinedRoom = null;

  /* Экран выбора: подписка на список открытых лобби */
  socket.on('enterBrowser', () => {
    socket.join('browsing');
    socket.emit('lobbyList', openLobbies());
  });
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
      return;
    }
    // переназначаем хоста при необходимости
    if (room.hostId === socket.id) {
      room.hostId = Object.keys(room.players)[0];
    }
    // если ушёл во время игры — игру разумнее свернуть в лобби
    if (room.phase !== 'lobby') {
      io.to(room.code).emit('playerDropped', { wasArtem });
      returnToLobby(room);
    } else {
      emitLobby(room);
    }
    broadcastLobbyList();
    joinedRoom = null;
  }

  /* Создать лобби */
  socket.on('createLobby', ({ name }, cb) => {
    name = (name || '').trim().slice(0, 18) || 'Аноним';
    let code = genRoomCode();
    while (rooms[code]) code = genRoomCode();

    rooms[code] = {
      code,
      hostId: socket.id,
      phase: 'lobby',
      players: {},
      artemId: null,
      currentQuestion: null,
      questionNumber: 0,
      turnOrder: [],
      turnIndex: 0,
      answersLog: [],
      votes: {}
    };
    const room = rooms[code];
    room.players[socket.id] = { id: socket.id, name, ready: false, slot: 0 };
    socket.join(code);
    socket.leave('browsing');
    joinedRoom = code;

    cb && cb({ ok: true, roomCode: code, playerId: socket.id });
    emitLobby(room);
    broadcastLobbyList();
  });

  /* Подключиться к лобби */
  socket.on('joinLobby', ({ roomCode, name }, cb) => {
    roomCode = (roomCode || '').trim().toUpperCase();
    name = (name || '').trim().slice(0, 18) || 'Аноним';
    const room = rooms[roomCode];

    if (!room) return cb && cb({ ok: false, error: 'Лобби не найдено' });
    if (room.phase !== 'lobby') return cb && cb({ ok: false, error: 'Игра уже идёт' });
    if (Object.keys(room.players).length >= MAX_PLAYERS)
      return cb && cb({ ok: false, error: 'Лобби заполнено' });

    const slot = Object.keys(room.players).length;
    room.players[socket.id] = { id: socket.id, name, ready: false, slot };
    socket.join(roomCode);
    socket.leave('browsing');
    joinedRoom = roomCode;

    cb && cb({ ok: true, roomCode, playerId: socket.id });
    emitLobby(room);
    broadcastLobbyList();
  });

  /* Кнопка «Я АРТЁМ» = готовность */
  socket.on('toggleReady', () => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'lobby') return;
    const p = room.players[socket.id];
    if (!p) return;
    p.ready = !p.ready;
    emitLobby(room);

    const players = Object.values(room.players);
    if (players.length >= MIN_PLAYERS && players.every(x => x.ready)) {
      startGame(room);
    }
  });

  /* Лайв-печать (только в свой ход) */
  socket.on('typing', ({ text }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing') return;
    const mySlot = slotOf(room, socket.id);
    if (mySlot !== room.turnOrder[room.turnIndex]) return;
    socket.to(room.code).emit('liveTyping', { slot: mySlot, text: String(text || '').slice(0, 280) });
  });

  /* Отправка ответа */
  socket.on('submitAnswer', ({ text }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing') return;
    const mySlot = slotOf(room, socket.id);
    if (mySlot !== room.turnOrder[room.turnIndex]) return;

    const answer = String(text || '').trim().slice(0, 280) || '...';
    const log = room.answersLog[room.answersLog.length - 1];
    log.entries.push({ slot: mySlot, text: answer });

    io.to(room.code).emit('answerSubmitted', {
      slot: mySlot,
      text: answer,
      questionNumber: room.questionNumber
    });
    advanceTurn(room);
  });

  /* Хост: следующий вопрос */
  socket.on('nextQuestion', () => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing' || socket.id !== room.hostId) return;
    newQuestion(room);
  });

  /* Хост: перейти к голосованию */
  socket.on('startVoting', () => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'playing' || socket.id !== room.hostId) return;
    startVoting(room);
  });

  /* Голос */
  socket.on('castVote', ({ slot }) => {
    const room = rooms[joinedRoom];
    if (!room || room.phase !== 'voting') return;
    if (!room.players[socket.id]) return;
    room.votes[socket.id] = Number(slot);

    io.to(room.code).emit('voteUpdate', {
      votedCount: Object.keys(room.votes).length,
      total: Object.keys(room.players).length
    });

    if (Object.keys(room.votes).length >= Object.keys(room.players).length) {
      tallyAndReveal(room);
    }
  });

  /* Хост: играть снова */
  socket.on('playAgain', () => {
    const room = rooms[joinedRoom];
    if (!room || socket.id !== room.hostId) return;
    returnToLobby(room);
  });

  /* Выход / разрыв соединения */
  socket.on('leaveLobby', () => leaveCurrentRoom());
  socket.on('disconnect', () => leaveCurrentRoom());
});

server.listen(PORT, () => {
  console.log(`\n  🎭  ИГРА В АРТЁМА запущена`);
  console.log(`  ▶  Локально:        http://localhost:${PORT}`);
  console.log(`  ▶  В локальной сети: http://<твой-IP>:${PORT}\n`);
});

// Render присылает SIGTERM при передеплое/остановке — закрываемся аккуратно
process.on('SIGTERM', () => {
  console.log('SIGTERM получен — завершаюсь.');
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
});
