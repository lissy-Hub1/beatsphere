// config.js - Configuraciones y estado del juego
import * as THREE from 'three';

// Cache de geometrías y materiales
export const geometryCache = new Map();
export const materialCache = new Map();

export function getGeometry(key, createFn) {
    if (!geometryCache.has(key)) {
        geometryCache.set(key, createFn());
    }
    return geometryCache.get(key);
}

export function getMaterial(key, createFn) {
    if (!materialCache.has(key)) {
        materialCache.set(key, createFn());
    }
    return materialCache.get(key);
}

// Estado del juego
export const gameState = {
    scene: null,
    camera: null,
    renderer: null,
    controllers: [],
    swords: [],
    spheres: [],
    score: 0,
    combo: 0,
    gameActive: false,
    beatInterval: 800,
    beatTimer: null,
    clock: new THREE.Clock(),
    lastHitTime: 0,
    debugMode: false
};

// Constantes de colores
export const COLORS = {
    RED: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim(),
    BLUE: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    PARTICLE: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
    SWORD_RED: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim(),
    SWORD_BLUE: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    HANDLE: getComputedStyle(document.documentElement).getPropertyValue('--color-dark').trim(),
    TRON_BLUE : 0x191970,
    TRON_CYAN : 0x00f6ff,
    TRON_ORANGE : 0xff6600,
    TRON_PURPLE : 0xcc00ff,
};

// Configuración del juego
export const CONFIG = {
    SPHERE_RADIUS: 0.4,
    SPHERE_VELOCITY: 0.05,
    HIT_COOLDOWN: 200,
    HIT_AREA: {
        LENGTH: 0.8,
        RADIUS: 0.2,
        OFFSET: -0.4
    },
    SWORD_HIT_RADIUS : 0.2,
    PARTICLE_COUNT: 50,
    BEAT_DISTANCE: -8,
    PLATFORM_SIZE: { w: 8, h: 0.1, d: 20 },
    WALL_SIZE: { w: 0.1, h: 3, d: 20 },
    SWORD_HIT_AREA: { x: 0.3, y: 0.3, z: 0.8 }
};

export const AUDIO = {
    SONG_URL: 'assets/sounds/game-music.mp3', // Cambia esta ruta
    VOLUME: 0.7,
    FADE_DURATION: 2 // Segundos para fade out
};

export const UI = {
    RESULTS_DISPLAY_TIME: 10000 // 10 segundos
};

// Función global de actualización de puntuación
export function updateScoreDisplay(score, combo) {
    const scoreElement = document.getElementById('score-value');
    const comboElement = document.getElementById('combo-value');
    
    if (scoreElement) scoreElement.textContent = score;
    if (comboElement) comboElement.textContent = `${combo}x`;
}