const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const moment = require('moment-timezone');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3000

const userSession = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser(process.env["cookie_key"]));

const Play = (() => {
  let turnCount;
  let randomNumber;
  class Play {
    constructor() {
      turnCount = 0;
      randomNumber = Math.floor(Math.random() * 100) + 1;
    }
    get turnCount() {
      return turnCount;
    }
    restartGame() {
      turnCount = 0;
      randomNumber = Math.floor(Math.random() * 100) + 1;
      return true;
    }
    correct(num) {
      turnCount++;
      if (turnCount > 10) {
        this.restartGame();
        return {
          massage: '?',
        }
      }
      if (randomNumber === num) {
        return {
          restart: true,
          lastResultContent: "Congratulations! You got it right!",
          lastResultColor: "green",
          lowOrHiContent: "",
        };
      } else if (turnCount === 10) {
        return {
          restart: true,
          GO: true,
          lastResultContent: "!!!GAME OVER!!!",
          lastResultColor: "red",
          lowOrHiContent: "",
          answer: randomNumber,
        };
      } else {
        let comparison = num < randomNumber ? "too low" : "too high";
        return {
          restart: false,
          lastGuessWasHigh: num < randomNumber,
          lastResultContent: "Wrong!",
          lastResultColor: "red",
          lowOrHiContent: `Last guess was ${comparison}!`,
        };
      }
    }
  }
  return Play;
})();

app.get('/', (req, res) => {
  const { userToken } = req.cookies;
  const token = crypto.randomBytes(20).toString("hex");
  const expiration_date = moment().tz("Asia/Seoul").add(1, "days").toDate();
  if(userToken) {
    userSession[userToken] = new Play();
  } else {
    res.cookie("userToken", token, { maxAge: expiration_date });
    userSession[token] = new Play();
  }
  return res.sendFile(path.join(__dirname, '/main/index.html'));
});

app.post('/correct', (req, res) => {
  const { userToken } = req.cookies;
  const guess = req.body.userGuess;
  const game = userSession[userToken];
  return res.json({
    status: true,
    gameData: {
      turnCount: game.turnCount,
      corrent: game.correct(guess),
    }
  });
});

app.post('/restart', (req, res) => {
  const { userToken } = req.cookies;
  const game = userSession[userToken];
  return res.json({
    status: game.restartGame(),
  });
});

app.get('*', (req, res) => {
  res.send('Not Found 404');
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
