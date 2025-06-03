// controllers.js - Manejo de controles VR y espadas (versión corregida)
import * as THREE from 'three';
import { gameState, COLORS, CONFIG, getGeometry, getMaterial, updateScoreDisplay } from './config.js';
import * as TWEEN from 'tween.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

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
            canHit: true,
            lastPositions: []
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
        new THREE.LineBasicMaterial({ color: color, linewidth: 2, transparent: true })
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
        sword.getWorldPosition(worldPosition);
        
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
        
        if (gameState.debugMode) {
            if (!controller.userData.hitAreaHelper) {
                const capsuleHelper = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([start, end]),
                    new THREE.LineBasicMaterial({ color: 0xffff00 })
                );
                controller.userData.hitAreaHelper = capsuleHelper;
                sword.add(capsuleHelper);
            }
            controller.userData.hitAreaHelper.visible = true;
            controller.userData.hitAreaHelper.geometry.setFromPoints([start, end]);
        } else if (controller.userData.hitAreaHelper) {
            controller.userData.hitAreaHelper.visible = false;
        }
    });
}

export function updateControllerTrails() {
    gameState.controllers.forEach(controller => {
        const trail = controller.userData?.sword?.userData?.trail;
        if (trail && trail.material.opacity > 0) {
            trail.material.opacity *= 0.95;
            if (trail.material.opacity < 0.01) {
                trail.material.opacity = 0;
            }
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
    
    const positions = new Float32Array(6); // Solo necesitamos 2 puntos para la línea
    const swordTip = new THREE.Vector3(0, 0, -0.7);
    const swordBase = new THREE.Vector3(0, 0, 0);
    
    swordTip.applyMatrix4(controller.matrixWorld);
    swordBase.applyMatrix4(controller.matrixWorld);
    
    positions[0] = swordBase.x;
    positions[1] = swordBase.y;
    positions[2] = swordBase.z;
    positions[3] = swordTip.x;
    positions[4] = swordTip.y;
    positions[5] = swordTip.z;
    
    trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    trail.material.opacity = 0.7 * intensity;
    trail.material.color.set(controller.userData.color);
    
    new TWEEN.Tween(trail.material)
        .to({ opacity: 0 }, 300)
        .start();
}

function checkSphereHit(controller) {
    if (!controller.userData.canHit) return;
    
    const now = Date.now();
    if (now - controller.userData.lastHit < CONFIG.HIT_COOLDOWN) return;
    
    for (let i = gameState.spheres.length - 1; i >= 0; i--) {
        const sphere = gameState.spheres[i];
        if (!sphere.userData.active) continue;
        
        const spherePos = new THREE.Vector3();
        sphere.getWorldPosition(spherePos);
        const sphereRadius = CONFIG.SPHERE_RADIUS * sphere.scale.x;
        
        const isCorrectController = sphere.userData.isRed === controller.userData.isLeft;
        const hitArea = controller.userData.hitArea;
        
        const closestPoint = new THREE.Vector3();
        const line = new THREE.Line3(hitArea.start, hitArea.end);
        line.closestPointToPoint(spherePos, true, closestPoint);
        
        const distance = closestPoint.distanceTo(spherePos);
        
        if (distance < (hitArea.radius + sphereRadius)) {
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
    
    // Eliminar la esfera correctamente
    gameState.scene.remove(sphere);
    sphere.geometry.dispose();
    sphere.material.dispose();
    gameState.spheres.splice(index, 1);
    
    // Feedback háptico
    gameState.controllers.forEach(c => {
        if (c.gamepad?.hapticActuators?.length > 0) {
            c.gamepad.hapticActuators[0].pulse(0.9, 200);
        }
    });
}

function createSphereHalves(originalSphere, controller) {
    const halfGeometry = new THREE.SphereGeometry(
        CONFIG.SPHERE_RADIUS, 
        32, 
        32, 
        0, 
        Math.PI * 2, 
        0, 
        Math.PI
    );
    
    const material = originalSphere.material.clone();
    material.transparent = true;
    
    const halves = [];
    for (let i = 0; i < 2; i++) {
        const half = new THREE.Mesh(halfGeometry, material);
        half.position.copy(originalSphere.position);
        half.quaternion.copy(originalSphere.quaternion);
        half.rotation.z = i === 0 ? 0 : Math.PI;
        
        half.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.1
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            createdAt: Date.now()
        };
        
        gameState.scene.add(half);
        halves.push(half);
    }
    
    // Animación y eliminación de las mitades
    const animateHalves = () => {
        const now = Date.now();
        const shouldRemove = [];
        
        halves.forEach((half, index) => {
            const age = now - half.userData.createdAt;
            const progress = age / 1000; // 1 segundo de vida
            
            if (progress >= 1) {
                shouldRemove.push(index);
            } else {
                half.position.add(half.userData.velocity);
                half.rotation.x += half.userData.rotationSpeed.x;
                half.rotation.y += half.userData.rotationSpeed.y;
                half.rotation.z += half.userData.rotationSpeed.z;
                half.material.opacity = 1 - progress;
            }
        });
        
        // Eliminar mitades que han terminado su vida
        shouldRemove.reverse().forEach(index => {
            const half = halves[index];
            gameState.scene.remove(half);
            half.geometry.dispose();
            half.material.dispose();
            halves.splice(index, 1);
        });
        
        if (halves.length > 0) {
            requestAnimationFrame(animateHalves);
        }
    };
    
    animateHalves();
}

function createHitParticles(position, color) {
    const particleCount = CONFIG.PARTICLE_COUNT;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = position.x + (Math.random() - 0.5) * 0.3;
        positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
        positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
        
        sizes[i] = Math.random() * 0.1 + 0.05;
        
        const hueVariation = Math.random() * 0.1 - 0.05;
        const tempColor = new THREE.Color(color).offsetHSL(hueVariation, 0, 0);
        colors[i3] = tempColor.r;
        colors[i3 + 1] = tempColor.g;
        colors[i3 + 2] = tempColor.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
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
    const duration = 1000;
    
    const animateParticles = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            gameState.scene.remove(particleSystem);
            particles.dispose();
            particleMaterial.dispose();
            return;
        }
        
        // Actualizar posiciones
        const posArray = particles.attributes.position.array;
        for (let i = 0; i < posArray.length; i += 3) {
            posArray[i] += (Math.random() - 0.5) * 0.01;
            posArray[i + 1] += Math.random() * 0.02;
            posArray[i + 2] += (Math.random() - 0.5) * 0.01;
        }
        particles.attributes.position.needsUpdate = true;
        
        // Actualizar opacidad
        particleMaterial.opacity = 1 - progress;
        
        requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
}

export function checkContinuousHits() {
    const now = Date.now();
    const tempLine = new THREE.Line3();
    const tempVector = new THREE.Vector3();
    
    gameState.controllers.forEach(controller => {
        if (!controller.userData.canHit || !controller.userData.hitArea) return;
        if (now - controller.userData.lastHit < CONFIG.HIT_COOLDOWN) return;
        
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
                    
                    // Actualizar trail con más intensidad
                    updateSwordTrail(controller, 1.5);
                } else {
                    gameState.combo = 0;
                    updateScoreDisplay(gameState.score, gameState.combo);
                }
                break;
            }
        }
    });
}


function createHitFlash(position, color) {
    const flashGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
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
        .onComplete(() => {
            gameState.scene.remove(flash);
            flashGeometry.dispose();
            flashMaterial.dispose();
        })
        .start();
}