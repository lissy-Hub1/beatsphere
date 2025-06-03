// scene-setup.js - Configuración del entorno 3D y luces
import * as THREE from 'three';
import { gameState, COLORS, CONFIG, getGeometry, getMaterial } from './config.js';

export function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    
    gameState.scene.add(ambientLight, directionalLight);
    
    // Luces de ambiente optimizadas
    const lights = [];
    for (let i = 0; i < 10; i++) {
        const light = new THREE.PointLight(Math.random() * 0xffffff, 0.5, 10);
        light.position.set(
            (Math.random() - 0.5) * 20,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 20
        );
        lights.push(light);
    }
    gameState.scene.add(...lights);
}

export function setupEnvironment() {
    const { w, h, d } = CONFIG.PLATFORM_SIZE;
    const platformGeometry = getGeometry('platform', () => new THREE.BoxGeometry(w, h, d));
    const platformMaterial = getMaterial('platform', () => new THREE.MeshLambertMaterial({ color: 0x333333 }));
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    gameState.scene.add(platform);
    
    // Paredes laterales invisibles
    const wallGeometry = getGeometry('wall', () => new THREE.BoxGeometry(CONFIG.WALL_SIZE.w, CONFIG.WALL_SIZE.h, CONFIG.WALL_SIZE.d));
    const wallMaterial = getMaterial('wall', () => new THREE.MeshBasicMaterial({ visible: false }));
    
    const walls = [
        { x: -4, name: 'leftWall' },
        { x: 4, name: 'rightWall' }
    ].map(({ x }) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, 1.5, 0);
        return wall;
    });
    
    gameState.scene.add(...walls);
}