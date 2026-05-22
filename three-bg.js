// Wait for Three.js to load
document.addEventListener('DOMContentLoaded', () => {
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Setup scene, camera, renderer
    const container = document.getElementById('webgl-container');
    if (!container) return;
    
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Create the Point Cloud (representing a hyper-spherical manifold / latent space)
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const colorTeal = new THREE.Color(0x00f2fe);
    const colorPurple = new THREE.Color(0x4facfe);
    
    for (let i = 0; i < particleCount; i++) {
        // Generate points on a sphere (Fibonacci lattice for even distribution)
        const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
        
        // Base radius
        let r = 120;
        
        // Add organic noise to make it look like a latent manifold or brain scan
        const noise = Math.sin(phi * 4) * Math.cos(theta * 3) * 15;
        r += noise;
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Interpolate colors based on depth (z)
        const mixedColor = colorTeal.clone().lerp(colorPurple, (z + 150) / 300);
        
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create a circular texture for round particles instead of squares
    const circleCanvas = document.createElement('canvas');
    circleCanvas.width = 16;
    circleCanvas.height = 16;
    const ctx = circleCanvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    const circleTexture = new THREE.CanvasTexture(circleCanvas);
    
    // Material for glowing points
    const material = new THREE.PointsMaterial({
        size: 1.5,
        map: circleTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.8, // Opacity of the points themselves
        alphaTest: 0.05,
        blending: THREE.NormalBlending, // Normal blending works on both dark and light backgrounds
        sizeAttenuation: true
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    
    // Rotate the system slightly to look interesting
    particleSystem.rotation.x = Math.PI / 4;
    scene.add(particleSystem);
    
    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.0005;
        mouseY = (event.clientY - windowHalfY) * 0.0005;
    });
    
    // Animation Loop
    const clock = new THREE.Clock();
    
    function animate() {
        if (!prefersReducedMotion.matches) {
            requestAnimationFrame(animate);
        }
        
        const elapsedTime = clock.getElapsedTime();
        
        // Smooth mouse following
        targetX = mouseX * 0.5;
        targetY = mouseY * 0.5;
        
        particleSystem.rotation.y += 0.05 * (targetX - particleSystem.rotation.y);
        particleSystem.rotation.x += 0.05 * (targetY - particleSystem.rotation.x) + 0.001; // Constant slow rotation
        
        // Optional: animate points slightly
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            // Add a very subtle wave effect based on time
            positions[ix + 1] += Math.sin(elapsedTime * 2 + positions[ix]) * 0.02;
        }
        geometry.attributes.position.needsUpdate = true;
        
        renderer.render(scene, camera);
    }
    
    // Start animation
    animate();
    
    // Handle Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
