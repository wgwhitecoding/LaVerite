document.addEventListener('DOMContentLoaded', () => {
    // === 1. Get DOM Elements ===
    const canvas = document.getElementById('tshirtCanvas');
    const colorBtns = document.querySelectorAll('.color-btn');
    const customColorInput = document.getElementById('customColor');
    const uploadImageInput = document.getElementById('uploadImage');
  
    // === 2. Set up Three.js renderer ===
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    function resizeRenderer() {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    resizeRenderer();
  
    // === 3. Scene & Camera ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
  
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    // Put camera fairly close
    camera.position.set(0, 1.5, 3);
  
    // === 4. OrbitControls for rotating/zooming the T-shirt ===
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
    orbitControls.target.set(0, 1, 0); // Aim around chest height
    orbitControls.update();
  
    // === 5. Basic Lighting ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
  
    // === 6. Load T-Shirt Model ===
    const loader = new THREE.GLTFLoader();
    let tshirtMesh = null; // We'll store reference to the T-shirt mesh or scene
    loader.load(
      '/static/models/Tshirt.glb',
      (gltf) => {
        tshirtMesh = gltf.scene;
        scene.add(tshirtMesh);
  
        // OPTIONAL: Center the T-shirt
        const bbox = new THREE.Box3().setFromObject(tshirtMesh);
        const center = bbox.getCenter(new THREE.Vector3());
        tshirtMesh.position.x -= center.x;
        tshirtMesh.position.y -= center.y;
        tshirtMesh.position.z -= center.z;
  
        // If you want to scale it bigger or smaller, do so here:
        // const size = bbox.getSize(new THREE.Vector3());
        // const maxDim = Math.max(size.x, size.y, size.z);
        // const scaleFactor = 2 / maxDim;
        // tshirtMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
        console.log('T-Shirt loaded!');
      },
      undefined,
      (err) => console.error('Error loading T-shirt:', err)
    );
  
    // === 7. Material Handling: We'll make a single material we can recolor. ===
    // If the T-shirt model has multiple materials, you might need to set them all.
    // We'll set a "default" color and override once it's loaded.
  
    // We'll store the last color chosen
    let currentColor = '#ffffff';
  
    function setTshirtColor(hexColor) {
      currentColor = hexColor;
      if (tshirtMesh) {
        tshirtMesh.traverse((node) => {
          if (node.isMesh) {
            // Ensure node.material is a standard or basic material
            if (!node.material || !('color' in node.material)) return;
            node.material.color.set(hexColor);
          }
        });
      }
    }
  
    // === 8. Preset Color Buttons ===
    colorBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const hex = e.target.getAttribute('data-color');
        setTshirtColor(hex);
      });
    });
  
    // === 9. Custom Color Picker ===
    customColorInput.addEventListener('input', (e) => {
      setTshirtColor(e.target.value);
    });
  
    // === 10. Uploading a Print (Image) ===
    // We'll create a plane with the image as texture and let user place it with TransformControls.
    let transformControls; 
    let stickerMesh = null;
  
    uploadImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = function(loadEvent) {
        const imgUrl = loadEvent.target.result;
  
        // Create texture from the uploaded image
        const texture = new THREE.TextureLoader().load(imgUrl);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
  
        // If we already have a sticker, remove it first
        if (stickerMesh) {
          scene.remove(stickerMesh);
          transformControls.detach(stickerMesh);
          stickerMesh = null;
        }
  
        // Create a plane geometry for the sticker
        const stickerGeom = new THREE.PlaneGeometry(0.5, 0.5); 
        const stickerMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
  
        // Put it in front of the T-shirt
        stickerMesh.position.set(0, 1, 0.2);
        scene.add(stickerMesh);
  
        // Add transform controls so user can move/rotate the sticker
        if (!transformControls) {
          transformControls = new THREE.TransformControls(camera, renderer.domElement);
          transformControls.addEventListener('change', render);
          // By default, let's allow translation + rotation, but not scale
          transformControls.setMode('translate'); 
          scene.add(transformControls);
        }
        transformControls.attach(stickerMesh);
        
        console.log("Sticker placed on T-shirt!");
      };
      reader.readAsDataURL(file);
    });
  
    // === 11. TransformControls config ===
    // (We can add some event listeners for key presses to switch between
    // translate/rotate/scale if we want.)
    window.addEventListener('keydown', (event) => {
      if (!transformControls) return;
      switch (event.key) {
        case 'w': // W -> translate
          transformControls.setMode('translate');
          break;
        case 'e': // E -> rotate
          transformControls.setMode('rotate');
          break;
        case 'r': // R -> scale
          transformControls.setMode('scale');
          break;
      }
    });
  
    // === 12. Handle Window Resizing ===
    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      resizeRenderer();
    });
  
    // === 13. Animation / Render Loop ===
    function animate() {
      requestAnimationFrame(animate);
      orbitControls.update();
      render();
    }
  
    function render() {
      renderer.render(scene, camera);
    }
    animate();
  });
  
  
  








