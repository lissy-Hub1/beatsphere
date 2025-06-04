// scene-setup.js - Configuración del entorno 3D estilo Tron
import * as THREE from 'three';
import { gameState, COLORS, CONFIG, getGeometry, getMaterial } from './config.js';

export function setupLights() {
    // Luces ambientales azules características de Tron
    const ambientLight = new THREE.AmbientLight(COLORS.TRON_BLUE, 0.3);
    
    // Luces direccionales con tonos cian/azul
    const directionalLight1 = new THREE.DirectionalLight(COLORS.TRON_CYAN, 0.8);
    directionalLight1.position.set(10, 10, 5);
    
    const directionalLight2 = new THREE.DirectionalLight(COLORS.TRON_BLUE, 0.5);
    directionalLight2.position.set(-10, 5, -5);
    
    gameState.scene.add(ambientLight, directionalLight1, directionalLight2);
    
    // Luces de neón para el estilo Tron
    const gridSize = 5;
    const gridSpacing = 2;
    const gridHeight = 0.1;
    
    for (let x = -gridSize; x <= gridSize; x++) {
        for (let z = -gridSize; z <= gridSize; z++) {
            if ((x + z) % 2 === 0) {
                const light = new THREE.PointLight(COLORS.TRON_BLUE, 0.7, 3);
                light.position.set(x * gridSpacing, gridHeight, z * gridSpacing);
                gameState.scene.add(light);
                
                // Añadir marcador visual para las luces
                const lightMarker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 8, 8),
                    new THREE.MeshBasicMaterial({ 
                        color: COLORS.TRON_CYAN,
                        transparent: true,
                        opacity: 0.5
                    })
                );
                lightMarker.position.copy(light.position);
                gameState.scene.add(lightMarker);
            }
        }
    }
}

export function setupEnvironment() {
    const { w, h, d } = CONFIG.PLATFORM_SIZE;
    
    // Plataforma con estilo de rejilla Tron
    const platformGeometry = getGeometry('platform', () => new THREE.BoxGeometry(w, h, d));
    const platformMaterial = getMaterial('platform', () => new THREE.MeshPhongMaterial({ 
        color: 0x111122,
        emissive: COLORS.TRON_BLUE,
        emissiveIntensity: 0.2,
        specular: COLORS.TRON_CYAN,
        shininess: 50,
        wireframe: false
    }));
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    gameState.scene.add(platform);
    
    // Añadir líneas de rejilla en la plataforma
    const gridHelper = new THREE.GridHelper(20, 20, COLORS.TRON_CYAN, COLORS.TRON_CYAN);
    gridHelper.position.y = 0.01; // Justo encima de la plataforma
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    gameState.scene.add(gridHelper);
    
    // Paredes laterales con estilo Tron
    const wallGeometry = getGeometry('wall', () => new THREE.BoxGeometry(
        CONFIG.WALL_SIZE.w, 
        CONFIG.WALL_SIZE.h, 
        CONFIG.WALL_SIZE.d
    ));
    
    const wallMaterial = getMaterial('wall', () => new THREE.MeshPhongMaterial({ 
        color: 0x111122,
        emissive: COLORS.TRON_BLUE,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    }));
    
    const walls = [
        { x: -4, name: 'leftWall', rotation: 0 },
        { x: 4, name: 'rightWall', rotation: 0 },
        { z: -8, name: 'backWall', rotation: Math.PI/2 }
    ].map(({ x, z, rotation }) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        if (x !== undefined) wall.position.set(x, 1.5, 0);
        if (z !== undefined) wall.position.set(0, 1.5, z);
        wall.rotation.y = rotation;
        return wall;
    });
    
    gameState.scene.add(...walls);
    
    // Añadir efectos de borde neón a las paredes
    walls.forEach(wall => {
        const edges = new THREE.EdgesGeometry(wall.geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ 
                color: COLORS.TRON_CYAN, 
                linewidth: 2 
            })
        );
        line.position.copy(wall.position);
        line.rotation.copy(wall.rotation);
        line.scale.copy(wall.scale);
        gameState.scene.add(line);
    });
}