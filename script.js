function updateScore() {
  document.getElementById('score').innerText = score;
}

function animateShuffle(cardElements) {
  cardElements.forEach((cardElement) => {
    cardElement.classList.add('mix');
  });

  setTimeout(() => {
    cardElements.forEach((cardElement) => {
      cardElement.classList.remove('mix');
      cardElement.style.backgroundImage = `url('images/carta_reverso.png')`;
    });
  }, 1000);
}

function init() {
  document.getElementById('instructions-dialog').style.display = 'none';
  document.getElementById('code-dialog').style.display = 'block';
  document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      document.getElementById('instructions-dialog').style.display = 'none';
      document.getElementById('code-dialog').style.display = 'block';
    }
  });
}

function updateLives() {
  document.getElementById('lives').innerText = lives;
}

function loadCodes() {
  return new Promise((resolve) => {
    Papa.parse("system/codes.csv", {
      download: true,
      header: true,
      step: function (row) {
        const code = row.data.code;
        codes[code] = { used: false };
      },
      complete: function () {
        resolve();
      },
    });
  });
}

async function verifyCode() {
  await loadCodes();
  
  const inputCode = document.getElementById('code').value;

  if (!codes.hasOwnProperty(inputCode)) {
    alert('Código no encontrado en la lista de códigos.');
  } else if (codes[inputCode] && !codes[inputCode].used) {
    codes[inputCode].used = true;
    startGame();
  } else {
    alert('Código inválido o ya utilizado.');
  }
}

function playBackgroundMusic() {
  if (playBackgroundMusic) {
    if (!playBackgroundMusic.paused) {
      return;
    } else {
      playBackgroundMusic.currentTime = 0;
      playBackgroundMusic.play();
      isMusicPlaying = true;
    }
  } else {
    playBackgroundMusic = new Audio('sounds/fondo.mp3');
    backgroundMusic.loop = true;
    isMusicPlaying = true;
  }
}

async function startGame() {
  if (!isMusicPlaying) {
    playBackgroundMusic();
    isMusicPlaying = true;
  }
  document.getElementById('code-dialog').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  isClickable = true;
  setTimeout(() => renderCards(shuffleCards(cards)), 1000);
  isSpacePressed = true;
}

function endGame() {
  document.getElementById('game').style.display = 'none';
  document.getElementById('game-over-image').style.display = 'block';
  stopBackgroundMusic();
  score = 0;
  updateScore();
  mistakes = 0;
  isClickable = true;
  lives = 3;
  updateLives();
  document.removeEventListener('keydown', handleCodeDialogKeyPress);
  isSpacePressed = false; // Reiniciamos la variable isSpacePressed
  setTimeout(() => {
    document.addEventListener('keydown', handleInstructionsKeyPress);
  }, 1000);
}


function handleSpaceKeyPress(event) {
  if (event.code === 'Space') {
    document.removeEventListener('keydown', handleSpaceKeyPress);
    startGame();
  }
}




function handleInstructionsKeyPress(event) {
  if (event.code === 'Space') {
    document.removeEventListener('keydown', handleInstructionsKeyPress);
    showInstructionsDialog();
    document.addEventListener('keydown', handleCodeDialogKeyPress);
  }
}

function handleCodeDialogKeyPress(event) {
  if (event.code === 'Space') {
    verifyCode();
  }
}

function showCodeDialog() {
  document.getElementById('game').style.display = 'none';
  document.getElementById('instructions-dialog').style.display = 'none';
  document.getElementById('code-dialog').style.display = 'block';
}

function renderCards(cards) {
  const shuffledCards = shuffleCards(cards);
  const cardElements = gameBoard.querySelectorAll('.card');
  cardElements.forEach((cardElement, index) => {
    const card = shuffledCards[index];
    cardElement.style.backgroundImage = `url('images/carta_reverso.png')`;
    cardElement.removeEventListener('click', cardElement.clickHandler);
    cardElement.clickHandler = () => {
      if (!isClickable) return;

      cardElement.style.backgroundImage = `url('${card.img}')`;
      checkCard(card, shuffledCards);
    };
    cardElement.addEventListener('click', cardElement.clickHandler);
  });
}

const cards = [
  { type: 'igual', img: 'images/carta_igual.png' },
  { type: 'igual', img: 'images/carta_igual.png' },
  { type: 'igual', img: 'images/carta_igual.png' },
  { type: 'igual', img: 'images/carta_igual.png' },
  { type: 'igual', img: 'images/carta_igual.png' },
  { type: 'diferente', img: 'images/carta_diferente.png' },
];

function shuffleCards(cards) {
  const shuffledCards = [...cards];
  for (let i = shuffledCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
  }
  return shuffledCards;
}

function checkCard(card, shuffledCards) {
  if (!isClickable || !isSpacePressed) return;
  isClickable = false;

  const cardElements = gameBoard.querySelectorAll('.card');

  setTimeout(() => {
    cardElements.forEach((cardElement, index) => {
      const revealedCard = shuffledCards[index];
      cardElement.style.backgroundImage = `url('${revealedCard.img}')`;
    });
  }, 500);

  setTimeout(() => {
    if (card.type === 'diferente') {
      playWonSound();
      successImage.style.display = 'block';
      score += 1;
    } else {
      playWrongSound();
      if (lives > 1) {
        failImage.style.display = 'block';
      } else {
        failImage.style.display = 'none';
        document.getElementById('game-over-image').style.display = 'block';
        playGameOverSound();
        isClickable = false;
        setTimeout(() => {
          endGame();
        }, 2000);
      }
      mistakes += 1;
      lives -= 1;
      updateLives();
    }
    updateScore();

    setTimeout(() => {
      if (mistakes >= 3) {
        document.getElementById('game-over-image').style.display = 'block';
        playGameOverSound();
        isClickable = false;
        setTimeout(() => {
          endGame();
        }, 2000);
      } else {
        isSpacePressed = false;
        animateShuffle(cardElements);
        setTimeout(() => {
          renderCards(cards);
        }, 1000);
      }
    }, 1000);
  }, 1000);
}

function stopBackgroundMusic() {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
}

function playWonSound() {
  const audio = new Audio('sounds/won.mp3');
  audio.play();
}

function playWrongSound() {
  const audio = new Audio('sounds/wrong.mp3');
  audio.play();
}

function playGameOverSound() {
  const audio = new Audio('sounds/game_over.mp3');
  audio.play();
}


const codes = {};
let isMusicPlaying = false;
let score = 0;
let mistakes = 0;
let isClickable = true;
let lives = 3;
let isSpacePressed = false;
let backgroundMusic;

const successImage = document.getElementById('success-image');
const failImage = document.getElementById('fail-image');
const gameBoard = document.getElementById('game-board');

document.addEventListener('DOMContentLoaded', function() {

function hideImages() {
  successImage.style.display = 'none';
  failImage.style.display = 'none';
}

function onKeyDown(event) {
  if (event.code === 'Space') {
    if (document.getElementById('game-over-image').style.display === 'block') {
      hideGameOver();
      endGame(); // Cambiar endGame(); por startGame();
    } else if (!isSpacePressed) {
      continueGame();
    }
  }
}



function hideGameOver() {
  hideImages(); // Agregue esta línea
  document.getElementById('game-over-image').style.display = 'none';
  document.getElementById('dialog').style.display = 'none';
  showCodeDialog();
}


function continueGame() {
  hideImages();
  document.getElementById('game-over-image').style.display = 'none';
  isSpacePressed = true;
  isClickable = true;
}

document.addEventListener('keydown', onKeyDown);

const codes = {};

Papa.parse("system/codes.csv", {
  download: true,
  header: true,
  step: function (row) {
    const code = row.data.code;
    codes[code] = { used: false };
  },
  complete: function () {

  },
});

document.getElementById('instructions-dialog').style.display = 'none';
document.getElementById('code-dialog').style.display = 'block';

document.getElementById('continue-instructions').addEventListener('click', () => {
  document.getElementById('instructions-dialog').style.display = 'none';
  document.getElementById('code-dialog').style.display = 'block';
});

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('instructions-dialog').style.display = 'block';
});

document.addEventListener('keydown', onKeyDown);

document.getElementById('instructions-dialog').style.display = 'block';

const closeInstructionsButton = document.getElementById('close-instructions');
const continueInstructionsButton = document.getElementById('continue-instructions');

if (closeInstructionsButton) {
  closeInstructionsButton.addEventListener('click', () => {
    document.getElementById('instructions-dialog').style.display = 'none';
    showCodeDialog();
  });
}

if (continueInstructionsButton) {
  continueInstructionsButton.addEventListener('click', () => {
    document.getElementById('instructions-dialog').style.display = 'none';
    document.getElementById('code-dialog').style.display = 'block';
    playBackgroundMusic();
  });
}
});


