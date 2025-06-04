// core.js - Configuración básica y núcleo del juego
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import * as TWEEN from 'tween.js';
import { gameState, COLORS, CONFIG,getGeometry,updateScoreDisplay  } from './config.js';
import { setupEnvironment, setupLights } from './scene_setup.js';
import { setupControllers, updateControllerHitAreas, updateControllerTrails,checkContinuousHits} from './controllers.js';
import { generateBeat, updateScene } from './game-logic.js';

let backgroundMusic;

// Inicializar el juego
export function initGame() {
    setupScene();
    setupCamera();
    setupRenderer();
    setupLights();
    setupEnvironment();
    setupControllers();
    setupEventListeners();
    animate();
}

// Configuración de Three.js
function setupScene() {
    gameState.scene = new THREE.Scene();
    gameState.scene.background = new THREE.Color(0x000011);
}

function setupCamera() {
    gameState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    gameState.camera.position.set(0, 1.6, 3);
}

function setupRenderer() {
    gameState.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    
    const { renderer } = gameState;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    
    document.querySelector('.game-screen').appendChild(renderer.domElement);
    document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));
}

function setupEventListeners() {
    const { renderer, camera } = gameState;
    
    renderer.xr.addEventListener('sessionstart', () => {
        console.log('Sesión VR iniciada');
        Object.assign(gameState, {
            gameActive: true,
            score: 0,
            combo: 0
        });
        updateScoreDisplay(gameState.score, gameState.combo);
        startBeatGeneration();
        camera.position.set(0, 1.6, 0);
        if (!backgroundMusic) initBackgroundMusic();
        backgroundMusic.play();

        backgroundMusic.onended = () => {
            endGame();
        };
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        console.log('Sesión VR finalizada');
        gameState.gameActive = false;
        clearInterval(gameState.beatTimer);
        camera.position.set(0, 1.6, 3);
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h') {
            gameState.debugMode = !gameState.debugMode;
            gameState.controllers.forEach(c => {
                if (c.userData.hitAreaHelper) {
                    c.userData.hitAreaHelper.visible = gameState.debugMode;
                }
            });
        }
    });
}

function startBeatGeneration() {
    gameState.beatTimer = setInterval(generateBeat, gameState.beatInterval);
}

function endGame() {
    if (gameState.gameEnded) return;
    
    gameState.gameActive = false;
    gameState.gameEnded = true;
    clearInterval(gameState.beatTimer);
    
    beatIndex = BEAT_PATTERN.length;
    
    // Limpiar esferas restantes
    gameState.spheres.forEach(sphere => {
        gameState.scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
    });
    gameState.spheres = [];
  
    showFinalResults();
}

function initBackgroundMusic() {
    backgroundMusic = new Audio('.../assets/audio/crazy.mp3');
    backgroundMusic.volume = 0.5;
    backgroundMusic.loop = false;

    // Iniciar música desde cierto segundo cuando empiece el juego
    backgroundMusic.currentTime = 8; // <-- Empieza desde el segundo 8
}

// Bucle de animación
function animate() {
    gameState.renderer.setAnimationLoop((time) => {
        TWEEN.update(time);
        
        if (gameState.gameActive) {
            updateScene();
            updateControllerHitAreas();
            checkContinuousHits();
            updateControllerTrails();
        }
        
        gameState.renderer.render(gameState.scene, gameState.camera);
    });
}

// Control del juego
export function pauseGame() {
    gameState.gameActive = false;
    clearInterval(gameState.beatTimer);
}

export function resumeGame() {
    gameState.gameActive = true;
    startBeatGeneration();
}

export function cleanupGame() {
    pauseGame();
    
    gameState.spheres.forEach(sphere => gameState.scene.remove(sphere));
    gameState.spheres.length = 0;
    
    if (gameState.renderer) {
        gameState.renderer.dispose();
        const canvas = gameState.renderer.domElement;
        canvas?.parentNode?.removeChild(canvas);
    }
    
    // Limpiar caches (se movería a config.js)
    geometryCache.forEach(geom => geom.dispose());
    materialCache.forEach(mat => mat.dispose());
    geometryCache.clear();
    materialCache.clear();
}