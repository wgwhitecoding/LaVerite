// static/js/tshirt.js

document.addEventListener('DOMContentLoaded', () => {
    // =============== 1) DOM Elements ===============
    const canvas = document.getElementById('tshirtCanvas');
  
    const productBtns = document.querySelectorAll('.product-btn');
    const colorBtns = document.querySelectorAll('.color-btn');
    const customColorInput = document.getElementById('customColor');
    const uploadImageInput = document.getElementById('uploadImage');
    const textInput = document.getElementById('textInput');
    const addTextBtn = document.getElementById('addTextBtn');
  
    // =============== 2) Three.js Essentials ===============
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
  
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    // We'll position the camera after the model loads
  
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
  
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
  
    // =============== 3) Variables for the Model ===============
    let currentModelName = 'Tshirt.glb';  // default product
    let productMesh = null;              // loaded GLTF scene
  
    // =============== 4) Load Model Function ===============
    const gltfLoader = new THREE.GLTFLoader();
  
    function loadModel(modelName) {
      // If there's an existing mesh loaded, remove it first
      if (productMesh) {
        scene.remove(productMesh);
        productMesh = null;
      }
  
      // Construct path like '/static/models/Tshirt.glb', etc.
      const modelPath = `/static/models/${modelName}`;
  
      gltfLoader.load(
        modelPath,
        (gltf) => {
          productMesh = gltf.scene;
          scene.add(productMesh);
  
          // Scale it up
          productMesh.scale.set(15, 15, 15);
  
          // Center it
          const bbox = new THREE.Box3().setFromObject(productMesh);
          const center = bbox.getCenter(new THREE.Vector3());
          productMesh.position.x -= center.x;
          productMesh.position.y -= center.y;
          productMesh.position.z -= center.z;
  
          // Recalc bounding sphere to limit orbit
          bbox.setFromObject(productMesh);
          const sphere = new THREE.Sphere();
          bbox.getBoundingSphere(sphere);
  
          // Position camera behind it
          camera.position.set(
            sphere.center.x,
            sphere.center.y,
            sphere.center.z + sphere.radius * 2
          );
          orbitControls.target.copy(sphere.center);
          orbitControls.update();
  
          orbitControls.minDistance = sphere.radius * 0.8;
          orbitControls.maxDistance = sphere.radius * 5;
  
          // Force color if user has already chosen one
          if (currentColor) {
            setProductColor(currentColor);
          }
  
          console.log(`${modelName} loaded!`);
        },
        undefined,
        (err) => {
          console.error(`Error loading ${modelName}:`, err);
        }
      );
    }
  
    // Initial load (default T-shirt)
    loadModel(currentModelName);
  
    // =============== 5) Switch Model on Product Button Click ===============
    productBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosenModel = btn.getAttribute('data-model');
        currentModelName = chosenModel;
        loadModel(currentModelName);
      });
    });
  
    // =============== 6) Color Changing ===============
    let currentColor = '#ffffff';
    function setProductColor(hex) {
      currentColor = hex;
      if (!productMesh) return;
  
      // Traverse all sub-meshes
      productMesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.color) {
          node.material.wireframe = false;  // ensure no geometry lines
          node.material.color.set(hex);
        }
      });
    }
  
    colorBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const chosenColor = e.target.getAttribute('data-color');
        setProductColor(chosenColor);
      });
    });
  
    customColorInput.addEventListener('input', (e) => {
      setProductColor(e.target.value);
    });
  
    // =============== 7) TransformControls for Stickers/Text ===============
    let transformControls = null;
    function ensureTransformControls() {
      if (!transformControls) {
        transformControls = new THREE.TransformControls(camera, renderer.domElement);
        transformControls.addEventListener('change', renderScene);
        transformControls.setMode('translate');  // default is move
        scene.add(transformControls);
      }
    }
  
    // =============== 8) Upload Image => Sticker Plane ===============
    uploadImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imgUrl = evt.target.result;
        const texture = new THREE.TextureLoader().load(imgUrl);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
  
        // Create a small plane with the image
        const stickerGeom = new THREE.PlaneGeometry(0.5, 0.5);
        const stickerMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
  
        // Place it in front of the product
        stickerMesh.position.set(0, 1, 0.3);
        scene.add(stickerMesh);
  
        // Enable transform controls
        ensureTransformControls();
        transformControls.attach(stickerMesh);
  
        console.log("Sticker placed!");
      };
      reader.readAsDataURL(file);
    });
  
    // =============== 9) Add Text as a Plane ===============
    addTextBtn.addEventListener('click', () => {
      const textValue = textInput.value.trim();
      if (!textValue) return;
  
      // Create an offscreen canvas to draw the text
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 512;
      textCanvas.height = 256;
  
      const ctx = textCanvas.getContext('2d');
      // Clear background (transparent)
      ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  
      ctx.fillStyle = '#000000';
      ctx.font = '50px sans-serif';
      const metrics = ctx.measureText(textValue);
      const textX = (textCanvas.width - metrics.width) / 2;
      const textY = textCanvas.height / 2 + 15;
      ctx.fillText(textValue, textX, textY);
  
      // Create texture from that canvas
      const textTexture = new THREE.Texture(textCanvas);
      textTexture.needsUpdate = true;
  
      const textGeom = new THREE.PlaneGeometry(1.2, 0.6);
      const textMat = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
      const textMesh = new THREE.Mesh(textGeom, textMat);
  
      // Position it in front
      textMesh.position.set(0, 1, 0.3);
      scene.add(textMesh);
  
      // Attach transform controls
      ensureTransformControls();
      transformControls.attach(textMesh);
  
      console.log("Text added:", textValue);
    });
  
    // =============== 10) Keyboard Shortcuts for TransformControls ===============
    window.addEventListener('keydown', (e) => {
      if (!transformControls) return;
      switch (e.key.toLowerCase()) {
        case 'w':
          transformControls.setMode('translate'); // move
          break;
        case 'e':
          transformControls.setMode('rotate');    // rotate
          break;
        case 'r':
          transformControls.setMode('scale');     // scale
          break;
      }
    });
  
    // =============== 11) Resize Handling ===============
    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
  
    // =============== 12) Animation Loop ===============
    function animate() {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderScene();
    }
  
    function renderScene() {
      renderer.render(scene, camera);
    }
  
    animate();
  });
  
  
  
  
  
  








