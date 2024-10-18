const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.setClearColor(0x87CEEB, 1); // Sky blue color

const grassTexture = new THREE.TextureLoader().load('textures/grass.png');

let blockSize = 1;
const chunkSize = 32; // Larger chunk size to reduce chunk count
const renderDistanceChunks = 8; // Reduced render distance for better performance
const noiseScale = 0.1;
const simplex = new SimplexNoise();

let chunks = {};
let chunksToGenerate = []; // List of chunks to generate progressively

// Create block with instanced mesh to improve performance
const blockGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
const blockMaterial = new THREE.MeshBasicMaterial({ map: grassTexture });
const blockMesh = new THREE.InstancedMesh(blockGeometry, blockMaterial, chunkSize * chunkSize * 10); // Pre-allocate for 10 layers of blocks per chunk

scene.add(blockMesh);

// Function to generate a chunk and add it to the chunksToGenerate queue
function queueChunkGeneration(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    if (!chunks[chunkKey]) {
        chunksToGenerate.push({ cx, cz });
    }
}

// Function to generate chunk progressively
function generateChunk(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    if (chunks[chunkKey]) return;

    const blocks = [];
    let blockIndex = 0; // Track instanced mesh position

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = cx * chunkSize + x;
            const worldZ = cz * chunkSize + z;
            const height = Math.floor(simplex.noise2D(worldX * noiseScale, worldZ * noiseScale) * 5);

            for (let y = 0; y <= height; y++) {
                const position = new THREE.Vector3(worldX * blockSize, y * blockSize, worldZ * blockSize);
                const matrix = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
                blockMesh.setMatrixAt(blockIndex, matrix); // Set the block in the instanced mesh
                blockIndex++;
            }
        }
    }

    blockMesh.instanceMatrix.needsUpdate = true; // Ensure instanced mesh updates
    chunks[chunkKey] = blocks; // Store generated chunk
}

// Generate chunks within render distance
function generateChunksInRenderDistance() {
    const playerChunkX = Math.floor(camera.position.x / (chunkSize * blockSize));
    const playerChunkZ = Math.floor(camera.position.z / (chunkSize * blockSize));

    for (let x = -renderDistanceChunks; x <= renderDistanceChunks; x++) {
        for (let z = -renderDistanceChunks; z <= renderDistanceChunks; z++) {
            queueChunkGeneration(playerChunkX + x, playerChunkZ + z);
        }
    }
}

// Remove distant chunks
function removeDistantChunks() {
    const playerChunkX = Math.floor(camera.position.x / (chunkSize * blockSize));
    const playerChunkZ = Math.floor(camera.position.z / (chunkSize * blockSize));

    for (let key in chunks) {
        const [cx, cz] = key.split(',').map(Number);
        const distX = Math.abs(cx - playerChunkX);
        const distZ = Math.abs(cz - playerChunkZ);

        if (distX > renderDistanceChunks || distZ > renderDistanceChunks) {
            delete chunks[key]; // Delete chunks outside of render distance
        }
    }
}

// Progressive chunk generation (limit the number of chunks generated per frame)
function progressiveChunkGeneration() {
    const chunksToProcess = Math.min(chunksToGenerate.length, 2); // Limit to 2 chunks per frame
    for (let i = 0; i < chunksToProcess; i++) {
        const { cx, cz } = chunksToGenerate.shift(); // Generate chunk from queue
        generateChunk(cx, cz);
    }
}

// Position the camera
camera.position.set(25, 0.4, 25);

// Player movement logic
const playerSpeed = 0.1;
let velocity = new THREE.Vector3(0, 0, 0);
const keys = {};

window.addEventListener('keydown', (event) => keys[event.code] = true);
window.addEventListener('keyup', (event) => keys[event.code] = false);

function updatePlayer() {
    velocity.set(0, 0, 0);

    if (keys['KeyS']) velocity.z = playerSpeed; // Move backward
    if (keys['KeyW']) velocity.z = -playerSpeed; // Move forward
    if (keys['KeyA']) velocity.x = -playerSpeed; // Move left
    if (keys['KeyD']) velocity.x = playerSpeed; // Move right

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    camera.position.x += direction.x * -velocity.z;
    camera.position.z += direction.z * -velocity.z;

    // Queue chunk generation for the current camera position
    generateChunksInRenderDistance();
    removeDistantChunks();
}

// Window resize event
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    progressiveChunkGeneration(); // Generate chunks progressively
    renderer.render(scene, camera);
}

// Start animation loop
animate();
