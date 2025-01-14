// static/js/decal_tshirt.js
document.addEventListener('DOMContentLoaded', () => {
    // 1) DOM elements
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
  
    // We'll store the currently chosen product as a string, e.g. 'Tshirt.glb'
    let currentProduct = 'Tshirt.glb';
    // We'll store the product choice in a simpler form for the DB, e.g. 'tshirt'
    let currentProductKey = 'tshirt';
  
    // 2) Three.js setup
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
  
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
  
    // 3) Load GLTF
    let productMesh = null;
    const gltfLoader = new THREE.GLTFLoader();
  
    function loadModel(modelName) {
      if (productMesh) {
        scene.remove(productMesh);
        productMesh = null;
      }
      const path = '/static/models/' + modelName;
  
      gltfLoader.load(
        path,
        (gltf) => {
          productMesh = gltf.scene;
          scene.add(productMesh);
  
          // scale + center
          productMesh.scale.set(15, 15, 15);
          const bbox = new THREE.Box3().setFromObject(productMesh);
          const center = bbox.getCenter(new THREE.Vector3());
          productMesh.position.x -= center.x;
          productMesh.position.y -= center.y;
          productMesh.position.z -= center.z;
  
          // adjust camera + orbit
          bbox.setFromObject(productMesh);
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
  
    // 4) Switch product
    productBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const modelFile = btn.dataset.model; // e.g. 'Hoodie.glb'
        currentProduct = modelFile;
        // set a simpler key for the DB
        if (modelFile.toLowerCase().includes('hoodie')) currentProductKey = 'hoodie';
        else if (modelFile.toLowerCase().includes('baggy')) currentProductKey = 'baggy';
        else if (modelFile.toLowerCase().includes('jumper')) currentProductKey = 'jumper';
        else currentProductKey = 'tshirt';
  
        loadModel(currentProduct);
      });
    });
  
    // 5) Color
    let currentColor = '#ffffff';
    function setProductColor(hex) {
      currentColor = hex;
      if (!productMesh) return;
  
      productMesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.color) {
          node.material.wireframe = false;
          node.material.color.set(hex);
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
  
    // 6) Decal approach for images
    // We let user pick an image, then on click in the canvas => place decal
    let currentDecalTexture = null;
    let isDecalMode = false; // once user picks an image, we go into "click to place" mode
  
    uploadImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imgUrl = evt.target.result;
        currentDecalTexture = new THREE.TextureLoader().load(imgUrl);
        currentDecalTexture.minFilter = THREE.LinearFilter;
        currentDecalTexture.magFilter = THREE.LinearFilter;
  
        // user can now click the model to place the decal
        isDecalMode = true;
        console.log("Ready to place decal. Click on the model.");
      };
      reader.readAsDataURL(file);
    });
  
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
  
    function onCanvasClick(event) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
      raycaster.setFromCamera(mouse, camera);
      if (!productMesh) return;
  
      const intersects = raycaster.intersectObject(productMesh, true);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        // If we are in decal mode, place an image
        if (isDecalMode && currentDecalTexture) {
          placeDecal(intersect);
        }
      }
    }
    canvas.addEventListener('pointerdown', onCanvasClick);
  
    // store decals + text for layers
    const decalsArray = [];
    const textArray = [];
  
    function placeDecal(intersect) {
      const point = intersect.point.clone();
      const normal = intersect.face.normal.clone()
        .transformDirection(intersect.object.matrixWorld)
        .normalize();
  
      // orientation: align decal +Z to the normal
      const orientation = new THREE.Euler();
      orientation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,0,1), normal
      ));
  
      // size
      const size = new THREE.Vector3(0.5, 0.5, 0.5);
  
      // Create DecalGeometry
      const decalGeom = new THREE.DecalGeometry(
        intersect.object,
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
  
      // push into array so we can track + delete
      const decalItem = {
        type: 'decal',
        mesh: decalMesh,
        imageUrl: currentDecalTexture.image.currentSrc, // data URL or file blob
        position: point,
        rotation: orientation,
        size: size
      };
      decalsArray.push(decalItem);
      addLayerItem(decalItem);
  
      // reset
      isDecalMode = false;
      currentDecalTexture = null;
      uploadImageInput.value = ''; // clear file input
      console.log("Decal placed!");
    }
  
    // 7) Add text
    addTextBtn.addEventListener('click', () => {
      const textVal = textValueInput.value.trim();
      if (!textVal) return;
      const tColor = textColorInput.value;
  
      // create a plane with the text
      // We'll place it in front (0,1,0.5) for instance, user can't drag it with decal geometry
      // but let's do plane approach
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
  
      // place it in front
      textMesh.position.set(0, 1, 0.5);
      scene.add(textMesh);
  
      // store in array
      const textItem = {
        type: 'text',
        mesh: textMesh,
        content: textVal,
        color: tColor
      };
      textArray.push(textItem);
      addLayerItem(textItem);
  
      console.log("Text added:", textVal);
    });
  
    // 8) “Layers” list (itemsList) + delete logic
    function addLayerItem(item) {
      const div = document.createElement('div');
      div.className = 'layer-item';
  
      if (item.type === 'decal') {
        div.textContent = 'Decal';
      } else if (item.type === 'text') {
        div.textContent = `Text: ${item.content}`;
      }
  
      const btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.style.marginLeft = '1rem';
      btn.addEventListener('click', () => {
        // remove from scene, remove from array
        scene.remove(item.mesh);
        if (item.type === 'decal') {
          const idx = decalsArray.indexOf(item);
          if (idx >= 0) decalsArray.splice(idx, 1);
        } else if (item.type === 'text') {
          const idx = textArray.indexOf(item);
          if (idx >= 0) textArray.splice(idx, 1);
        }
        div.remove();
      });
      div.appendChild(btn);
  
      itemsList.appendChild(div);
    }
  
    // 9) Save design => /save_design/
    saveDesignBtn.addEventListener('click', () => {
      const designData = gatherDesignData();
      fetch('/save_design/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') // typical Django CSRF
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
      // product => 'tshirt', 'hoodie', etc.
      // color => currentColor
      // decals => from decalsArray
      // texts => from textArray
      const data = {
        product: currentProductKey, // 'tshirt', 'hoodie', ...
        color: currentColor,
        decals: [],
        texts: []
      };
  
      // Decals => gather position, rotation, size
      for (let d of decalsArray) {
        // d.mesh has geometry, but we actually stored the info in d (position, rotation, etc.)
        // If you want to read them from the mesh, you can do so, but we have it here:
        const pos = d.position; 
        const rot = d.rotation;
        const size = d.size;
        data.decals.push({
          imageUrl: d.imageUrl,
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: rot.x, y: rot.y, z: rot.z },
          size: { x: size.x, y: size.y, z: size.z }
        });
      }
  
      // Text => gather position, rotation, scale
      for (let t of textArray) {
        // read from t.mesh:
        const pos = t.mesh.position;
        const rot = t.mesh.rotation;
        const scl = t.mesh.scale;
        data.texts.push({
          content: t.content,
          color: t.color,
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: rot.x, y: rot.y, z: rot.z },
          scale: { x: scl.x, y: scl.y, z: scl.z }
        });
      }
  
      return data;
    }
  
    // typical Django CSRF helper
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
  
    // 10) Resize
    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
  
    // 11) Render loop
    function animate() {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    }
    animate();
  });
  
  
  
  
  
  








