import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { WEBGL } from 'three/addons/capabilities/WebGL.js';

import * as Config from './config.js';

let username = '';
const usernameInput = document.getElementById('username-input');

usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        username = usernameInput.value;
        usernameInput.style.display = 'none';
        init();
        animate();
    }
});

let scene, camera, renderer, controls, startPortal, exitPortal, player, composer;
let speed = Config.DEFAULT_SPEED; // Default speed
let playerColor = Config.DEFAULT_COLOR;
let params = new URLSearchParams(window.location.search);

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5); // Adjust initial camera position

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    scene.add(ground);

    // Player setup
    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 2, 20);
    playerColor = params.get('color') || Config.DEFAULT_COLOR;
    const playerMaterial = new THREE.MeshStandardMaterial({ color: playerColor });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(player);

    // Get params from URL
    const portal = params.get('portal') === 'true';
    const ref = params.get('ref');
    speed = parseFloat(params.get('speed')) || Config.DEFAULT_SPEED;

    if (portal && ref) {
        // Create start portal
        startPortal = createPortal(ref, 0x00ffff, 'Return Portal');
        scene.add(startPortal);
        player.position.set(0, 1, -5); // Spawn near the start portal
    } else {
        player.position.set(0, 1, 0); // Default spawn point
    }

    // Exit portal
    exitPortal = createPortal('http://portal.pieter.com', 0xff00ff, 'Vibeverse Portal');
    exitPortal.position.set(5, 1, 5);
    scene.add(exitPortal);

    // Postprocessing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1;
    bloomPass.radius = 0.2;
    composer.addPass(bloomPass);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function createPortal(url, color, labelText) {
    const portalGroup = new THREE.Group();

    // Portal Frame
    const portalGeometry = new THREE.TorusGeometry(1.5, 0.2, 32, 100);
    const portalMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.rotation.x = Math.PI / 2;
    portalGroup.add(portal);

    // Portal Label
    const labelGeometry = new THREE.PlaneGeometry(3, 1);
    const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(0, 2, 0);
    portalGroup.add(label);

    // Load Font and Create Text
    const loader = new THREE.FontLoader();

    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry(labelText, {
            font: font,
            size: 0.5,
            height: 0.2,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: 5
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(-1, 1.6, 0.2);
        label.add(textMesh);
    });

    portal.userData = { url: url }; // Store the URL for portal navigation

    return portalGroup;
}

function checkPortalCollision() {
    if (startPortal && player.position.distanceTo(startPortal.position) < 2) {
        window.location.href = startPortal.userData.url;
    }
    if (exitPortal && player.position.distanceTo(exitPortal.position) < 2) {
        // Construct the URL with parameters
        let url = exitPortal.userData.url;
        url += `?username=${username}&color=${playerColor}&speed=${speed}&ref=${window.location.href}`; // Ensure username is encoded
        window.location.href = url;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight); // Update composer size
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    checkPortalCollision();
    composer.render(); // Use composer for rendering
}

if (WEBGL.isWebGLAvailable()) {

} else {

    var warning = WEBGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);

}

