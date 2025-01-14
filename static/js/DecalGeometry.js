// static/js/decal_tshirt.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM elements ---
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
  
    // track current product model file
    let currentModel = 'Tshirt.glb';
    let currentProductKey = 'tshirt'; // for saving (e.g. 'baggy', 'hoodie', etc.)
  
    // 1) Three.js Setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
  
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth/canvas.clientHeight, 0.1, 1000);
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
  
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
  
    // 2) Load GLTF models
    let productMesh = null;
    const gltfLoader = new THREE.GLTFLoader();
  
    function loadModel(modelName) {
      // Remove old product if any
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
          productMesh.scale.set(15,15,15);
          const bbox = new THREE.Box3().setFromObject(productMesh);
          const center = bbox.getCenter(new THREE.Vector3());
          productMesh.position.x -= center.x;
          productMesh.position.y -= center.y;
          productMesh.position.z -= center.z;
  
          // adjust camera/orbit
          bbox.setFromObject(productMesh);
          const sphere = new THREE.Sphere();
          bbox.getBoundingSphere(sphere);
  
          camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + sphere.radius*2);
          orbitControls.target.copy(sphere.center);
          orbitControls.update();
  
          orbitControls.minDistance = sphere.radius * 0.8;
          orbitControls.maxDistance = sphere.radius * 5;
  
          // reapply color if set
          setProductColor(currentColor);
  
          console.log(modelName, "loaded!");
        },
        undefined,
        (err) => console.error("Error loading", modelName, err)
      );
    }
    loadModel(currentModel);
  
    productBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const file = btn.dataset.model; // e.g. 'Hoodie.glb'
        currentModel = file;
  
        if (file.toLowerCase().includes('baggy')) currentProductKey = 'baggy';
        else if (file.toLowerCase().includes('hoodie')) currentProductKey = 'hoodie';
        else if (file.toLowerCase().includes('jumper')) currentProductKey = 'jumper';
        else currentProductKey = 'tshirt';
  
        loadModel(currentModel);
      });
    });
  
    // 3) Color
    let currentColor = '#ffffff';
    function setProductColor(hex) {
      currentColor = hex;
      if (!productMesh) return;
      productMesh.traverse((node)=>{
        if (node.isMesh && node.material && node.material.color) {
          node.material.wireframe = false;
          node.material.color.set(hex);
        }
      });
    }
    colorBtns.forEach((btn)=>{
      btn.addEventListener('click',(e)=>{
        setProductColor(e.target.dataset.color);
      });
    });
    customColorInput.addEventListener('input', (e)=>{
      setProductColor(e.target.value);
    });
  
    // 4) Decals (images) => we let user upload, then click model
    let isDecalMode = false;
    let currentDecalTexture = null;
  
    uploadImageInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (evt)=>{
        const imgUrl = evt.target.result;
        currentDecalTexture = new THREE.TextureLoader().load(imgUrl);
        currentDecalTexture.minFilter = THREE.LinearFilter;
        currentDecalTexture.magFilter = THREE.LinearFilter;
  
        isDecalMode = true; // now user can click on the product
        console.log("Ready to place decal. Click on the model.");
      };
      reader.readAsDataURL(file);
    });
  
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
  
    canvas.addEventListener('pointerdown', (event)=>{
      if (!productMesh) return;
  
      // convert mouse coords
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left)/rect.width)*2 -1;
      mouse.y = -((event.clientY - rect.top)/rect.height)*2 +1;
  
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(productMesh, true);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (isDecalMode && currentDecalTexture) {
          placeDecal(intersect);
        }
      }
    });
  
    const decalsArray = [];
    function placeDecal(intersect) {
      const point = intersect.point.clone();
      const normal = intersect.face.normal.clone()
        .transformDirection(intersect.object.matrixWorld)
        .normalize();
  
      const orientation = new THREE.Euler();
      orientation.setFromQuaternion( new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,0,1),
        normal
      ));
  
      const size = new THREE.Vector3(0.5, 0.5, 0.5);
  
      // Construct DecalGeometry (Simplified if using the partial code from DecalGeometry.js)
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
  
      // track item
      const decalItem = {
        type: 'decal',
        mesh: decalMesh,
        imageUrl: currentDecalTexture.image.currentSrc,
      };
      decalsArray.push(decalItem);
      addLayerItem(decalItem);
  
      // reset decal mode
      isDecalMode = false;
      currentDecalTexture = null;
      uploadImageInput.value = '';
      console.log("Decal placed!");
    }
  
    // 5) Text => plane geometry
    const textArray = [];
    addTextBtn.addEventListener('click', ()=>{
      const val = textValueInput.value.trim();
      if (!val) return;
      const col = textColorInput.value;
  
      // create a canvas for text
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 512;
      textCanvas.height = 256;
      const ctx = textCanvas.getContext('2d');
      ctx.clearRect(0,0,textCanvas.width, textCanvas.height);
      ctx.fillStyle = col;
      ctx.font = '50px sans-serif';
      const metrics = ctx.measureText(val);
      const x = (textCanvas.width - metrics.width)/2;
      const y = textCanvas.height/2 +15;
      ctx.fillText(val, x, y);
  
      const textTexture = new THREE.Texture(textCanvas);
      textTexture.needsUpdate = true;
  
      const textGeom = new THREE.PlaneGeometry(1, 0.5);
      const textMat = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
      const textMesh = new THREE.Mesh(textGeom, textMat);
      textMesh.position.set(0,1,0.5); // in front
      scene.add(textMesh);
  
      const textItem = {
        type: 'text',
        mesh: textMesh,
        content: val,
        color: col
      };
      textArray.push(textItem);
      addLayerItem(textItem);
  
      console.log("Text added:", val);
    });
  
    // 6) Layers / Items
    function addLayerItem(item) {
      const div = document.createElement('div');
      div.className = "d-flex justify-content-between align-items-center mb-1";
      if (item.type === 'decal') {
        div.textContent = "Decal";
      } else if (item.type === 'text') {
        div.textContent = "Text: " + item.content;
      }
  
      const btn = document.createElement('button');
      btn.className = "btn btn-sm btn-danger";
      btn.textContent = "Delete";
      btn.addEventListener('click', ()=>{
        scene.remove(item.mesh);
        if (item.type === 'decal') {
          const idx = decalsArray.indexOf(item);
          if (idx>=0) decalsArray.splice(idx,1);
        } else if (item.type === 'text') {
          const idx = textArray.indexOf(item);
          if (idx>=0) textArray.splice(idx,1);
        }
        div.remove();
      });
      div.appendChild(btn);
  
      itemsList.appendChild(div);
    }
  
    // 7) Save Design
    saveDesignBtn.addEventListener('click', ()=>{
      const designData = gatherDesignData();
      console.log("Design Data:", designData);
      // Here you'd do fetch('/save_design/', { method:'POST', body: JSON.stringify(...) })
      // For example:
      /*
      fetch('/save_design/', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(designData)
      })
      .then(r => r.json())
      .then(d => console.log("Saved design:", d))
      .catch(err => console.error(err));
      */
    });
  
    function gatherDesignData() {
      const data = {
        product: currentProductKey,
        color: currentColor,
        decals: [],
        texts: []
      };
      // Build decal data
      for (let d of decalsArray) {
        // We don't store exact position/rotation if using real DecalGeometry
        // but let's assume we want them:
        data.decals.push({
          imageUrl: d.imageUrl,
          // For a real approach, we stored pos, rot, size when we placed it. 
          // If you want to read from the mesh, you'd do: mesh.position, etc.
          // We'll skip that in this simplified example.
          position: { x: 0, y:0, z:0 },
          rotation: { x:0, y:0, z:0 },
          size: { x:0.5, y:0.5, z:0.5 }
        });
      }
      // Build text data
      for (let t of textArray) {
        const pos = t.mesh.position;
        const rot = t.mesh.rotation;
        const scl = t.mesh.scale;
        data.texts.push({
          content: t.content,
          color: t.color,
          position:{ x:pos.x, y:pos.y, z:pos.z },
          rotation:{ x:rot.x, y:rot.y, z:rot.z },
          scale:{ x:scl.x, y:scl.y, z:scl.z }
        });
      }
      return data;
    }
  
    // typical CSRF if needed
    function getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i=0; i<cookies.length; i++){
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length+1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length+1));
            break;
          }
        }
      }
      return cookieValue;
    }
  
    // 8) Resize
    window.addEventListener('resize', ()=>{
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
  
    // 9) Animation loop
    function animate(){
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    }
    animate();
  });
  