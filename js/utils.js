// utils.js - Funciones de utilidad

// Cargar una pantalla desde el servidor
export async function loadScreen(screenName) {
    try {
        const response = await fetch(`screens/${screenName}.html`);
        const html = await response.text();
        const container = document.createElement('div');
        container.innerHTML = html;
        document.getElementById('app-container').appendChild(container.firstChild);
        return true;
    } catch (error) {
        console.error(`Error loading screen ${screenName}:`, error);
        return false;
    }
}

// Mostrar una pantalla específica
export function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screen = document.querySelector(`.${screenName}-screen`);
    if (screen) {
        screen.classList.add('active');
    }
}

// Crear efecto visual al golpear una esfera
export function createHitEffect(x, y, color) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    effect.style.background = `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 70%)`;
    document.body.appendChild(effect);
    
    effect.addEventListener('animationend', () => {
        effect.remove();
    });
}