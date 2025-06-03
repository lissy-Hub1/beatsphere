// controllers.js - Manejo de controles VR y espadas
import * as THREE from 'three';
import { gameState, COLORS, CONFIG } from './config.js';
import * as TWEEN from 'tween.js';

export function setupControllers() {
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
        
        const grip = gameState.renderer.xr.getControllerGrip(controller);
        const model = controllerModelFactory.createControllerModel(grip);
        grip.add(model);
        gameState.scene.add(grip);
        
        controller.addEventListener('selectstart', () => onControllerSelect(controller));
    });
}

function createSword(controller, color) {
    const bladeGeometry = getGeometry('blade', () => new THREE.BoxGeometry(0.1, 0.02, 0.7));
    const guardGeometry = getGeometry('guard', () => new THREE.BoxGeometry(0.15, 0.02, 0.02));
    const handleGeometry = getGeometry('handle', () => new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8));
    
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
    
    const swordTrail = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: color, linewidth: 2 })
    );
    sword.userData.trail = swordTrail;
    sword.add(swordTrail);
    
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
    
    controller.userData.hitAreaHelper = new THREE.Box3Helper(controller.userData.hitArea, 0xffff00);
    controller.userData.hitAreaHelper.visible = gameState.debugMode;
    sword.add(controller.userData.hitAreaHelper);
    
    controller.add(sword);
    controller.userData.sword = sword;
}

export function updateControllerHitAreas() {
    gameState.controllers.forEach(controller => {
        if (!controller.userData?.sword) return;
        
        const sword = controller.userData.sword;
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        
        sword.getWorldPosition(worldPosition);
        sword.getWorldQuaternion(worldQuaternion);
        sword.getWorldScale(worldScale);
        
        const start = new THREE.Vector3(0, 0, 0);
        const end = new THREE.Vector3(0, 0, -0.7);
        const radius = 0.15;
        
        start.applyMatrix4(sword.matrixWorld);
        end.applyMatrix4(sword.matrixWorld);
        
        controller.userData.hitArea = {
            start: start,
            end: end,
            radius: radius,
            helper: controller.userData.hitAreaHelper
        };
        
        if (gameState.debugMode && !controller.userData.hitAreaHelper) {
            const capsuleHelper = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([start, end]),
                new THREE.LineBasicMaterial({ color: 0xffff00 })
            );
            controller.userData.hitAreaHelper = capsuleHelper;
            sword.add(capsuleHelper);
        }
        
        if (controller.userData.hitAreaHelper) {
            controller.userData.hitAreaHelper.visible = gameState.debugMode;
            if (gameState.debugMode) {
                controller.userData.hitAreaHelper.geometry.setFromPoints([start, end]);
            }
        }
    });
}

export function updateControllerTrails() {
    gameState.controllers.forEach(controller => {
        const trail = controller.userData?.sword?.userData?.trail;
        if (trail?.material.opacity > 0) {
            trail.material.opacity *= 0.95;
        }
    });
}

function onControllerSelect(controller) {
    checkSphereHit(controller);
    updateSwordTrail(controller);
}

function updateSwordTrail(controller, intensity = 1.0) {
    const trail = controller.userData.sword.userData.trail;
    if (!trail) return;
    
    const positions = new Float32Array(30);
    const swordTip = new THREE.Vector3(0, 0, -0.7);
    
    for (let i = 0; i < 10; i++) {
        const ratio = i / 10;
        const index = i * 3;
        const pos = controller.userData.lastPositions?.[i] || controller.position;
        
        swordTip.applyMatrix4(controller.matrixWorld);
        positions[index] = swordTip.x;
        positions[index + 1] = swordTip.y;
        positions[index + 2] = swordTip.z;
        
        if (!controller.userData.lastPositions) {
            controller.userData.lastPositions = [];
        }
        controller.userData.lastPositions[i] = swordTip.clone();
    }
    
    trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    new TWEEN.Tween(trail.material)
        .to({ opacity: 0 }, 300 * intensity)
        .onStart(() => { 
            trail.material.opacity = 0.5 * intensity;
            trail.material.color.setHSL(intensity * 0.2, 1, 0.5); 
        })
        .start();
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

function checkContinuousHits() {
    const now = Date.now();
    const tempLine = new THREE.Line3();
    const tempVector = new THREE.Vector3();
    
    gameState.controllers.forEach(controller => {
        if (!controller.userData.canHit || !controller.userData.hitArea) return;
        
        const { start, end, radius } = controller.userData.hitArea;
        tempLine.set(start, end);
        
        for (let i = gameState.spheres.length - 1; i >= 0; i--) {
            const sphere = gameState.spheres[i];
            if (!sphere.userData.active) continue;
            
            const sphereCenter = new THREE.Vector3();
            sphere.getWorldPosition(sphereCenter);
            const sphereRadius = CONFIG.SPHERE_RADIUS * sphere.scale.x;
            
            tempLine.closestPointToPoint(sphereCenter, true, tempVector);
            const distance = tempVector.distanceTo(sphereCenter);
            
            if (distance < (radius + sphereRadius)) {
                const isCorrectController = sphere.userData.isRed === controller.userData.isLeft;
                
                if (isCorrectController) {
                    hitSphere(sphere, i, controller);
                    controller.userData.lastHit = now;
                    
                    if (controller.gamepad?.hapticActuators?.length > 0) {
                        const intensity = Math.min(1.0, 0.5 + (gameState.combo * 0.05));
                        controller.gamepad.hapticActuators[0].pulse(intensity, 100);
                    }
                } else {
                    gameState.combo = 0;
                    updateScoreDisplay(gameState.score, gameState.combo);
                }
                break;
            }
        }
    });
}

function hitSphere(sphere, index, controller) {
    sphere.userData.active = false;
    
    const reactionTime = Date.now() - sphere.userData.spawnTime;
    const timeBonus = Math.max(0, 500 - reactionTime) / 10;
    const pointsEarned = 100 + (gameState.combo * 10) + Math.floor(timeBonus);
    
    gameState.score += pointsEarned;
    gameState.combo++;

    updateScoreDisplay(gameState.score, gameState.combo);
    
    createSphereHalves(sphere, controller);
    createHitParticles(sphere.position, sphere.material.color);
    createHitFlash(controller.userData.sword.position, controller.userData.color);
    
    gameState.scene.remove(sphere);
    gameState.spheres.splice(index, 1);
    
    gameState.controllers.forEach(c => {
        if (c.gamepad?.hapticActuators?.length > 0) {
            c.gamepad.hapticActuators[0].pulse(0.9, 200);
        }
    });
}

function createSphereHalves(originalSphere, controller) {
    const halfSphereGeometry = new THREE.SphereGeometry(
        CONFIG.SPHERE_RADIUS, 
        32, 
        32, 
        0, 
        Math.PI * 2, 
        0, 
        Math.PI / 2
    );
    
    const material = originalSphere.material.clone();
    const halves = [];
    
    for (let i = 0; i < 2; i++) {
        const half = new THREE.Mesh(halfSphereGeometry, material);
        half.position.copy(originalSphere.position);
        half.quaternion.copy(originalSphere.quaternion);
        half.rotation.x = i === 0 ? 0 : Math.PI;
        
        half.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() + 0.5) * 0.05
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            lifetime: 2000
        };
        
        gameState.scene.add(half);
        halves.push(half);
    }
    
    const startTime = Date.now();
    
    function updateHalves() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = elapsed / 2000;
        
        if (progress >= 1) {
            halves.forEach(half => gameState.scene.remove(half));
            return;
        }
        
        halves.forEach(half => {
            half.position.x += half.userData.velocity.x;
            half.position.y += half.userData.velocity.y;
            half.position.z += half.userData.velocity.z;
            
            half.rotation.x += half.userData.rotationSpeed.x;
            half.rotation.y += half.userData.rotationSpeed.y;
            half.rotation.z += half.userData.rotationSpeed.z;
            
            half.material.opacity = 1 - progress;
        });
        
        if (progress < 1) {
            requestAnimationFrame(updateHalves);
        }
    }
    
    updateHalves();
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
    
    const startTime = Date.now();
    
    const animateParticles = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = elapsed / 2000;
        
        if (progress >= 1) {
            gameState.scene.remove(particleSystem);
            particles.dispose();
            particleMaterial.dispose();
            return;
        }
        
        const pos = particles.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i] += (Math.random() - 0.5) * 0.02;
            pos[i + 1] += (Math.random() - 0.5) * 0.02;
            pos[i + 2] += (Math.random() - 0.5) * 0.02;
        }
        particles.attributes.position.needsUpdate = true;
        
        particleMaterial.opacity = 1 - progress;
        
        if (progress < 1) {
            requestAnimationFrame(animateParticles);
        }
    };
    
    animateParticles();
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