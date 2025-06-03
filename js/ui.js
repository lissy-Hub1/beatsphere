// ui.js - Manejo de la interfaz de usuario (versión modular)
import { showScreen, loadScreen } from './utils.js';
import { initGame, pauseGame, resumeGame, cleanupGame } from './core.js';
import { gameState } from './config.js';

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
    if (comboElement) {
        comboElement.textContent = `${combo}x`;
        
        // Efectos visuales de combo
        if (combo > 5) {
            comboElement.classList.add('combo-high');
            comboElement.style.animation = 'pulse 0.5s';
            setTimeout(() => {
                comboElement.style.animation = '';
            }, 500);
        } else {
            comboElement.classList.remove('combo-high');
        }
    }
}

// Inicializar la interfaz de usuario
export async function initUI() {
    try {
        // Cargar todas las pantallas
        const screens = ['home', 'game', 'howtoplay', 'credits'];
        for (const screen of screens) {
            await loadScreen(screen);
        }
        
        // Configurar eventos
        setupUIEvents();
        
        // Mostrar pantalla de inicio
        showScreen('home');
        
        // Inicializar elementos VR si existen
        const vrButton = document.getElementById('vr-button');
        if (vrButton) {
            vrButton.addEventListener('click', () => {
                if (currentScreen !== 'game') {
                    showScreen('game');
                    initGame();
                }
            });
        }
    } catch (error) {
        console.error('Error al inicializar la UI:', error);
        // Mostrar mensaje de error al usuario
        alert('Error al cargar la interfaz. Por favor recarga la página.');
    }
}

// Función para mostrar/ocultar elementos VR
export function toggleVRElements(visible) {
    const vrElements = document.querySelectorAll('.vr-element');
    vrElements.forEach(el => {
        el.style.display = visible ? 'block' : 'none';
    });
}