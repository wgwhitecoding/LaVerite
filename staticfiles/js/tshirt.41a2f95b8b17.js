// static/js/decal_tshirt.js

document.addEventListener('DOMContentLoaded', () => {
  // ============= 1) DOM Elements =============
  const canvas = document.getElementById('tshirtCanvas');
  
  const productBtns = document.querySelectorAll('.product-btn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const customColorInput = document.getElementById('customColor');
  const uploadImageInput = document.getElementById('uploadImage');
  const addTextBtn = document.getElementById('addTextBtn');
  const textValueInput = document.getElementById('textValue');
  const textColorInput = document.getElementById('textColor');
  const fontSelect = document.getElementById('fontSelect');
  
  const itemsList = document.getElementById('itemsList');
  const saveDesignBtn = document.getElementById('saveDesignBtn');
  
  const translateBtn = document.getElementById('translateBtn');
  const rotateBtn = document.getElementById('rotateBtn');
  const scaleBtn = document.getElementById('scaleBtn');
  
  // Current selections
  let currentProduct = 'Tshirt.glb';
  let currentProductKey = 'tshirt';
  let currentColor = '#ffffff';  // default T-shirt color
  
  // ============= 2) Three.js Setup =============
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 5); // Adjusted position for better visibility
  
  // Orbit Controls
  const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.07;
  
  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
  
  // ============= 3) Load GLTF Model =============
  const gltfLoader = new THREE.GLTFLoader();
  let groupMesh = null;         // The entire GLTF scene or group
  let outerMesh = null;         // The outer mesh with real geometry
  let innerMesh = null;         // The inner mesh with real geometry
  
  /**
   * Utility function to find all meshes with geometry in the loaded GLTF.
   * @param {THREE.Object3D} root - The root object of the loaded GLTF.
   * @returns {Array<THREE.Mesh>} - Array of found meshes.
   */
  function findAllMeshes(root) {
    const meshes = [];
    root.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        meshes.push(obj);
      }
    });
    return meshes;
  }
  
  /**
   * Identifies the outer and inner meshes based on their bounding sphere sizes.
   * Assumes the outer mesh has the largest bounding sphere.
   * @param {Array<THREE.Mesh>} meshes - Array of meshes to evaluate.
   */
  function identifyOuterAndInnerMeshes(meshes) {
    if (meshes.length === 0) return;
    
    // Sort meshes by bounding sphere radius in descending order
    const sortedMeshes = meshes.sort((a, b) => {
      const bboxA = new THREE.Box3().setFromObject(a);
      const sphereA = new THREE.Sphere();
      bboxA.getBoundingSphere(sphereA);
  
      const bboxB = new THREE.Box3().setFromObject(b);
      const sphereB = new THREE.Sphere();
      bboxB.getBoundingSphere(sphereB);
  
      return sphereB.radius - sphereA.radius;
    });
    
    outerMesh = sortedMeshes[0]; // Largest mesh
    innerMesh = meshes.length > 1 ? sortedMeshes[1] : null; // Second largest mesh if exists
    
    console.log("Outer Mesh:", outerMesh ? (outerMesh.name || outerMesh.id) : "None");
    console.log("Inner Mesh:", innerMesh ? (innerMesh.name || innerMesh.id) : "None");
  }
  
  /**
   * Loads a GLTF model into the scene.
   * @param {string} modelName - The filename of the GLTF model to load.
   */
  function loadModel(modelName) {
    // Remove existing model if present
    if (groupMesh) {
      scene.remove(groupMesh);
      groupMesh = null;
      outerMesh = null;
      innerMesh = null;
  
      // Clear existing decals and texts
      clearDecalsAndTexts();
    }
    const path = '/static/models/' + modelName;
  
    gltfLoader.load(
      path,
      (gltf) => {
        groupMesh = gltf.scene;
        scene.add(groupMesh);
  
        const allMeshes = findAllMeshes(groupMesh);
        identifyOuterAndInnerMeshes(allMeshes);
  
        if (!outerMesh) {
          console.error("No outer mesh found in this GLB, can't apply color or decals.");
          return;
        }
  
        // If geometry has no index, create one to avoid .index errors
        const geo = outerMesh.geometry;
        if (!geo.index) {
          console.log("No index on geometry. Creating a dummy index so DecalGeometry won't crash.");
          const posCount = geo.attributes.position.count;
          const indices = [...Array(posCount).keys()];  // 0..posCount-1
          geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(indices), 1));
        }
  
        // Ensure materials are double-sided for proper decal placement
        outerMesh.traverse((node) => {
          if (node.isMesh && node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((mat) => {
                mat.side = THREE.DoubleSide;
              });
            } else {
              node.material.side = THREE.DoubleSide;
            }
          }
        });
  
        // If inner mesh exists, ensure its materials are also double-sided
        if (innerMesh) {
          innerMesh.traverse((node) => {
            if (node.isMesh && node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach((mat) => {
                  mat.side = THREE.DoubleSide;
                });
              } else {
                node.material.side = THREE.DoubleSide;
              }
            }
          });
        }
  
        // Scale and center the model
        groupMesh.scale.set(15, 15, 15);
        const bbox = new THREE.Box3().setFromObject(groupMesh);
        const center = bbox.getCenter(new THREE.Vector3());
        groupMesh.position.x -= center.x;
        groupMesh.position.y -= center.y;
        groupMesh.position.z -= center.z;
  
        // Adjust camera and orbit controls based on the model's bounding sphere
        bbox.setFromObject(groupMesh);
        const sphere = new THREE.Sphere();
        bbox.getBoundingSphere(sphere);
  
        camera.position.set(
          sphere.center.x,
          sphere.center.y,
          sphere.center.z + sphere.radius * 2
        );
        orbitControls.target.copy(sphere.center);
        orbitControls.update();
  
        orbitControls.minDistance = sphere.radius * 0.8;
        orbitControls.maxDistance = sphere.radius * 5;
  
        // Apply initial color
        setProductColor(currentColor);
  
        console.log(modelName, 'loaded!');
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (err) => {
        console.error('Error loading', modelName, err);
        alert('Failed to load the model. Please check the console for more details.');
      }
    );
  }
  
  /**
   * Clears all existing decals and texts from the scene and arrays.
   */
  function clearDecalsAndTexts() {
    // Remove decals
    decalsArray.forEach(decal => {
      if (scene.children.includes(decal.mesh)) {
        scene.remove(decal.mesh);
        disposeMesh(decal.mesh);
      }
    });
    decalsArray = [];
  
    // Remove texts
    textArray.forEach(text => {
      if (scene.children.includes(text.mesh)) {
        scene.remove(text.mesh);
        disposeMesh(text.mesh);
      }
    });
    textArray = [];
  
    // Clear layers list
    while (itemsList.firstChild) {
      itemsList.removeChild(itemsList.firstChild);
    }
  }
  
  /**
   * Disposes of mesh geometry and materials to free up memory.
   * @param {THREE.Mesh} mesh - The mesh to dispose.
   */
  function disposeMesh(mesh) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
  
  // Initially load the default product
  loadModel(currentProduct);
  
  // ============= 4) Switch Product on Button Click =============
  productBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const modelFile = btn.dataset.model;
      currentProduct = modelFile;
      if (modelFile.toLowerCase().includes('hoodie')) currentProductKey = 'hoodie';
      else if (modelFile.toLowerCase().includes('baggy')) currentProductKey = 'baggy';
      else if (modelFile.toLowerCase().includes('jumper')) currentProductKey = 'jumper';
      else currentProductKey = 'tshirt';
  
      loadModel(currentProduct);
    });
  });
  
  // ============= 5) Color Changing =============
  /**
   * Applies the selected color to both the outer and inner meshes.
   * @param {string} hex - The hexadecimal color code.
   */
  function setProductColor(hex) {
    currentColor = hex;
    if (!outerMesh) return;
  
    // Apply color to outer mesh
    outerMesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.color) {
        node.material.color.set(hex);
        node.material.side = THREE.DoubleSide; // Ensure both sides are rendered
        node.material.needsUpdate = true;
      }
    });
  
    // Apply color to inner mesh if it exists
    if (innerMesh) {
      innerMesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.color) {
          node.material.color.set(hex);
          node.material.side = THREE.DoubleSide; // Ensure both sides are rendered
          node.material.needsUpdate = true;
        }
      });
    }
  }
  
  // Event listeners for predefined color buttons
  colorBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const hex = e.target.dataset.color;
      setProductColor(hex);
    });
  });
  
  // Event listener for custom color picker
  customColorInput.addEventListener('input', (e) => {
    setProductColor(e.target.value);
  });
  
  // ============= 6) Decal Upload and Placement =============
  let decalsArray = [];
  let textArray = [];
  let selectedObject = null; // Currently selected object for editing
  let transformControls = null; // TransformControls instance
  
  /**
   * Initializes TransformControls for editing decals and texts.
   */
  function initializeTransformControls() {
    if (typeof THREE.TransformControls === 'undefined') {
      console.error('TransformControls not loaded');
      return;
    }
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('change', render);
    transformControls.addEventListener('dragging-changed', function (event) {
      orbitControls.enabled = !event.value;
    });
    scene.add(transformControls);
  
    // Handle keyboard events for transform modes
    window.addEventListener('keydown', function (event) {
      switch (event.key) {
        case 't':
          if (transformControls) transformControls.setMode('translate');
          setActiveTransformButton('translate');
          break;
        case 'r':
          if (transformControls) transformControls.setMode('rotate');
          setActiveTransformButton('rotate');
          break;
        case 's':
          if (transformControls) transformControls.setMode('scale');
          setActiveTransformButton('scale');
          break;
      }
    });
  }
  
  initializeTransformControls();
  
  /**
   * Sets the active transform button based on the current mode.
   * @param {string} mode - The current transform mode ('translate', 'rotate', 'scale').
   */
  function setActiveTransformButton(mode) {
    translateBtn.classList.remove('active');
    rotateBtn.classList.remove('active');
    scaleBtn.classList.remove('active');
  
    switch (mode) {
      case 'translate':
        translateBtn.classList.add('active');
        break;
      case 'rotate':
        rotateBtn.classList.add('active');
        break;
      case 'scale':
        scaleBtn.classList.add('active');
        break;
    }
  }
  
  /**
   * Selects a decal or text object for editing with TransformControls.
   * @param {THREE.Mesh} object - The object to select.
   */
  function selectObject(object) {
    selectedObject = object;
    transformControls.attach(selectedObject);
    
    // Optional: Highlight the selected object
    // Remove highlight from all objects
    decalsArray.forEach(d => {
      if (d.mesh.material.emissive) d.mesh.material.emissive.set(0x000000);
    });
    textArray.forEach(t => {
      if (t.mesh.material.emissive) t.mesh.material.emissive.set(0x000000);
    });
    
    // Highlight the selected object
    if (object.material.emissive) {
      object.material.emissive.set(0x444444); // Adjust the highlight color as desired
    }
  
    // Update the layers sidebar to reflect the selected object
    highlightLayerItem(object);
  }
  
  // Initialize Raycaster and mouse vector
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Add event listener for mouse clicks
  canvas.addEventListener('mousedown', onMouseDown, false);
  
  function onMouseDown(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
  
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
  
    // Define objects to intersect (decals and texts)
    const objects = [...decalsArray.map(d => d.mesh), ...textArray.map(t => t.mesh)];
  
    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(objects, false);
  
    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      selectObject(selectedMesh);
    } else {
      // If no object is clicked, detach TransformControls
      if (transformControls) transformControls.detach();
      selectedObject = null;
      // Remove highlight from all layer items
      const layerItems = itemsList.querySelectorAll('.layer-item');
      layerItems.forEach(item => item.classList.remove('active'));
    }
  }
  
  /**
   * Highlights the corresponding layer item in the sidebar when an object is selected on the canvas.
   * @param {THREE.Mesh} selectedMesh - The selected mesh.
   */
  function highlightLayerItem(selectedMesh) {
    const layerItems = itemsList.querySelectorAll('.layer-item');
    
    layerItems.forEach(item => {
      if (parseInt(item.dataset.meshId) === selectedMesh.id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  /**
   * Places a decal on the outer mesh using the provided file URL.
   * @param {string} fileUrl - The URL of the decal image.
   */
  function placeDecalAuto(fileUrl) {
    if (!fileUrl) {
      console.log("No file URL. The server might not have returned a valid path?");
      return;
    }
    if (!outerMesh) {
      console.log("No outer mesh found, can't place decal.");
      return;
    }
  
    // Load the decal texture
    const decalTexture = new THREE.TextureLoader().load(fileUrl, () => {
      decalTexture.needsUpdate = true;
  
      // Calculate a suitable position on the front of the T-shirt based on bounding box
      const bbox = new THREE.Box3().setFromObject(outerMesh);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
  
      // Place the decal roughly at the front center
      const decalPosition = new THREE.Vector3(center.x, center.y, bbox.max.z + 0.1); // Slightly in front
      const decalNormal = new THREE.Vector3(0, 0, 1); // Facing outward
  
      // Create orientation based on normal
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), decalNormal);
  
      // Define decal size relative to the model size
      const decalSize = new THREE.Vector3(1, 1, 1); // Adjust as needed
  
      // Create DecalGeometry
      const decalGeom = new THREE.DecalGeometry(
        outerMesh,       // Target mesh (outer mesh)
        decalPosition,   // Position
        quaternion,      // Orientation
        decalSize        // Size
      );
  
      // Create material with appropriate properties
      const decalMat = new THREE.MeshStandardMaterial({
        map: decalTexture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4, // Adjust to prevent z-fighting
        polygonOffsetUnits: 1
      });
  
      // Create decal mesh and add to scene
      const decalMesh = new THREE.Mesh(decalGeom, decalMat);
      scene.add(decalMesh);
  
      // Store decal information
      const decalItem = {
        type: 'decal',
        mesh: decalMesh,
        imageUrl: fileUrl,
        position: decalPosition,
        rotation: quaternion,
        size: decalSize,
        name: "Decal " + (decalsArray.length + 1)
      };
      decalsArray.push(decalItem);
      addLayerItem(decalItem);
  
      console.log("Decal placed from fileUrl at:", decalPosition);
    }, undefined, (err) => {
      console.error("Error loading decal texture:", err);
    });
  }
  
  // Event listener for Upload File button
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  if (uploadFileBtn) {
    uploadFileBtn.addEventListener('click', () => {
      const file = uploadImageInput.files[0];
      if (!file) {
        alert("Please select a file to upload.");
        return;
      }
      console.log("Uploading file:", file.name);
  
      const formData = new FormData();
      formData.append('decalFile', file);
  
      fetch('/upload_decal/', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCookie('csrftoken') // Ensure CSRF token is included
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'ok') {
          const fileUrl = data.file_url;
          console.log("File uploaded successfully. URL:", fileUrl);
          placeDecalAuto(fileUrl);
        } else {
          alert("Error uploading decal: " + data.error);
          console.error("Upload error:", data);
        }
      })
      .catch(err => {
        alert("An error occurred during the upload.");
        console.error("Upload error:", err);
      });
    });
  }
  
  // ============= 7) Add Text as Decal =============
  /**
   * Places a text decal on the outer mesh using the provided text parameters.
   * @param {string} text - The text to display.
   * @param {string} color - The color of the text.
   * @param {string} font - The font style of the text.
   */
  function placeTextDecal(text, color, font) {
    if (!outerMesh) {
      console.log("No outer mesh found, can't place text decal.");
      return;
    }
  
    // Create a canvas to render the text
    const textCanvas = document.createElement('canvas');
    const canvasWidth = 512;
    const canvasHeight = 256;
    textCanvas.width = canvasWidth;
    textCanvas.height = canvasHeight;
    const ctx = textCanvas.getContext('2d');
  
    // Optional: Add a transparent background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
    // Set text properties
    ctx.fillStyle = color;
    ctx.font = `bold 60px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
  
    // Create texture from canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.needsUpdate = true;
  
    // Define decal size relative to the model size
    const decalSize = new THREE.Vector3(1, 0.5, 1); // Adjust as needed
  
    // Calculate a suitable position on the front of the T-shirt based on bounding box
    const bbox = new THREE.Box3().setFromObject(outerMesh);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
  
    // Position the decal roughly at the upper front area
    const decalPosition = new THREE.Vector3(center.x, center.y + size.y / 4, bbox.max.z + 0.1); // Slightly in front
    const decalNormal = new THREE.Vector3(0, 0, 1); // Facing outward
  
    // Create orientation based on normal
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), decalNormal);
  
    // Create DecalGeometry
    const decalGeom = new THREE.DecalGeometry(
      outerMesh,       // Target mesh (outer mesh)
      decalPosition,   // Position
      quaternion,      // Orientation
      decalSize        // Size
    );
  
    // Create material with appropriate properties
    const decalMat = new THREE.MeshStandardMaterial({
      map: textTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4, // Adjust to prevent z-fighting
      polygonOffsetUnits: 1
    });
  
    // Create decal mesh and add to scene
    const decalMesh = new THREE.Mesh(decalGeom, decalMat);
    scene.add(decalMesh);
  
    // Store decal information
    const decalItem = {
      type: 'decal',
      mesh: decalMesh,
      imageUrl: textCanvas.toDataURL(), // Store the data URL of the text
      position: decalPosition,
      rotation: quaternion,
      size: decalSize,
      name: "Text Decal " + (decalsArray.length + 1),
      isText: true // Flag to identify as text decal
    };
    decalsArray.push(decalItem);
    addLayerItem(decalItem);
  
    console.log("Text decal placed:", text);
  }
  
  // Modify the Add Text button to use placeTextDecal
  addTextBtn.addEventListener('click', () => {
    const textVal = textValueInput.value.trim();
    if (!textVal) {
      alert("Please enter some text.");
      return;
    }
    const tColor = textColorInput.value;
    const fontStyle = fontSelect.value;
  
    // Place text as a decal
    placeTextDecal(textVal, tColor, fontStyle);
  });
  
  // ============= 8) Layers / Items List =============
  /**
   * Adds an item to the layers list in the sidebar.
   * @param {Object} item - The decal or text item to add.
   */
  function addLayerItem(item) {
    const div = document.createElement('div');
    div.className = 'layer-item d-flex align-items-center mb-1';
    div.style.cursor = 'pointer'; // Indicate interactivity
    
    // Thumbnail or icon
    if (item.type === 'decal') {
      if (item.isText) {
        const icon = document.createElement('i');
        icon.className = 'fas fa-font me-2'; // Use a font icon for text decals
        icon.style.fontSize = '24px';
        div.appendChild(icon);
      } else {
        const thumb = document.createElement('img');
        thumb.style.width = '40px';
        thumb.style.height = '40px';
        thumb.style.objectFit = 'cover';
        thumb.style.borderRadius = '4px';
        thumb.style.marginRight = '10px';
        thumb.src = item.imageUrl;
        div.appendChild(thumb);
      }
    } else if (item.type === 'text') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-font me-2';
      icon.style.fontSize = '24px';
      div.appendChild(icon);
    }
  
    // Rename input
    const renameInput = document.createElement('input');
    renameInput.type = 'text';
    renameInput.className = 'form-control form-control-sm me-2';
    renameInput.value = item.name || (item.type === 'text' ? item.content : "Decal");
    renameInput.style.width = '120px';
    renameInput.addEventListener('change', () => {
      item.name = renameInput.value;
      if (item.isText) {
        item.content = renameInput.value;
        // Update the texture if needed
        updateTextDecalTexture(item);
      }
    });
    div.appendChild(renameInput);
  
    // Action dropdown
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm me-2';
    const opts = ['Use', 'Remove', 'Delete'];
    opts.forEach(val => {
      const option = document.createElement('option');
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      const action = select.value;
      if (action === 'Use') {
        if (!scene.children.includes(item.mesh)) scene.add(item.mesh);
      } else if (action === 'Remove') {
        if (scene.children.includes(item.mesh)) scene.remove(item.mesh);
      } else if (action === 'Delete') {
        if (scene.children.includes(item.mesh)) scene.remove(item.mesh);
        div.remove();
        const idx = decalsArray.indexOf(item);
        if (idx >= 0) decalsArray.splice(idx, 1);
      }
      select.value = '';
    });
    div.appendChild(select);
  
    // Event listener for selecting the decal/text for editing via sidebar
    div.addEventListener('click', (event) => {
      // Prevent triggering when clicking on the select dropdown
      if (event.target.tagName.toLowerCase() === 'select' || event.target.tagName.toLowerCase() === 'option') {
        return;
      }
      selectObject(item.mesh);
    });
  
    // Associate the mesh with the layer item for easy reference
    div.dataset.meshId = item.mesh.id;
  
    itemsList.appendChild(div);
  }
  
  /**
   * Updates the texture of a text decal when renamed.
   * @param {Object} item - The text decal item to update.
   */
  function updateTextDecalTexture(item) {
    if (item.type !== 'decal' || !item.isText) return;
    const mesh = item.mesh;
    if (!mesh) return;
  
    // Create a new canvas with updated text
    const textCanvas = document.createElement('canvas');
    const canvasWidth = 512;
    const canvasHeight = 256;
    textCanvas.width = canvasWidth;
    textCanvas.height = canvasHeight;
    const ctx = textCanvas.getContext('2d');
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = item.color;
    ctx.font = `bold 60px ${item.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.content, textCanvas.width / 2, textCanvas.height / 2);
  
    // Update the texture
    const newTexture = new THREE.CanvasTexture(textCanvas);
    newTexture.needsUpdate = true;
  
    // Update material
    mesh.material.map = newTexture;
    mesh.material.needsUpdate = true;
  
    // Update the stored imageUrl
    item.imageUrl = textCanvas.toDataURL();
  }
  
  /**
   * Retrieves the value of a specified cookie.
   * @param {string} name - The name of the cookie.
   * @returns {string|null} - The value of the cookie or null if not found.
   */
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i=0; i<cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length+1));
          break;
        }
      }
    }
    return cookieValue;
  }
  
  // ============= 9) Save Design =============
  /**
   * Gathers the current design data to send to the backend.
   * @returns {Object} - The design data.
   */
  function gatherDesignData() {
    const data = {
      product: currentProductKey,
      color: currentColor,
      decals: [],
      texts: []
    };
    decalsArray.forEach(d => {
      data.decals.push({
        imageUrl: d.imageUrl,
        position: { x: d.mesh.position.x, y: d.mesh.position.y, z: d.mesh.position.z },
        rotation: { x: d.mesh.rotation.x, y: d.mesh.rotation.y, z: d.mesh.rotation.z },
        scale: { x: d.mesh.scale.x, y: d.mesh.scale.y, z: d.mesh.scale.z },
        name: d.name,
        isText: d.isText || false,
        font: d.isText ? d.font : null
      });
    });
    return data;
  }
  
  // Event listener for Save Design button
  saveDesignBtn.addEventListener('click', () => {
    const designData = gatherDesignData();
    fetch('/save_design/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(designData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        alert('Design saved! ID=' + data.design_id);
      } else {
        alert('Error saving design: ' + JSON.stringify(data));
      }
    })
    .catch(err => {
      alert('An error occurred while saving the design.');
      console.error(err);
    });
  });
  
  // ============= 10) Handle Window Resize =============
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });
  
  /**
   * Renders the current state of the scene.
   */
  function render() {
    renderer.render(scene, camera);
  }
  
  // ============= 11) Render Loop =============
  function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  // ============= 12) Transform Mode Buttons =============
  // Add event listeners to switch transform modes
  if (translateBtn) {
    translateBtn.addEventListener('click', () => {
      if (transformControls) transformControls.setMode('translate');
      setActiveTransformButton('translate');
    });
  }
  
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      if (transformControls) transformControls.setMode('rotate');
      setActiveTransformButton('rotate');
    });
  }
  
  if (scaleBtn) {
    scaleBtn.addEventListener('click', () => {
      if (transformControls) transformControls.setMode('scale');
      setActiveTransformButton('scale');
    });
  }
  
  // Ensure keyboard shortcuts reflect in UI buttons
  window.addEventListener('keydown', function (event) {
    switch (event.key) {
      case 't':
        if (transformControls) transformControls.setMode('translate');
        setActiveTransformButton('translate');
        break;
      case 'r':
        if (transformControls) transformControls.setMode('rotate');
        setActiveTransformButton('rotate');
        break;
      case 's':
        if (transformControls) transformControls.setMode('scale');
        setActiveTransformButton('scale');
        break;
    }
  });
  
  // ============= 13) Text Decal Helper Function =============
  /**
   * Places a text decal at a specific point with a given normal.
   * This function can be extended for interactive decal placement.
   * @param {string} text - The text to display.
   * @param {string} color - The color of the text.
   * @param {string} font - The font style of the text.
   * @param {THREE.Vector3} position - The position to place the decal.
   * @param {THREE.Vector3} normal - The normal vector for decal orientation.
   */
  function placeTextDecalAtPoint(text, color, font, position, normal) {
    if (!outerMesh) {
      console.log("No outer mesh found, can't place text decal.");
      return;
    }
  
    // Create a canvas to render the text
    const textCanvas = document.createElement('canvas');
    const canvasWidth = 512;
    const canvasHeight = 256;
    textCanvas.width = canvasWidth;
    textCanvas.height = canvasHeight;
    const ctx = textCanvas.getContext('2d');
  
    // Optional: Add a transparent background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
    // Set text properties
    ctx.fillStyle = color;
    ctx.font = `bold 60px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
  
    // Create texture from canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.needsUpdate = true;
  
    // Define decal size relative to the model size
    const decalSize = new THREE.Vector3(1, 0.5, 1); // Adjust as needed
  
    // Create orientation based on normal
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  
    // Create DecalGeometry
    const decalGeom = new THREE.DecalGeometry(
      outerMesh,       // Target mesh (outer mesh)
      position,        // Position
      quaternion,      // Orientation
      decalSize        // Size
    );
  
    // Create material with appropriate properties
    const decalMat = new THREE.MeshStandardMaterial({
      map: textTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4, // Adjust to prevent z-fighting
      polygonOffsetUnits: 1
    });
  
    // Create decal mesh and add to scene
    const decalMesh = new THREE.Mesh(decalGeom, decalMat);
    scene.add(decalMesh);
  
    // Store decal information
    const decalItem = {
      type: 'decal',
      mesh: decalMesh,
      imageUrl: textCanvas.toDataURL(), // Store the data URL of the text
      position: position,
      rotation: quaternion,
      size: decalSize,
      name: "Text Decal " + (decalsArray.length + 1),
      isText: true, // Flag to identify as text decal
      font: font
    };
    decalsArray.push(decalItem);
    addLayerItem(decalItem);
  
    console.log("Text decal placed at:", position);
  }
  
});


