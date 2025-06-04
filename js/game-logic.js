// game-logic.js - Lógica del juego y generación de beats
import * as THREE from 'three';
import { gameState, COLORS, CONFIG, getGeometry, updateScoreDisplay } from './config.js';
import * as TWEEN from 'tween.js';


gameState.maxCombo = 0;
gameState.successfulHits = 0;
gameState.totalHits = 0;

export function generateBeat() {
    if (!gameState.gameActive) return;

    const isRed = Math.random() > 0.5;
    const color = isRed ? COLORS.RED : COLORS.BLUE;
    
    const geometry = getGeometry('sphere', () => new THREE.SphereGeometry(CONFIG.SPHERE_RADIUS, 32, 32));
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.8,
        specular: 0x111111,
        shininess: 30
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(
        (Math.random() - 0.5) * 4,
        1.0 + Math.random(),
        CONFIG.BEAT_DISTANCE
    );
    
    sphere.userData = {
        velocity: new THREE.Vector3(0, 0, CONFIG.SPHERE_VELOCITY),
        isRed: isRed,
        active: true,
        spawnTime: Date.now()
    };
    
    gameState.scene.add(sphere);
    gameState.spheres.push(sphere);
    
    // Animación de aparición
    sphere.scale.set(0.2, 0.2, 0.2);
    new TWEEN.Tween(sphere.scale)
        .to({ x: 1, y: 1, z: 1 }, 800)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
}

export function updateScene() {
    const delta = gameState.clock.getDelta();
    
    for (let i = gameState.spheres.length - 1; i >= 0; i--) {
        const sphere = gameState.spheres[i];
        if (!sphere.userData.active) continue;
        
        // Movimiento más suave con delta time
        sphere.position.x += sphere.userData.velocity.x * delta * 60;
        sphere.position.y += sphere.userData.velocity.y * delta * 60;
        sphere.position.z += sphere.userData.velocity.z * delta * 60;
        
        // Rotación gradual
        sphere.rotation.x += 0.01 * delta * 60;
        sphere.rotation.y += 0.01 * delta * 60;
        
        if (sphere.position.z > 3) {
            gameState.scene.remove(sphere);
            gameState.spheres.splice(i, 1);
            if (gameState.gameActive) {
                gameState.combo = 0;
                updateScoreDisplay(gameState.score, gameState.combo);
            }
        }
    }
}