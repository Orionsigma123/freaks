const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.setClearColor(0x87CEEB, 1); // Sky blue color

// Textures
const grassTexture = new THREE.TextureLoader().load('textures/grass.png');

// Inventory
const inventory = [];

// Constants for Perlin noise and chunk generation
let blockSize = 1;
const chunkSize = 16; // Each chunk is 16x16 blocks
const noiseScale = 0.1;
const simplex = new SimplexNoise();

let chunks = {}; // Store generated chunks

// Function to create a block
function createBlock(x, y, z, texture) {
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const block = new THREE.Mesh(geometry, material);
    block.position.set(x * blockSize, y * blockSize, z * blockSize);
    scene.add(block);
    return block;
}

// Function to generate a chunk based on the chunk coordinates (cx, cz)
function generateChunk(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    if (chunks[chunkKey]) return; // Chunk already generated

    const blocks = [];
    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = cx * chunkSize + x;
            const worldZ = cz * chunkSize + z;
            const height = Math.floor(simplex.noise2D(worldX * noiseScale, worldZ * noiseScale) * 5);

            for (let y = 0; y <= height; y++) {
                const block = createBlock(worldX, y, worldZ, grassTexture);
                blocks.push(block); // Store block in this chunk
            }
        }
    }
    chunks[chunkKey] = blocks; // Save generated blocks in the chunk
}

// Only generate the chunk the player is in
function generateChunksAroundPlayer() {
    const playerChunkX = Math.floor(camera.position.x / (chunkSize * blockSize));
    const playerChunkZ = Math.floor(camera.position.z / (chunkSize * blockSize));
    generateChunk(playerChunkX, playerChunkZ);
}

// Position the camera
camera.position.set(25, 0.4, 25);

// Player controls and movement logic
const playerSpeed = 0.1;
let velocity = new THREE.Vector3(0, 0, 0);
let isJumping = false;
const keys = {};

// Handle key events
window.addEventListener('keydown', (event) => keys[event.code] = true);
window.addEventListener('keyup', (event) => keys[event.code] = false);

function updatePlayer() {
    velocity.set(0, 0, 0);

    if (keys['KeyS']) velocity.z = playerSpeed; // Move backward
    if (keys['KeyW']) velocity.z = -playerSpeed; // Move forward
    if (keys['KeyA']) velocity.x = -playerSpeed; // Move left
    if (keys['KeyD']) velocity.x = playerSpeed; // Move right
    if (keys['Space'] && !isJumping) {
        isJumping = true;
        velocity.y = 0.3; // Jump force
    }

    if (camera.position.y > 2) velocity.y -= 0.1; // Apply gravity
    else {
        isJumping = false;
        camera.position.y = 2;
        velocity.y = 0;
    }

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    camera.position.x += direction.x * -velocity.z;
    camera.position.z += direction.z * -velocity.z;
    camera.position.y += velocity.y;

    // Generate only the current chunk
    generateChunksAroundPlayer();
}

// Window resize event
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Mouse lock for camera control
document.body.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement) {
        camera.rotation.y -= event.movementX * 0.002;
        camera.rotation.x -= event.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x)); // Clamp vertical rotation
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    renderer.render(scene, camera);
}

// Start the animation loop
animate();
