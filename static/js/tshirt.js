document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the canvas
    const canvas = document.getElementById('tshirtCanvas');
  
    // 2. Create the renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    // Fill the main area size (which is full screen in our layout)
    function setRendererSize() {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    setRendererSize(); // initial
  
    // 3. Create the scene
    const scene = new THREE.Scene();
    // Light gray (almost white) background
    scene.background = new THREE.Color(0xf5f5f5);
  
    // 4. Create a camera
    const camera = new THREE.PerspectiveCamera(
      60, // field of view
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 5);
  
    // 5. OrbitControls for rotating/zooming
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    // Slightly aim the controls at the shirt's approximate center
    controls.target.set(0, 1, 0);
    controls.update();
  
    // 6. Lights (to avoid a dark backside)
    //    a) Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    //    b) Directional light from above/ front
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
  
    // 7. Load the T-shirt Model
    const loader = new THREE.GLTFLoader();
    loader.load(
      // If "Tshirt.glb" is at static/models/Tshirt.glb, ensure the path is correct:
      '/static/models/Tshirt.glb',
      (gltf) => {
        const tshirtModel = gltf.scene;
        scene.add(tshirtModel);
  
        // --- OPTIONAL: auto-center the model ---
        // Compute bounding box
        const bbox = new THREE.Box3().setFromObject(tshirtModel);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
  
        // Shift the model so it's centered at the origin
        tshirtModel.position.x += (tshirtModel.position.x - center.x);
        tshirtModel.position.y += (tshirtModel.position.y - center.y);
        tshirtModel.position.z += (tshirtModel.position.z - center.z);
  
        // OPTIONAL: scale the shirt if it's too small or huge
        // Example: Make the largest dimension ~2 units
        // const maxDim = Math.max(size.x, size.y, size.z);
        // const scaleFactor = 2.0 / maxDim;
        // tshirtModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
        // Update controls so it rotates around the new center
        controls.target.set(0, 0, 0);
        controls.update();
  
        console.log("T-shirt model loaded and centered!");
      },
      undefined,
      (error) => {
        console.error("Error loading T-shirt model:", error);
      }
    );
  
    // 8. Handle window resize so the scene stays full screen
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      setRendererSize();
    }
  
    // 9. Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  });
  
  








