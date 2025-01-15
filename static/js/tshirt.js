// static/js/decal_tshirt.js

document.addEventListener('DOMContentLoaded', () => {
  // ============= 1) DOM elements =============
  const canvas = document.getElementById('tshirtCanvas');

  const productBtns = document.querySelectorAll('.product-btn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const customColorInput = document.getElementById('customColor');
  const uploadImageInput = document.getElementById('uploadImage');
  const textValueInput = document.getElementById('textValue');
  const textColorInput = document.getElementById('textColor');
  const addTextBtn = document.getElementById('addTextBtn');

  const itemsList = document.getElementById('itemsList');
  const saveDesignBtn = document.getElementById('saveDesignBtn');

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
  camera.position.set(0, 1, 3); // Initial position

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
  let groupMesh = null;       // the entire GLTF scene or group
  let actualMesh = null;      // the first sub-mesh with real geometry

  function findFirstMesh(root) {
    let found = null;
    root.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        found = obj;
      }
    });
    return found;
  }

  function loadModel(modelName) {
    if (groupMesh) {
      scene.remove(groupMesh);
      groupMesh = null;
      actualMesh = null;
    }
    const path = '/static/models/' + modelName;

    gltfLoader.load(
      path,
      (gltf) => {
        groupMesh = gltf.scene;
        scene.add(groupMesh);

        actualMesh = findFirstMesh(groupMesh);
        if (!actualMesh) {
          console.error("No actual submesh found in this GLB, can't do decals.");
        } else {
          console.log("Found submesh:", actualMesh.name || actualMesh.id);

          // If geometry has no index, create one to avoid .index errors
          const geo = actualMesh.geometry;
          if (!geo.index) {
            console.log("No index on geometry. Creating a dummy index so DecalGeometry won't crash.");
            const posCount = geo.attributes.position.count;
            const indices = [...Array(posCount).keys()];  // 0..posCount-1
            geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(indices), 1));
          }

          // Ensure materials are double-sided for proper decal placement
          actualMesh.traverse((node) => {
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
      undefined,
      (err) => console.error('Error loading', modelName, err)
    );
  }

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
  function setProductColor(hex) {
    currentColor = hex;
    if (!actualMesh) return;

    actualMesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.color) {
        node.material.color.set(hex);
        node.material.needsUpdate = true;
      }
    });
  }

  colorBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const hex = e.target.dataset.color;
      setProductColor(hex);
    });
  });

  customColorInput.addEventListener('input', (e) => {
    setProductColor(e.target.value);
  });

  // ============= 6) Decal Upload and Placement =============
  let decalsArray = [];
  let textArray = [];

  // Function to place decal from server URL
  function placeDecalAuto(fileUrl) {
    if (!fileUrl) {
      console.log("No file URL. The server might not have returned a valid path?");
      return;
    }
    if (!actualMesh) {
      console.log("No actual submesh found, can't place decal.");
      return;
    }

    // Load the decal texture
    const decalTexture = new THREE.TextureLoader().load(fileUrl, () => {
      decalTexture.needsUpdate = true;

      // Calculate a suitable position on the front of the T-shirt based on bounding box
      const bbox = new THREE.Box3().setFromObject(actualMesh);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      // Place the decal roughly at the front center
      const decalPosition = new THREE.Vector3(center.x, center.y, bbox.max.z + 0.1); // Slightly in front
      const decalNormal = new THREE.Vector3(0, 0, 1); // Facing outward

      // Create orientation based on normal
      const orientation = new THREE.Euler();
      orientation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), decalNormal));

      // Define decal size relative to the model size
      const decalSize = new THREE.Vector3(1, 1, 1); // Adjust as needed

      // Create DecalGeometry
      const decalGeom = new THREE.DecalGeometry(
        actualMesh, // Target mesh
        decalPosition, // Position
        orientation, // Orientation
        decalSize // Size
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
        rotation: orientation,
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

  // ============= 7) Add Text =============
  addTextBtn.addEventListener('click', () => {
    const textVal = textValueInput.value.trim();
    if (!textVal) {
      alert("Please enter some text.");
      return;
    }
    const tColor = textColorInput.value;

    // Create a canvas to render the text
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = tColor;
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textVal, textCanvas.width / 2, textCanvas.height / 2);

    // Create texture from canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.needsUpdate = true;

    // Create material
    const textMat = new THREE.MeshStandardMaterial({
      map: textTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: 1
    });

    // Create geometry
    const textGeom = new THREE.PlaneGeometry(1, 0.5); // Adjust size as needed

    // Create mesh
    const textMesh = new THREE.Mesh(textGeom, textMat);
    textMesh.position.set(0, 1, 0.5); // Adjust position as needed
    scene.add(textMesh);

    // Store text information
    const textItem = {
      type: 'text',
      mesh: textMesh,
      content: textVal,
      color: tColor,
      name: "Text " + (textArray.length + 1)
    };
    textArray.push(textItem);
    addLayerItem(textItem);

    console.log("Text added:", textVal);
  });

  // ============= 8) Layers / Items List =============
  function addLayerItem(item) {
    const div = document.createElement('div');
    div.className = 'layer-item d-flex align-items-center mb-1';

    if (item.type === 'decal') {
      const thumb = document.createElement('img');
      thumb.style.width = '40px';
      thumb.style.height = '40px';
      thumb.style.objectFit = 'cover';
      thumb.style.borderRadius = '4px';
      thumb.style.marginRight = '0.5rem';
      thumb.src = item.imageUrl;
      div.appendChild(thumb);
    } else if (item.type === 'text') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-font me-2';
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
      if (item.type === 'text') {
        item.content = renameInput.value;
        // Update the texture if needed
        updateTextTexture(item);
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
        if (item.type === 'decal') {
          const idx = decalsArray.indexOf(item);
          if (idx >= 0) decalsArray.splice(idx, 1);
        } else if (item.type === 'text') {
          const idx = textArray.indexOf(item);
          if (idx >= 0) textArray.splice(idx, 1);
        }
      }
      select.value = '';
    });
    div.appendChild(select);

    itemsList.appendChild(div);
  }

  // Helper function to update text texture when renamed
  function updateTextTexture(item) {
    if (item.type !== 'text') return;
    const mesh = item.mesh;
    if (!mesh) return;

    // Create a new canvas with updated text
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = item.color;
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.content, textCanvas.width / 2, textCanvas.height / 2);

    // Update the texture
    const newTexture = new THREE.CanvasTexture(textCanvas);
    newTexture.needsUpdate = true;

    // Update material
    mesh.material.map = newTexture;
    mesh.material.needsUpdate = true;
  }

  // ============= 9) Save Design =============
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
        position: { x: d.position.x, y: d.position.y, z: d.position.z },
        rotation: { x: d.rotation.x, y: d.rotation.y, z: d.rotation.z },
        size: { x: d.size.x, y: d.size.y, z: d.size.z },
        name: d.name
      });
    });
    textArray.forEach(t => {
      const pos = t.mesh.position;
      const rot = t.mesh.rotation;
      const scl = t.mesh.scale;
      data.texts.push({
        content: t.content,
        color: t.color,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        scale: { x: scl.x, y: scl.y, z: scl.z },
        name: t.name
      });
    });
    return data;
  }

  // Helper function to get CSRF token
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

  // ============= 10) Handle Window Resize =============
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

  // ============= 11) Render Loop =============
  function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }
  animate();
});




  
  
  
  
  
  








