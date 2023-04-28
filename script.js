function resizeCanvas() {
  const canvas = document.querySelector('#canvas');
  const gameContainer = document.querySelector('#game-container'); // Asume que el juego está contenido en un div con el ID "game-container"
  
  // Ajusta el tamaño del canvas al tamaño del contenedor del juego
  canvas.style.width = gameContainer.clientWidth + 'px';
  canvas.style.height = gameContainer.clientHeight + 'px';

  canvas.width = gameContainer.clientWidth * window.devicePixelRatio;
  canvas.height = gameContainer.clientHeight * window.devicePixelRatio;

  // Configura una relación de aspecto para mantener la escala
  const aspectRatio = 16 / 9; // Asume que la relación de aspecto deseada es 16:9
  const currentAspectRatio = canvas.width / canvas.height;
  
  if (currentAspectRatio > aspectRatio) {
    // El ancho es demasiado grande, ajusta el ancho manteniendo el alto
    canvas.width = canvas.height * aspectRatio;
  } else {
    // El alto es demasiado grande, ajusta el alto manteniendo el ancho
    canvas.height = canvas.width / aspectRatio;
  }

  // Centra el canvas dentro del contenedor
  canvas.style.position = 'absolute';
  canvas.style.left = (gameContainer.clientWidth - canvas.width / window.devicePixelRatio) / 2 + 'px';
  canvas.style.top = (gameContainer.clientHeight - canvas.height / window.devicePixelRatio) / 2 + 'px';
}

// Llamar a resizeCanvas cuando la ventana cambie de tamaño
window.addEventListener('resize', resizeCanvas);
// Llamar a resizeCanvas al cargar la página
window.addEventListener('load', resizeCanvas);
// Llama a la función resizeCanvas cuando se carga la página y cuando se redimensiona la ventana
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
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
}

function updateLives() {
  document.getElementById('lives').innerText = lives;
}

async function loadCodes() {
  const response = await fetch('http://localhost:3000/codes');
  const csvData = await response.text();
  const results = Papa.parse(csvData, { header: true });
  results.data.forEach(row => {
    const code = row.code;
    codes[code] = { used: false };
  });
  return codes;
}

async function addUsedCode(inputCode, result) {
  await fetch('http://localhost:3000/used_codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: inputCode, result: result }),
  });
}

async function removeCode(inputCode) {
  await fetch(`http://localhost:3000/codes/${inputCode}`, {
    method: 'DELETE',
  });
}

async function verifyCode() {
  const inputCode = document.getElementById('code').value;

  try {
    // Verificar si el código existe y si ya ha sido utilizado
    const response = await fetch(`http://localhost:3000/check_code/${inputCode}`);
    const codeInfo = await response.json();

    if (!codeInfo.exists) {
      alert('Código no encontrado en la lista de códigos.');
    } else if (!gameStarted && !codeInfo.used) {
      // Juego no ha empezado, el código existe y no ha sido utilizado
      const usedCodeResponse = await fetch(`http://localhost:3000/mark_code_as_used/${inputCode}`);
      const result = await usedCodeResponse.json();

      if (result.success) {
        // Mostrar el juego
        document.getElementById('code-dialog').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        gameStarted = true;
        startGame();
      } else {
        alert('Hubo un error al marcar el código como usado.');
      }
    } else {
      // Juego ya ha empezado o el código ya ha sido utilizado
      alert('Ya has iniciado el juego o el código ya ha sido utilizado.');
    }
  } catch (error) {
    console.error('Error al verificar el código:', error);
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
  
  const shuffledCards = shuffleCards(cards);
  setTimeout(() => renderCards(shuffledCards), 1000);
  isSpacePressed = true;

  gameBoard.addEventListener('click', async function (event) {
    gameBoard.addEventListener('touchstart', onTouch);
    const cardElement = event.target.closest('.card');
    if (!cardElement) return;

    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
    const card = shuffledCards[cardIndex];

    const isCorrect = await checkCard(card, shuffledCards);

    if (isCorrect) {
      console.log('Ganaste');
    } else {
      console.log('Perdiste');
    }
  });
}

async function checkCard(card, shuffledCards) {
  if (!isClickable || !isSpacePressed) return;
  isClickable = false;

  const cardElements = gameBoard.querySelectorAll('.card');

  setTimeout(() => {
    cardElements.forEach((cardElement, index) => {
      const revealedCard = shuffledCards[index];
      cardElement.style.backgroundImage = `url('${revealedCard.img}')`;
    });
  }, 500);

  const isCorrect = await new Promise((resolve) => {
    setTimeout(() => {
      let correct = false;
      if (card.type === 'diferente') {
        playWonSound();
        successImage.style.display = 'block';
        score += 1;
        sendGameResult('ganado');
        correct = true;
      } else {
        playWrongSound();
        if (lives > 1) {
          failImage.style.display = 'block';
        } else {
          failImage.style.display = 'none';
          document.getElementById('game-over-image').style.display = 'block';
          playGameOverSound();
          isClickable = false;
        }
        mistakes += 1;
        lives -= 1;
        updateLives();
        sendGameResult('perdido');
      }
      updateScore();

      setTimeout(() => {
        isSpacePressed = false;
        animateShuffle(cardElements);
        setTimeout(() => {
          renderCards(cards);
        }, 1000);
      }, 1000);

      resolve(correct);
    }, 1000);
  });

  return isCorrect;
}

async function sendGameResult(result) {
  const data = {
    result: result,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch('http://localhost:3000/used_codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al enviar el resultado del juego al servidor');
    }
  } catch (error) {
    console.error('Error al enviar el resultado del juego:', error);
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
  const shuffledCards = shuffleCards(cards);
  setTimeout(() => renderCards(shuffledCards), 1000);
  isSpacePressed = true;
  gameBoard.addEventListener('click', async function (event) {
    const cardElement = event.target.closest('.card');
    if (!cardElement) return;
    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
    const card = shuffledCards[cardIndex];
    const isCorrect = await checkCard(card, shuffledCards);
    if (isCorrect) {
      console.log('Ganaste');
    } else {
      console.log('Perdiste');
    }
  });

  gameBoard.addEventListener('touchstart', async function (event) {
    event.preventDefault(); // Para evitar eventos de clic duplicados en dispositivos móviles
    const cardElement = event.target.closest('.card');
    if (!cardElement) return;
    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
    const card = shuffledCards[cardIndex];
    const isCorrect = await checkCard(card, shuffledCards);
    if (isCorrect) {
      console.log('Ganaste');
    } else {
      console.log('Perdiste');
    }
  });
}

function endGame() {
  document.getElementById('game').style.display = 'none';
  document.getElementById('game-over-image').style.display = 'block';
  stopBackgroundMusic();
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onClick);
}

  function onClick() {
    if (document.getElementById('game-over-image').style.display === 'block') {
      hideGameOver();
    } else if (!isSpacePressed && document.getElementById('game').style.display === 'block') {
      continueGame();
    }
}

  function removeEventListeners() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onClick);
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

function resetGame() {
  hideImages();
  document.getElementById('game-over-image').style.display = 'none';
  document.getElementById('instructions-dialog').style.display = 'none';
  document.getElementById('code-dialog').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  stopBackgroundMusic();
  isMusicPlaying = false;
  playBackgroundMusic();
  lives = 3;
  updateLives();
  score = 0;
  updateScore();
  mistakes = 0;
  const inputCode = document.getElementById('code').value;
  if (codes.hasOwnProperty(inputCode)) {
    codes[inputCode].used = false;
  }
  isClickable = true;
  isSpacePressed = false;
  startGame();
}
const codes = {};
let isMusicPlaying = false;
let score = 0;
let mistakes = 0;
let isClickable = true;
let lives = 3;
let isSpacePressed = false;
let backgroundMusic;
let gameStarted = false;
const successImage = document.getElementById('success-image');
const failImage = document.getElementById('fail-image');
const gameBoard = document.getElementById('game-board');

function hideGameOver() {
  hideImages(); // Agregue esta línea
  document.getElementById('game-over-image').style.display = 'none';
  document.getElementById('dialog').style.display = 'none';
  lives = 3; // Restablece las vidas al iniciar un nuevo juego
  mistakes = 0; // Restablece los errores al iniciar un nuevo juego
  score = 0; // Restablece la puntuación al iniciar un nuevo juego
  updateLives(); // Actualiza la visualización de vidas
  updateScore(); // Actualiza la visualización de la puntuación
  document.getElementById('instructions-dialog').style.display = 'block';
  document.getElementById('code-dialog').style.display = 'none';
  document.getElementById('game').style.display = 'none';
}
loadCodes();

function hideImages() {
  successImage.style.display = 'none';
  failImage.style.display = 'none';
}

function continueGame() {
  hideImages();
  document.getElementById('game-over-image').style.display = 'none';
  isSpacePressed = true;
  isClickable = true;
  if (lives > 0) {
    renderCards(shuffleCards(cards));
  } else {
    document.getElementById('game').style.display = 'none';
    document.getElementById('game-over-image').style.display = 'block';
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
  }
}

function onKeyDown(event) {
  if (event.code === 'Space') {
    if (document.getElementById('game-over-image').style.display === 'block') {
      hideGameOver();
      startGame();
    } else if (!isSpacePressed && document.getElementById('game').style.display === 'block') {
      continueGame();
    }
  }
}

function onTouch(event) {
  if (document.getElementById('game-over-image').style.display === 'block') {
    hideGameOver();
    startGame();
  } else if (!isSpacePressed && document.getElementById('game').style.display === 'block') {
    continueGame();
  }
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('touchstart', onTouch);
document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    if (document.getElementById('game-over-image').style.display === 'block') {
      hideGameOver();
      startGame();
    } else if (!isSpacePressed && document.getElementById('game').style.display === 'block') {
      continueGame();
    }
  }
});

document.addEventListener('DOMContentLoaded', function() {
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
    document.getElementById('code-dialog').style.display = 'block';
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