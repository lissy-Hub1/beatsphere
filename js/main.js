// main.js - Punto de entrada principal
import { initUI } from './ui.js';
import { gameState } from './game.js';

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar e inicializar la UI
    await initUI();
    
    // Manejar redimensionamiento de ventana
    window.addEventListener('resize', onWindowResize);
});

function onWindowResize() {
    // Ahora gameState está disponible porque lo importamos
    if (gameState && gameState.camera && gameState.renderer) {
        gameState.camera.aspect = window.innerWidth / window.innerHeight;
        gameState.camera.updateProjectionMatrix();
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}