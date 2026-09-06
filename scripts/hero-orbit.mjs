import * as THREE from "../assets/vendor/three.module.min.js";
import {
  SATELLITES,
  CAMERA_DISTANCE,
  CAMERA_FOV,
  VIEW_HEIGHT,
  PORTRAIT_RATIO,
  orbitPosition,
  orbitPoint,
} from "./orbit-math.mjs";

export function createHeroOrbit(element) {
  const canvas = element.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 30);
  camera.position.z = CAMERA_DISTANCE;
  // Write only depth: the original DOM portrait remains visible through the canvas.
  const portraitGeometry = new THREE.CircleGeometry(
    (VIEW_HEIGHT * PORTRAIT_RATIO) / 2,
    128,
  );
  const portraitMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
  const portraitOccluder = new THREE.Mesh(portraitGeometry, portraitMaterial);
  portraitOccluder.renderOrder = -1;
  scene.add(portraitOccluder);
  // Broad studio reflections give the spheres readable curved highlights.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x080d18);
  const panels = [];
  for (const [color, brightness, width, height, x, y, z] of [
    [0xffffff, 4, 3, 6, -4, 4, 3],
    [0x9ecbff, 1.8, 2, 5, 4, 0, 2],
    [0x5aaaff, 1, 5, 2, 0, -4, -3],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(brightness),
        side: THREE.DoubleSide,
      }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
    panels.push(panel);
  }
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const environment = environmentGenerator.fromScene(studio, 0.35, 0.1, 30);
  scene.environment = environment.texture;
  environmentGenerator.dispose();
  panels.forEach((panel) => {
    panel.geometry.dispose();
    panel.material.dispose();
  });
  scene.add(new THREE.AmbientLight(0x7e9fc9, 0.5));
  const sphereGeometry = new THREE.SphereGeometry(1, 36, 24);
  const sphereMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x182c46,
    metalness: 0.65,
    roughness: 0.45,
    envMapIntensity: 1.6,
    clearcoat: 0,
  });
  const rimMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),3.0);gl_FragColor=vec4(0.22,0.65,0.92,rim*0.65);}`,
  });
  const trailMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `attribute float strength; varying float vStrength;
      void main(){vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying float vStrength;
      void main(){gl_FragColor=vec4(mix(vec3(0.05,0.24,0.45),vec3(0.45,0.85,1.0),vStrength),vStrength*0.9);}`,
  });
  const segments = 80;
  class OrbitCurve extends THREE.Curve {
    constructor(spec) {
      super();
      this.spec = spec;
    }
    getPoint(t, target = new THREE.Vector3()) {
      const point = orbitPoint(this.spec, t * Math.PI * 2);
      return target.set(point.x, point.y, point.z);
    }
  }
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0xadc6d4,
    emissive: 0x19324a,
    emissiveIntensity: 0.35,
    metalness: 0.7,
    roughness: 0.32,
  });
  const satellites = SATELLITES.map((spec) => {
    const trackGeometry = new THREE.TubeGeometry(
      new OrbitCurve(spec),
      256,
      0.012,
      8,
      true,
    );
    scene.add(new THREE.Mesh(trackGeometry, trackMaterial));
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    const rim = new THREE.Mesh(sphereGeometry, rimMaterial);
    sphere.add(rim);
    rim.scale.setScalar(1.025);
    scene.add(sphere);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 6);
    const strengths = new Float32Array((segments + 1) * 2);
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      strengths[i * 2] = strengths[i * 2 + 1] = (i / segments) ** 1.8;
      if (i < segments) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute("strength", new THREE.BufferAttribute(strengths, 1));
    geometry.setIndex(indices);
    const trail = new THREE.Mesh(geometry, trailMaterial);
    trail.frustumCulled = false;
    scene.add(trail);
    return {
      spec,
      sphere,
      geometry,
      trackGeometry,
      positions,
      label: element.querySelector(".orbit-" + spec.name),
      point: {},
      tangent: {},
      projected: new THREE.Vector3(),
    };
  });
  let width = 1;
  let sizeScale = 1;
  let visible = true;
  let lost = false;
  let currentTime = 0;
  function draw(time) {
    currentTime = time;
    if (!visible || lost) return;
    for (const item of satellites) {
      const { spec, sphere, positions, point, tangent, projected, label } =
        item;
      orbitPosition(spec, time, point);
      sphere.position.set(point.x, point.y, point.z);
      sphere.scale.setScalar(spec.size * sizeScale);
      projected.copy(sphere.position).project(camera);
      const x = (projected.x * width) / 2;
      const y = (-projected.y * width) / 2;
      const labelScale =
        (Math.max(0.76, Math.min(1.12, width / 370)) * CAMERA_DISTANCE) /
        (CAMERA_DISTANCE - point.z);
      label.style.transform = `translate(calc(-50% + ${x.toFixed(3)}px),calc(-50% + ${y.toFixed(3)}px)) scale(${labelScale.toFixed(3)})`;
      // Match the depth disk for DOM text so back labels disappear behind the portrait too.
      label.style.maskImage =
        point.z + spec.size * sizeScale < 0
          ? `radial-gradient(circle ${(width * PORTRAIT_RATIO) / 2 / labelScale}px at ${24 - x / labelScale}px ${24 - y / labelScale}px, transparent 99.5%, black 100%)`
          : "none";
      label.style.zIndex = String(Math.round(100 + point.z * 10));
      for (let i = 0; i <= segments; i++) {
        const strength = i / segments;
        // Sample the unwrapped past trajectory, so the trail never resets at 360 degrees.
        const sampleTime = time - (1 - strength) * ((4.8 * 9) / 26);
        orbitPosition(spec, sampleTime, point);
        orbitPosition(spec, sampleTime + 0.01, tangent);
        const dx = tangent.x - point.x,
          dy = tangent.y - point.y;
        const length = Math.hypot(dx, dy) || 1;
        const halfWidth = (0.002 + strength * 0.022) * sizeScale;
        const nx = (-dy / length) * halfWidth,
          ny = (dx / length) * halfWidth;
        positions.set(
          [
            point.x + nx,
            point.y + ny,
            point.z,
            point.x - nx,
            point.y - ny,
            point.z,
          ],
          i * 6,
        );
      }
      item.geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  const resize = () => {
    width = element.clientWidth;
    if (!width) return;
    sizeScale = Math.max(1, 288 / width);
    renderer.setPixelRatio(Math.min(2, Math.max(1.5, devicePixelRatio || 1)));
    renderer.setSize(width, width, false);
    draw(currentTime);
  };
  camera.updateMatrixWorld();
  resize();
  element.dataset.renderer = "webgl";
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) draw(currentTime);
  });
  intersectionObserver.observe(element);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    element.dataset.renderer = "unavailable";
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    resize();
    element.dataset.renderer = "webgl";
  });
  addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) return;
      lost = true;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      satellites.forEach((item) => {
        item.geometry.dispose();
        item.trackGeometry.dispose();
      });
      trackMaterial.dispose();
      portraitGeometry.dispose();
      portraitMaterial.dispose();
      environment.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      rimMaterial.dispose();
      trailMaterial.dispose();
      renderer.dispose();
    },
    { once: true },
  );
  return draw;
}
