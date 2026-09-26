import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PLANETS, SUN } from '@/data/planets';
import type { Planet, PlanetId } from '@/data/types';
import { helioPosition, scenePosition } from './kepler';
import { makeGlowTexture, makePlanetTexture, makeRingTexture, makeStarTexture } from './textures';

export interface SolarSystemCallbacks {
  onHover: (id: PlanetId | 'sun' | null) => void;
  onSelect: (id: PlanetId | 'sun' | null) => void;
  onLoadProgress?: (loaded: number, total: number) => void;
}

interface MoonNode {
  pivot: THREE.Object3D;
  speed: number;
}

interface PlanetNode {
  planet: Planet;
  group: THREE.Group; // positioned on orbit
  mesh: THREE.Mesh;
  label: HTMLButtonElement;
  angle: number;
  orbitRadius: number;
  yLevel: number;
  moons: MoonNode[];
  clouds?: THREE.Mesh;
}

interface CameraTween {
  t: number;
  dur: number;
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  to: () => { pos: THREE.Vector3; target: THREE.Vector3 };
}

const PLANET_TILT = 0.41; // gentle tilt of the whole system for drama
const HOME_POS = new THREE.Vector3(0, 72, 138);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);

export class SolarSystem {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private pointerActive = false;
  private downPos = new THREE.Vector2();
  private dragging = false;
  private planetNodes: PlanetNode[] = [];
  private sunMesh!: THREE.Mesh;
  private sunLabel!: HTMLButtonElement;
  private orbitGroup = new THREE.Group();
  private beltGroup = new THREE.Group();
  private speed = 1;
  private paused = false;
  private showOrbits = true;
  private showLabels = true;
  private selected: PlanetId | 'sun' | null = null;
  private hovered: PlanetId | 'sun' | null = null;
  private labelLayer: HTMLElement;
  private clock = new THREE.Clock();
  private frame = 0;
  private disposed = false;
  private composer?: EffectComposer;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;
  private tween: CameraTween | null = null;
  private followNode: PlanetNode | 'sun' | null = null;
  private lastFollowPos = new THREE.Vector3();
  private loadTotal = 0;
  private loadDone = 0;

  constructor(container: HTMLElement, labelLayer: HTMLElement, private callbacks: SolarSystemCallbacks) {
    this.container = container;
    this.labelLayer = labelLayer;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0908, 1);
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.FogExp2(0x0a0908, 0.0011);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);
    this.camera.position.copy(HOME_POS);
    this.camera.lookAt(HOME_TARGET);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 380;
    this.controls.target.copy(HOME_TARGET);

    this.buildLights();
    this.buildMilkyWay();
    this.buildStars();
    this.buildSun();
    this.buildPlanets();
    this.buildBelt();

    this.orbitGroup.rotation.x = PLANET_TILT;
    this.scene.add(this.orbitGroup);
    this.scene.add(this.beltGroup);

    this.initComposer();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('click', this.onClick);

    this.renderer.setAnimationLoop(this.tick);
  }

  private initComposer(): void {
    void (async () => {
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ]);
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
          0.85, // strength
          0.55, // radius
          0.82, // threshold
        );
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
        this.composer = composer;
      } catch {
        this.composer = undefined;
      }
    })();
  }

  private readonly texLoader = new THREE.TextureLoader();

  private loadMap(file: string, onReady: (tex: THREE.Texture) => void): void {
    this.loadTotal += 1;
    this.callbacks.onLoadProgress?.(this.loadDone, this.loadTotal);
    this.texLoader.load(
      `/textures/${file}`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        onReady(tex);
        this.loadDone += 1;
        this.callbacks.onLoadProgress?.(this.loadDone, this.loadTotal);
      },
      undefined,
      () => {
        // Network or file failure: keep the procedural fallback already in place.
        this.loadDone += 1;
        this.callbacks.onLoadProgress?.(this.loadDone, this.loadTotal);
      },
    );
  }

  private buildMilkyWay(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x707080,
      side: THREE.BackSide,
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(760, 48, 48), mat);
    dome.rotation.z = 0.5;
    this.scene.add(dome);
    this.loadMap('2k_stars_milky_way.jpg', (tex) => {
      mat.map = tex;
      mat.color.set(0x8a8a96);
      mat.needsUpdate = true;
    });
  }

  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0x38332c, 0.45));
    const sunLight = new THREE.PointLight(0xffe0b0, 2200, 0, 2);
    this.scene.add(sunLight);
    // Faint cool rim from the far side so the far planets never go fully black.
    const fill = new THREE.DirectionalLight(0x8fa0c0, 0.22);
    fill.position.set(-1, 0.6, -1);
    this.scene.add(fill);
  }

  private buildStars(): void {
    const count = 2600;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rand = () => Math.random();
    for (let i = 0; i < count; i++) {
      const r = 420 + rand() * 520;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1.2 + rand() * 2.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: true,
      map: new THREE.CanvasTexture(makeStarTexture()),
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      color: 0xfff4e0,
      fog: false,
    });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
  }

  private buildSun(): void {
    const geo = new THREE.SphereGeometry(6.2, 48, 48);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdca0 });
    this.sunMesh = new THREE.Mesh(geo, mat);
    this.orbitGroup.add(this.sunMesh);
    this.loadMap('2k_sun.jpg', (tex) => {
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(makeGlowTexture()),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95,
      }),
    );
    glow.scale.set(34, 34, 1);
    this.orbitGroup.add(glow);

    this.sunLabel = this.makeLabel(SUN.name, 'sun', '☉');
  }

  private makeLabel(text: string, id: PlanetId | 'sun', numeral: string): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'planet-label';
    el.innerHTML = `<span class="planet-label__numeral">${numeral}</span><span class="planet-label__name">${text}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onSelect(id);
    });
    el.addEventListener('pointerenter', () => this.callbacks.onHover(id));
    el.addEventListener('pointerleave', () => this.callbacks.onHover(null));
    this.labelLayer.appendChild(el);
    return el;
  }

  private makeAtmosphere(radius: number, hex: string, intensity: number): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(hex) },
        uIntensity: { value: intensity },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        void main() {
          float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
          gl_FragColor = vec4(uColor, 1.0) * rim * uIntensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 40), mat);
  }

  private buildPlanets(): void {
    const now = new Date();
    const tmp = { x: 0, y: 0, z: 0 };

    for (const planet of PLANETS) {
      const group = new THREE.Group();

      // Tonight's real position: direction and distance from the Kepler
      // elements, radially compressed so the inner system stays visible.
      scenePosition(helioPosition(planet.elements, now), tmp);
      const r = Math.sqrt(tmp.x * tmp.x + tmp.z * tmp.z);
      const angle = Math.atan2(tmp.z, tmp.x);
      const yLevel = tmp.y;

      const geo = new THREE.SphereGeometry(planet.size, 48, 48);
      const tex = new THREE.CanvasTexture(makePlanetTexture(planet, planet.id));
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: planet.kind === 'Rocky world' ? 0.94 : 0.66,
        metalness: 0.02,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Real axial tilt (Uranus and Pluto lie tipped far over).
      mesh.rotation.z = THREE.MathUtils.degToRad(planet.tilt);
      group.add(mesh);

      this.loadMap(planet.texture, (realTex) => {
        mat.map = realTex;
        mat.needsUpdate = true;
      });

      // Atmospheric rim glow.
      if (planet.atmosphere) {
        const strength = planet.id === 'earth' ? 1.25 : planet.id === 'venus' ? 0.9 : 0.55;
        group.add(this.makeAtmosphere(planet.size * 1.16, planet.atmosphere, strength));
      }

      // Earth: drifting cloud layer.
      let clouds: THREE.Mesh | undefined;
      if (planet.id === 'earth') {
        const cloudGeo = new THREE.SphereGeometry(planet.size * 1.022, 48, 48);
        const cloudMat = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        clouds = new THREE.Mesh(cloudGeo, cloudMat);
        group.add(clouds);
        this.loadMap('2k_earth_clouds.jpg', (realTex) => {
          cloudMat.map = realTex;
          cloudMat.color.set(0xffffff);
          cloudMat.needsUpdate = true;
        });
      }

      // Moons (data-driven).
      const moons: MoonNode[] = [];
      for (const cfg of planet.moons ?? []) {
        const pivot = new THREE.Object3D();
        pivot.rotation.z = THREE.MathUtils.degToRad(3 + Math.random() * 5);
        const moonMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.96 });
        const moon = new THREE.Mesh(new THREE.SphereGeometry(cfg.size, 24, 24), moonMat);
        moon.position.x = cfg.dist;
        pivot.add(moon);
        group.add(pivot);
        moons.push({ pivot, speed: cfg.speed });
        if (cfg.texture) {
          this.loadMap(cfg.texture, (realTex) => {
            moonMat.map = realTex;
            moonMat.color.set(0xffffff);
            moonMat.needsUpdate = true;
          });
        }
      }

      if (planet.rings) {
        const isSaturn = planet.id === 'saturn';
        const inner = planet.size * (isSaturn ? 1.45 : 1.55);
        const outer = planet.size * (isSaturn ? 2.6 : 1.95);
        const ringGeo = new THREE.RingGeometry(inner, outer, 128);
        // Remap UVs so the ring texture reads as concentric bands.
        const pos = ringGeo.attributes.position as THREE.BufferAttribute;
        const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const rr = v3.length();
          uv.setXY(i, (rr - inner) / (outer - inner), 0.5);
        }
        const ringTex = new THREE.CanvasTexture(makeRingTexture());
        ringTex.colorSpace = THREE.SRGBColorSpace;
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          opacity: isSaturn ? 0.96 : 0.3,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        // Saturn's rings lean with its tilt; Uranus's rings stand nearly perpendicular.
        ring.rotation.x = isSaturn ? Math.PI / 2 : Math.PI / 2.15;
        group.add(ring);
        if (isSaturn) {
          this.loadMap('2k_saturn_ring_alpha.png', (realTex) => {
            ringMat.map = realTex;
            ringMat.needsUpdate = true;
          });
        }
      }

      // Orbit line: a circle at tonight's radius and height.
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(a) * r, yLevel, Math.sin(a) * r));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0xc9a85c,
        transparent: true,
        opacity: 0.16,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.name = `orbit-${planet.id}`;
      this.orbitGroup.add(orbitLine);

      group.position.set(Math.cos(angle) * r, yLevel, Math.sin(angle) * r);
      this.orbitGroup.add(group);
      this.planetNodes.push({
        planet,
        group,
        mesh,
        angle,
        orbitRadius: r,
        yLevel,
        moons,
        clouds,
        label: this.makeLabel(planet.name, planet.id, planet.numeral),
      });
    }
  }

  private buildBelt(): void {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const rand = () => Math.random();
    for (let i = 0; i < count; i++) {
      const r = 31 + rand() * 12;
      const a = rand() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (rand() - 0.5) * 1.6;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55,
      sizeAttenuation: true,
      map: new THREE.CanvasTexture(makeStarTexture()),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
      color: 0x9a8f7f,
    });
    this.beltGroup.add(new THREE.Points(geo, mat));
  }

  private pick(): PlanetId | 'sun' | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const sunHit = this.raycaster.intersectObject(this.sunMesh, false);
    if (sunHit.length > 0) return 'sun';
    const meshes = this.planetNodes.map((n) => n.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const node = this.planetNodes.find((n) => n.mesh === hits[0].object);
    return node ? node.planet.id : null;
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.pointerActive = true;
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.downPos.set(e.clientX, e.clientY);
    this.dragging = false;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) > 6) {
      this.dragging = true;
    }
  };

  private onPointerLeave = (): void => {
    this.pointerActive = false;
    this.setHovered(null);
  };

  private onClick = (): void => {
    if (!this.pointerActive || this.dragging) return;
    this.callbacks.onSelect(this.pick());
  };

  private setHovered(id: PlanetId | 'sun' | null): void {
    if (this.hovered === id) return;
    this.hovered = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    for (const n of this.planetNodes) {
      const active = id === n.planet.id || this.selected === n.planet.id;
      (n.mesh.material as THREE.MeshStandardMaterial).emissive.set(active ? 0x2a2317 : 0x000000);
    }
  }

  private focus(node: PlanetNode | 'sun' | null): void {
    this.followNode = node;
    if (!node) {
      this.startTween(HOME_POS, HOME_TARGET, 1.5);
      return;
    }
    if (node === 'sun') {
      this.startTween(new THREE.Vector3(0, 17, 34), new THREE.Vector3(0, 0, 0), 1.5);
      return;
    }
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    this.focusPose(node, pos, target);
    this.startTween(pos, target, 1.6);
    this.lastFollowPos.copy(node.group.position);
  }

  private focusPose(node: PlanetNode, outPos: THREE.Vector3, outTarget: THREE.Vector3): void {
    const p = node.group.position;
    const dist = node.planet.rings ? node.planet.size * 7.5 : Math.max(node.planet.size * 6, 4.2);
    const dir = new THREE.Vector3().subVectors(this.camera.position, p);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.4, 1);
    dir.normalize();
    dir.y = Math.max(dir.y, 0.28);
    dir.normalize();
    outPos.copy(p).addScaledVector(dir, dist);
    outTarget.copy(p);
  }

  private startTween(toPos: THREE.Vector3, toTarget: THREE.Vector3, dur: number): void {
    this.tween = {
      t: 0,
      dur,
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      to: () => ({ pos: toPos, target: toTarget }),
    };
    this.controls.enabled = false;
  }

  setSelected(id: PlanetId | 'sun' | null): void {
    if (this.selected === id) return;
    this.selected = id;
    for (const n of this.planetNodes) {
      const active = this.hovered === n.planet.id || this.selected === n.planet.id;
      (n.mesh.material as THREE.MeshStandardMaterial).emissive.set(active ? 0x2a2317 : 0x000000);
    }
    this.focus(id === null ? null : id === 'sun' ? 'sun' : (this.planetNodes.find((n) => n.planet.id === id) ?? null));
  }

  setSpeed(v: number): void {
    this.speed = v;
  }

  setPaused(v: boolean): void {
    this.paused = v;
  }

  setShowOrbits(v: boolean): void {
    this.showOrbits = v;
    for (const child of this.orbitGroup.children) {
      if (child.name.startsWith('orbit-')) child.visible = v;
    }
  }

  setShowBelt(v: boolean): void {
    this.beltGroup.visible = v;
  }

  setShowLabels(v: boolean): void {
    this.showLabels = v;
    if (!v) {
      this.sunLabel.classList.remove('is-visible');
      for (const n of this.planetNodes) n.label.classList.remove('is-visible');
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCamera(dt: number): void {
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = this.easeInOut(tw.t);
      const dest = tw.to();
      this.camera.position.lerpVectors(tw.fromPos, dest.pos, k);
      this.controls.target.lerpVectors(tw.fromTarget, dest.target, k);
      if (tw.t >= 1) {
        this.tween = null;
        this.controls.enabled = true;
      }
    } else if (this.followNode && this.followNode !== 'sun') {
      // Track the orbiting world: translate the camera with it, keep it centered.
      const p = this.followNode.group.position;
      const delta = new THREE.Vector3().subVectors(p, this.lastFollowPos);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
      this.lastFollowPos.copy(p);
    }
    this.controls.update();
  }

  private tick = (): void => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const simSpeed = this.paused ? 0 : this.speed;

    for (const node of this.planetNodes) {
      node.angle += node.planet.orbitSpeed * 0.22 * simSpeed * dt;
      node.group.position.set(
        Math.cos(node.angle) * node.orbitRadius,
        node.yLevel,
        Math.sin(node.angle) * node.orbitRadius,
      );
      node.mesh.rotateY(node.planet.spinSpeed * 0.6 * simSpeed * dt);
      if (node.clouds) node.clouds.rotation.y += node.planet.spinSpeed * 0.72 * simSpeed * dt;
      for (const m of node.moons) m.pivot.rotation.y += m.speed * simSpeed * dt;
    }
    if (this.sunMesh && simSpeed > 0) {
      this.sunMesh.rotation.y += 0.02 * simSpeed * dt;
    }
    this.beltGroup.rotation.y += 0.085 * simSpeed * dt;

    this.updateCamera(dt);

    // Labels: project world position to screen.
    if (this.showLabels) {
      this.updateLabel(this.sunMesh, this.sunLabel, 0);
      for (const n of this.planetNodes) this.updateLabel(n.mesh, n.label, n.planet.size);
    }

    // Hover pick, throttled to every other frame.
    if (this.pointerActive && (this.frame = (this.frame + 1) % 2) === 0) {
      this.setHovered(this.pick());
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  private proj = new THREE.Vector3();

  private updateLabel(mesh: THREE.Object3D, el: HTMLButtonElement, size: number): void {
    mesh.getWorldPosition(this.proj);
    this.proj.y += size + 1.1;
    this.proj.project(this.camera);
    const behind = this.proj.z > 1;
    const x = (this.proj.x * 0.5 + 0.5) * this.container.clientWidth;
    const y = (-this.proj.y * 0.5 + 0.5) * this.container.clientHeight;
    const on = !behind && x > -40 && x < this.container.clientWidth + 40 && y > -20 && y < this.container.clientHeight + 20;
    el.classList.toggle('is-visible', on);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.innerHTML = '';
  }
}
