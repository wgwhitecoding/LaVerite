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

  // We keep references to:
  // - The entire group/scene loaded from the glb
  // - The "actual" submesh we use for DecalGeometry
  let groupMesh = null;       // the entire GLTF scene or group
  let actualMesh = null;      // the first sub-mesh with real geometry
  let currentProduct = 'Tshirt.glb';
  let currentProductKey = 'tshirt';
  let currentColor = '#ffffff';  // default T-shirt color

  // ============= 2) Three.js Setup =============
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

  const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.07;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // ============= 3) Load GLTF Model =============
  const gltfLoader = new THREE.GLTFLoader();

  // Utility: find the first actual sub-mesh with geometry
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
        groupMesh = gltf.scene;          // the entire group/scene
        scene.add(groupMesh);

        // find a submesh with real geometry
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
        }

        // scale + center
        groupMesh.scale.set(15, 15, 15);
        const bbox = new THREE.Box3().setFromObject(groupMesh);
        const center = bbox.getCenter(new THREE.Vector3());
        groupMesh.position.x -= center.x;
        groupMesh.position.y -= center.y;
        groupMesh.position.z -= center.z;

        // adjust camera + orbit
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

        // apply color if we have one
        setProductColor(currentColor);

        console.log(modelName, 'loaded!');
      },
      undefined,
      (err) => console.error('Error loading', modelName, err)
    );
  }

  loadModel(currentProduct);

  // ============= 4) Switch product on button =============
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
    // We'll color just the found submesh
    actualMesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.color) {
        node.material.wireframe = false;
        node.material.color.set(hex);
      }
    });
  }
  colorBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const col = e.target.dataset.color;
      setProductColor(col);
    });
  });
  customColorInput.addEventListener('input', (e) => {
    setProductColor(e.target.value);
  });

  // ============= 6) Decal from Server Upload or DataURL =============
  let currentDecalTexture = null;

  // We'll add a button with id="uploadFileBtn" that does the server upload and calls placeDecalAuto
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  if (uploadFileBtn) {
    uploadFileBtn.addEventListener('click', () => {
      const file = uploadImageInput.files[0];
      if (!file) {
        console.log("No file chosen or invalid file to upload.");
        return;
      }
      console.log("Upload button clicked. Uploading file:", file.name);

      const formData = new FormData();
      formData.append('decalFile', file);

      fetch('/upload_decal/', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          const fileUrl = data.file_url; 
          console.log("File saved in repo, URL:", fileUrl);
          placeDecalAuto(fileUrl);
        } else {
          console.error("Upload error:", data);
        }
      })
      .catch(err => {
        console.error("Error uploading file:", err);
      });
    });
  }

  function placeDecalAuto(fileUrl) {
    if (!actualMesh) {
      console.log("No actual submesh found, can't place decal.");
      return;
    }

    // Create the texture from the returned server URL
    currentDecalTexture = new THREE.TextureLoader().load(fileUrl);
    currentDecalTexture.minFilter = THREE.LinearFilter;
    currentDecalTexture.magFilter = THREE.LinearFilter;

    // Hardcode a position in front of the mesh
    const point = new THREE.Vector3(0, 2, 5);
    const normal = new THREE.Vector3(0, 0, 1);
    const orientation = new THREE.Euler();
    orientation.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), normal)
    );

    const size = new THREE.Vector3(0.5, 0.5, 0.5);

    // Now call DecalGeometry on the submesh, not the group
    const decalGeom = new THREE.DecalGeometry(
      actualMesh, // the real mesh
      point,
      orientation,
      size
    );
    const decalMat = new THREE.MeshBasicMaterial({
      map: currentDecalTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    const decalMesh = new THREE.Mesh(decalGeom, decalMat);
    scene.add(decalMesh);

    const decalItem = {
      type: 'decal',
      mesh: decalMesh,
      imageUrl: fileUrl,
      position: point,
      rotation: orientation,
      size: size,
      name: "ServerUploaded"
    };
    decalsArray.push(decalItem);
    addLayerItem(decalItem);

    console.log("Decal placed from fileUrl at (0,1,0.5).");
  }

  // (Optional) If you want the old FileReader approach too, you can do that:
  uploadImageInput.addEventListener('change', (e) => {
    // If you want the DataURL logic for local user preview:
    const file = e.target.files[0];
    if (!file) return;
    console.log("File chosen (DataURL approach):", file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      console.log("File read as DataURL, but we won't place it until user clicks 'Upload'.");
    };
    reader.readAsDataURL(file);
  });

  // ============= 7) Add text =============
  const decalsArray = [];
  const textArray = [];

  addTextBtn.addEventListener('click', () => {
    const textVal = textValueInput.value.trim();
    if (!textVal) return;
    const tColor = textColorInput.value;

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');
    ctx.clearRect(0,0,textCanvas.width, textCanvas.height);
    ctx.fillStyle = tColor;
    ctx.font = '50px sans-serif';
    const metrics = ctx.measureText(textVal);
    const x = (textCanvas.width - metrics.width) / 2;
    const y = textCanvas.height / 2 + 15;
    ctx.fillText(textVal, x, y);

    const textTexture = new THREE.Texture(textCanvas);
    textTexture.needsUpdate = true;

    const textGeom = new THREE.PlaneGeometry(1, 0.5);
    const textMat = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
    const textMesh = new THREE.Mesh(textGeom, textMat);

    textMesh.position.set(0, 1, 0.5);
    scene.add(textMesh);

    const textItem = {
      type: 'text',
      mesh: textMesh,
      content: textVal,
      color: tColor,
      name: textVal
    };
    textArray.push(textItem);
    addLayerItem(textItem);

    console.log("Text added:", textVal);
  });

  // ============= 8) Layers / Items =============
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

    // rename input
    const renameInput = document.createElement('input');
    renameInput.type = 'text';
    renameInput.className = 'form-control form-control-sm me-2';
    renameInput.value = item.name || (item.type === 'text' ? item.content : "Decal");
    renameInput.style.width = '120px';
    renameInput.addEventListener('change', () => {
      item.name = renameInput.value;
      if (item.type === 'text') {
        item.content = renameInput.value;
      }
    });
    div.appendChild(renameInput);

    // Action dropdown
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm me-2';
    const opts = ['Use','Remove','Delete'];
    opts.forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      select.appendChild(o);
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
          if (idx >= 0) decalsArray.splice(idx,1);
        } else if (item.type === 'text') {
          const idx = textArray.indexOf(item);
          if (idx >= 0) textArray.splice(idx,1);
        }
      }
      select.value = '';
    });
    div.appendChild(select);

    itemsList.appendChild(div);
  }

  // ============= 9) Save design => /save_design/ =============
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
    .catch(err => console.error(err));
  });

  function gatherDesignData() {
    const data = {
      product: currentProductKey,
      color: currentColor,
      decals: [],
      texts: []
    };
    for (let d of decalsArray) {
      data.decals.push({
        imageUrl: d.imageUrl,
        position: { x: d.position.x, y: d.position.y, z: d.position.z },
        rotation: { x: d.rotation.x, y: d.rotation.y, z: d.rotation.z },
        size: { x: d.size.x, y: d.size.y, z: d.size.z },
        name: d.name
      });
    }
    for (let t of textArray) {
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
    }
    return data;
  }

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

  // ============= 10) Resize =============
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

  // ============= 11) Render loop =============
  function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }
  animate();
});




  
actualMesh.material.wireframe = true;

  
  
  
  








