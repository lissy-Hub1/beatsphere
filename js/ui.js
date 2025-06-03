// ui.js - Manejo de la interfaz de usuario
import { showScreen, loadScreen } from './utils.js';
import { initGame, pauseGame, resumeGame, cleanupGame, gameState } from './game.js';

// Variables globales de UI
let currentScreen = 'home';

// Configurar eventos de la interfaz
function setupUIEvents() {
    document.addEventListener('click', (e) => {
        // Botones de la pantalla de inicio
        if (e.target.classList.contains('start-btn')) {
            showScreen('game');
            initGame();
        }
        else if (e.target.classList.contains('howto-btn')) {
            showScreen('howto');
            currentScreen = 'howto';
        }
        else if (e.target.classList.contains('credits-btn')) {
            showScreen('credits');
            currentScreen = 'credits';
        }
        else if (e.target.classList.contains('back-btn')) {
            showScreen('home');
            currentScreen = 'home';
        }
        
        // Botones del juego
        else if (e.target.classList.contains('resume-btn')) {
            resumeGame();
            document.getElementById('pause-menu').classList.add('hidden');
        }
        else if (e.target.classList.contains('quit-btn')) {
            showScreen('home');
            cleanupGame();
        }
    });
    
    // Eventos de teclado para testing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.game-screen.active')) {
            togglePauseMenu();
        }
    });
}

// Alternar menú de pausa
function togglePauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    if (gameState.gameActive) {
        pauseGame();
        pauseMenu.classList.remove('hidden');
    } else {
        resumeGame();
        pauseMenu.classList.add('hidden');
    }
}

// Actualizar la visualización de puntuación
export function updateScoreDisplay(score, combo) {
    const scoreElement = document.getElementById('score-value');
    const comboElement = document.getElementById('combo-value');
    
    if (scoreElement) scoreElement.textContent = score;
    if (comboElement) comboElement.textContent = `${combo}x`;
}

// Inicializar la interfaz de usuario
async function initUI() {
    // Cargar todas las pantallas
    const screens = ['home', 'game', 'howtoplay', 'credits'];
    for (const screen of screens) {
        await loadScreen(screen);
    }
    
    // Configurar eventos
    setupUIEvents();
    
    // Mostrar pantalla de inicio
    showScreen('home');
}

export { initUI, togglePauseMenu };