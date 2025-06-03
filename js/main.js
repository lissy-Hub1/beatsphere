// main.js - Punto de entrada principal
import { initGame } from './core.js';
import { initUI } from './ui.js';

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar e inicializar la UI
    await initUI();
    
    // Inicializar el juego (esto incluye la configuración de Three.js, escena, controles, etc.)
    initGame();
    
    // El event listener de resize ahora está dentro de core.js
    // ya que forma parte de la configuración básica del renderer
});