const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.setClearColor(0x87CEEB, 1); // Sky blue color

const grassTexture = new THREE.TextureLoader().load('textures/grass.png');

const chunkSize = 16; // Size of each chunk
const renderDistanceChunks = 6; // Adjust render distance to prevent lag
const noiseScale = 0.1;
const simplex = new SimplexNoise();

let chunks = {}; // Store generated chunks

// Function to generate a chunk
function generateChunk(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    if (chunks[chunkKey]) return; // Skip if chunk already generated

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const faces = []; // Store indices for the faces
    const uvs = []; // Store UVs for the texture

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = cx * chunkSize + x;
            const worldZ = cz * chunkSize + z;
            const height = Math.floor(simplex.noise2D(worldX * noiseScale, worldZ * noiseScale) * 5);

            for (let y = 0; y <= height; y++) {
                const position = new THREE.Vector3(worldX, y, worldZ);

                // Check if adjacent blocks exist to determine which faces to render
                const neighbors = [
                    { dx: 0, dy: 0, dz: -1 }, // Back
                    { dx: 0, dy: 0, dz: 1 },  // Front
                    { dx: -1, dy: 0, dz: 0 }, // Left
                    { dx: 1, dy: 0, dz: 0 },  // Right
                    { dx: 0, dy: -1, dz: 0 }, // Bottom
                    { dx: 0, dy: 1, dz: 0 },  // Top
                ];

                // Define the vertices and faces for each visible side
                neighbors.forEach((neighbor) => {
                    const nx = worldX + neighbor.dx;
                    const ny = y + neighbor.dy;
                    const nz = worldZ + neighbor.dz;

                    // Check if the neighboring position is empty (no block)
                    const neighborKey = `${Math.floor(nx / chunkSize)},${Math.floor(nz / chunkSize)}`;
                    const neighborHeight = chunks[neighborKey] ? Math.floor(simplex.noise2D(nx * noiseScale, nz * noiseScale) * 5) : -1;

                    if (neighborHeight < ny) { // Render this face if there's no block
                        const faceVertices = [
                            position.x, position.y, position.z, // Bottom-left
                            position.x + 1, position.y, position.z, // Bottom-right
                            position.x + 1, position.y + 1, position.z, // Top-right
                            position.x, position.y + 1, position.z, // Top-left
                        ];

                        const faceOffset = vertices.length / 3; // Current vertex count
                        vertices.push(...faceVertices);
                        faces.push(faceOffset, faceOffset + 1, faceOffset + 2, faceOffset, faceOffset + 2, faceOffset + 3); // Two triangles for each face

                        // UV Mapping (assuming a single texture for all sides)
                        const uvVertices = [
                            0, 0,
                            1, 0,
                            1, 1,
                            0, 1,
                        ];
                        uvs.push(...uvVertices);
                    }
                });
            }
        }
    }

    // Set vertices, faces, and uvs to the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(faces);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const material = new THREE.MeshBasicMaterial({ map: grassTexture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    chunks[chunkKey] = true; // Mark chunk as generated
}

// Generate chunks around the player
function generateChunksAroundPlayer() {
    const playerChunkX = Math.floor(camera.position.x / chunkSize);
    const playerChunkZ = Math.floor(camera.position.z / chunkSize);

    for (let x = -renderDistanceChunks; x <= renderDistanceChunks; x++) {
        for (let z = -renderDistanceChunks; z <= renderDistanceChunks; z++) {
            generateChunk(playerChunkX + x, playerChunkZ + z);
        }
    }
}

// Position the camera
camera.position.set(25, 0.4, 25);

// Player controls
const playerSpeed = 0.1;
let isJumping = false;
const keys = {};

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

// Function to handle player movement
function updatePlayer() {
    // Calculate the target height based on the ground height
    const playerChunkX = Math.floor(camera.position.x / chunkSize);
    const playerChunkZ = Math.floor(camera.position.z / chunkSize);
    const groundHeight = Math.floor(simplex.noise2D(camera.position.x * noiseScale, camera.position.z * noiseScale) * 5);

    // Update camera's vertical position to stay on top of the ground
    if (camera.position.y > groundHeight + 2) {
        camera.position.y -= 0.1; // Simple gravity effect
        isJumping = true;
    } else {
        camera.position.y = groundHeight + 2; // Ensure the camera stays at the correct height
        isJumping = false; // Reset jumping when hitting the ground
    }

    // Handle horizontal movement
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction); // Get the direction the camera is facing
    direction.y = 0; // Ignore vertical direction for horizontal movement
    direction.normalize(); // Normalize direction to ensure consistent speed

    if (keys['KeyW']) {
        camera.position.x += direction.x * playerSpeed;
        camera.position.z += direction.z * playerSpeed;
    } 
    if (keys['KeyS']) {
        camera.position.x -= direction.x * playerSpeed;
        camera.position.z -= direction.z * playerSpeed;
    } 
    if (keys['KeyA']) {
        camera.position.x -= direction.z * playerSpeed; // Move left
        camera.position.z += direction.x * playerSpeed; // Move left
    } 
    if (keys['KeyD']) {
        camera.position.x += direction.z * playerSpeed; // Move right
        camera.position.z -= direction.x * playerSpeed; // Move right
    }

    // Jumping logic
    if (keys['Space'] && !isJumping) {
        camera.position.y += 0.5; // Simple jump effect
        isJumping = true;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    generateChunksAroundPlayer(); // Generate chunks around the player
    updatePlayer(); // Update player movement
    renderer.render(scene, camera);
}

// Start animation loop
animate();
