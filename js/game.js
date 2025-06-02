// game.js - Lógica principal del juego con espadas VR (Optimizado y corregido)
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { updateScoreDisplay } from './ui.js';
import * as TWEEN from 'tween.js';

// Variables globales del juego
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

// Constantes de colores y configuración
const COLORS = {
    RED: '#FF0040',
    BLUE: '#0080FF',
    PARTICLE: '#FFFF00',
    SWORD_RED: '#FF3333',
    SWORD_BLUE: '#3399FF',
    HANDLE: '#333333'
};

const CONFIG = {
    SPHERE_RADIUS: 0.4,
    SPHERE_VELOCITY: 0.05,
    HIT_COOLDOWN: 200,
    PARTICLE_COUNT: 50,
    BEAT_DISTANCE: -8,
    PLATFORM_SIZE: { w: 8, h: 0.1, d: 20 },
    WALL_SIZE: { w: 0.1, h: 3, d: 20 },
    SWORD_HIT_AREA: { x: 0.3, y: 0.3, z: 0.8 }
};

// Cache de geometrías y materiales reutilizables
const geometryCache = new Map();
const materialCache = new Map();

function getGeometry(key, createFn) {
    if (!geometryCache.has(key)) {
        geometryCache.set(key, createFn());
    }
    return geometryCache.get(key);
}

function getMaterial(key, createFn) {
    if (!materialCache.has(key)) {
        materialCache.set(key, createFn());
    }
    return materialCache.get(key);
}

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

function setupLights() {
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

function setupEnvironment() {
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

function setupControllers() {
    const controllerConfigs = [
        { index: 0, isLeft: true, color: COLORS.SWORD_RED },
        { index: 1, isLeft: false, color: COLORS.SWORD_BLUE }
    ];
    
    const controllerModelFactory = new XRControllerModelFactory();
    
    controllerConfigs.forEach(config => {
        const controller = gameState.renderer.xr.getController(config.index);
        controller.userData = {
            isLeft: config.isLeft,
            color: config.color,
            lastHit: 0,
            canHit: true
        };
        
        createSword(controller, config.color);
        gameState.scene.add(controller);
        gameState.controllers.push(controller);
        
        // Modelo de controlador
        const grip = gameState.renderer.xr.getControllerGrip(controller);
        const model = controllerModelFactory.createControllerModel(grip);
        grip.add(model);
        gameState.scene.add(grip);
        
        controller.addEventListener('selectstart', () => onControllerSelect(controller));
    });
}

function createSword(controller, color) {
    // Geometrías de la espada (cacheable)
    const bladeGeometry = getGeometry('blade', () => new THREE.BoxGeometry(0.1, 0.02, 0.7));
    const guardGeometry = getGeometry('guard', () => new THREE.BoxGeometry(0.15, 0.02, 0.02));
    const handleGeometry = getGeometry('handle', () => new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8));
    
    // Materiales
    const bladeMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.3,
        specular: 0x111111,
        shininess: 100
    });
    
    const guardMaterial = getMaterial('guard', () => new THREE.MeshPhongMaterial({
        color: new THREE.Color(COLORS.HANDLE),
        shininess: 30
    }));
    
    const handleMaterial = getMaterial('handle', () => new THREE.MeshPhongMaterial({
        color: new THREE.Color(COLORS.HANDLE),
        shininess: 20
    }));
    
    // Construcción de la espada
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    
    blade.position.z = -0.35;
    guard.position.z = -0.1;
    handle.position.set(0, 0, 0.1);
    handle.rotation.x = Math.PI / 2;
    
    const sword = new THREE.Group();
    sword.add(blade, guard, handle);
    sword.rotation.x = Math.PI / 4;
    
    // Trazo luminoso
    const swordTrail = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: color, linewidth: 2 })
    );
    sword.userData.trail = swordTrail;
    sword.add(swordTrail);
    
    // Área de golpe más precisa
    const hitAreaSize = new THREE.Vector3(
        CONFIG.SWORD_HIT_AREA.x,
        CONFIG.SWORD_HIT_AREA.y,
        CONFIG.SWORD_HIT_AREA.z
    );
    const hitAreaCenter = new THREE.Vector3(0, 0, -0.35);
    
    controller.userData.hitArea = new THREE.Box3(
        new THREE.Vector3().copy(hitAreaCenter).sub(hitAreaSize.clone().multiplyScalar(0.5)),
        new THREE.Vector3().copy(hitAreaCenter).add(hitAreaSize.clone().multiplyScalar(0.5))
    );
    
    // Helper para debug
    controller.userData.hitAreaHelper = new THREE.Box3Helper(controller.userData.hitArea, 0xffff00);
    controller.userData.hitAreaHelper.visible = gameState.debugMode;
    sword.add(controller.userData.hitAreaHelper);
    
    controller.add(sword);
    controller.userData.sword = sword;
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
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        console.log('Sesión VR finalizada');
        gameState.gameActive = false;
        clearInterval(gameState.beatTimer);
        camera.position.set(0, 1.6, 3);
    });
    
    // Redimensionamiento
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Debug mode
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

// Lógica del juego
function startBeatGeneration() {
    gameState.beatTimer = setInterval(generateBeat, gameState.beatInterval);
}

function generateBeat() {
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

function onControllerSelect(controller) {
    checkSphereHit(controller);
    updateSwordTrail(controller);
}

function updateControllerHitAreas() {
    gameState.controllers.forEach(controller => {
        if (controller.userData?.sword) {
            // Actualizar el hitArea con la posición y rotación actual de la espada
            const sword = controller.userData.sword;
            const blade = sword.children[0];
            
            // Crear una matriz que represente la transformación actual de la espada
            const matrix = new THREE.Matrix4();
            matrix.compose(
                sword.getWorldPosition(new THREE.Vector3()),
                sword.getWorldQuaternion(new THREE.Quaternion()),
                sword.getWorldScale(new THREE.Vector3())
            );
            
            // Aplicar la transformación al hitArea
            const hitArea = controller.userData.hitArea;
            const center = new THREE.Vector3(0, 0, -0.35);
            const size = new THREE.Vector3(
                CONFIG.SWORD_HIT_AREA.x,
                CONFIG.SWORD_HIT_AREA.y,
                CONFIG.SWORD_HIT_AREA.z
            );
            
            const min = center.clone().sub(size.clone().multiplyScalar(0.5)).applyMatrix4(matrix);
            const max = center.clone().add(size.clone().multiplyScalar(0.5)).applyMatrix4(matrix);
            
            hitArea.min.copy(min);
            hitArea.max.copy(max);
            
            // Actualizar el helper de debug si está visible
            if (controller.userData.hitAreaHelper?.visible) {
                controller.userData.hitAreaHelper.update();
            }
        }
    });
}

function checkContinuousHits() {
    const now = Date.now();
    
    gameState.controllers.forEach(controller => {
        // Solo verificar si ha pasado el tiempo de cooldown
        if (now - controller.userData.lastHit < CONFIG.HIT_COOLDOWN) {
            controller.userData.canHit = false;
            return;
        }
        controller.userData.canHit = true;
        
        // Verificar colisión con todas las esferas activas
        for (let i = gameState.spheres.length - 1; i >= 0; i--) {
            const sphere = gameState.spheres[i];
            if (!sphere.userData.active) continue;
            
            const sphereBox = new THREE.Box3().setFromObject(sphere);
            const isCorrectController = sphere.userData.isRed === controller.userData.isLeft;
            
            if (controller.userData.hitArea.intersectsBox(sphereBox)) {
                if (isCorrectController) {
                    hitSphere(sphere, i, controller);
                    controller.userData.lastHit = now;
                    
                    // Animación de retroceso
                    new TWEEN.Tween(controller.userData.sword.rotation)
                        .to({ x: Math.PI / 3 }, 100)
                        .yoyo(true)
                        .start();
                } else {
                    gameState.combo = 0;
                    updateScoreDisplay(gameState.score, gameState.combo);
                }
                break;
            }
        }
    });
}

function checkSphereHit(controller) {
    if (!controller.userData.canHit) return;
    
    const now = Date.now();
    if (now - controller.userData.lastHit < CONFIG.HIT_COOLDOWN) return;
    
    for (let i = gameState.spheres.length - 1; i >= 0; i--) {
        const sphere = gameState.spheres[i];
        if (!sphere.userData.active) continue;
        
        const sphereBox = new THREE.Box3().setFromObject(sphere);
        const isCorrectController = sphere.userData.isRed === controller.userData.isLeft;
        
        if (controller.userData.hitArea.intersectsBox(sphereBox)) {
            if (isCorrectController) {
                hitSphere(sphere, i, controller);
                controller.userData.lastHit = now;
                console.log(`✅ Golpe correcto! ${controller.userData.isLeft ? 'Izquierda' : 'Derecha'} (${sphere.userData.isRed ? 'ROJO' : 'AZUL'})`);
                
                // Animación de retroceso
                new TWEEN.Tween(controller.userData.sword.rotation)
                    .to({ x: Math.PI / 3 }, 100)
                    .yoyo(true)
                    .start();
            } else {
                gameState.combo = 0;
                updateScoreDisplay(gameState.score, gameState.combo);
            }
            break;
        }
    }
}

function updateSwordTrail(controller) {
    const trail = controller.userData.sword.userData.trail;
    const positions = new Float32Array(15); // 5 puntos * 3 coordenadas
    
    for (let i = 0; i < 5; i++) {
        const ratio = i / 5;
        const index = i * 3;
        positions[index] = controller.position.x;
        positions[index + 1] = controller.position.y + ratio * 0.1;
        positions[index + 2] = controller.position.z - ratio * 0.2;
    }
    
    trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    new TWEEN.Tween(trail.material)
        .to({ opacity: 0 }, 300)
        .onStart(() => { trail.material.opacity = 0.7; })
        .start();
}

function hitSphere(sphere, index, controller) {
    sphere.userData.active = false;
    
    const reactionTime = Date.now() - sphere.userData.spawnTime;
    const timeBonus = Math.max(0, 500 - reactionTime) / 10;
    const pointsEarned = 100 + (gameState.combo * 10) + Math.floor(timeBonus);
    
    gameState.score += pointsEarned;
    gameState.combo++;

    console.log(`🎯 Puntos: +${pointsEarned} (Combo: ${gameState.combo}) | Tiempo reacción: ${reactionTime}ms`);
    
    updateScoreDisplay(gameState.score, gameState.combo);
    
    // Efectos visuales
    createHitParticles(sphere.position, sphere.material.color);
    createHitFlash(controller.userData.sword.position, controller.userData.color);
    
    // Eliminar esfera
    gameState.scene.remove(sphere);
    gameState.spheres.splice(index, 1);
    
    // Retroalimentación háptica
    gameState.controllers.forEach(c => {
        if (c.gamepad?.hapticActuators?.length > 0) {
            c.gamepad.hapticActuators[0].pulse(0.9, 200);
        }
    });
}

function createHitParticles(position, color) {
    const particleCount = CONFIG.PARTICLE_COUNT;
    const particles = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colorsArray = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
        positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
        positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
        
        sizes[i] = Math.random() * 0.2 + 0.05;
        
        const colorVariation = 0.8 + Math.random() * 0.2;
        colorsArray[i3] = color.r * colorVariation;
        colorsArray[i3 + 1] = color.g * colorVariation;
        colorsArray[i3 + 2] = color.b * colorVariation;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particles.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    gameState.scene.add(particleSystem);
    
    const animateParticles = () => {
        const pos = particles.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i] += (Math.random() - 0.5) * 0.02;
            pos[i + 1] += (Math.random() - 0.5) * 0.02;
            pos[i + 2] += (Math.random() - 0.5) * 0.02;
        }
        particles.attributes.position.needsUpdate = true;
    };
    
    new TWEEN.Tween(particleMaterial)
        .to({ opacity: 0 }, 1000)
        .onUpdate(animateParticles)
        .onComplete(() => gameState.scene.remove(particleSystem))
        .start();
}

function createHitFlash(position, color) {
    const flashGeometry = getGeometry('flash', () => new THREE.SphereGeometry(0.3, 16, 16));
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    gameState.scene.add(flash);
    
    new TWEEN.Tween(flash.scale)
        .to({ x: 1.5, y: 1.5, z: 1.5 }, 200)
        .start();
    
    new TWEEN.Tween(flashMaterial)
        .to({ opacity: 0 }, 300)
        .onComplete(() => gameState.scene.remove(flash))
        .start();
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
    
    // Limpiar caches
    geometryCache.forEach(geom => geom.dispose());
    materialCache.forEach(mat => mat.dispose());
    geometryCache.clear();
    materialCache.clear();
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

function updateScene() {
    for (let i = gameState.spheres.length - 1; i >= 0; i--) {
        const sphere = gameState.spheres[i];
        if (!sphere.userData.active) continue;
        
        sphere.position.add(sphere.userData.velocity);
        
        if (sphere.position.z > 3) {
            gameState.scene.remove(sphere);
            gameState.spheres.splice(i, 1);
            gameState.combo = 0;
            updateScoreDisplay(gameState.score, gameState.combo);
        }
    }
}

function updateControllerTrails() {
    gameState.controllers.forEach(controller => {
        const trail = controller.userData?.sword?.userData?.trail;
        if (trail?.material.opacity > 0) {SPHERE_RADIUS
            trail.material.opacity *= 0.95;
        }
    });
}