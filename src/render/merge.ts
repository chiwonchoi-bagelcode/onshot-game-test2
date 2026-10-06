import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapse all meshes under `root` that share a material into a single mesh
 * (baking their transforms). Cuts draw calls a lot on phones. Subtrees with
 * `userData.keep` (animated parts) are left alone.
 */
/**
 * One shared vertex-coloured material: plain flat-shaded opaque colours are
 * baked into the geometry so a whole prop (or the room shell) becomes a
 * single draw call instead of one per colour.
 */
export const VC_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function bakeable(mat: THREE.Material): mat is THREE.MeshLambertMaterial {
  const m = mat as THREE.MeshLambertMaterial;
  return !!m.isMeshLambertMaterial && m !== VC_MAT && !m.map && !m.transparent && !m.vertexColors && m.flatShading
    && m.side === THREE.FrontSide && m.emissive.getHex() === 0 && !m.userData.dynamic;
}

/** free GPU buffers of merged (per-level, uncached) geometry under root */
export function disposeMerged(root: THREE.Object3D) {
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g?.userData?.merged) g.dispose();
  });
}

export function mergeByMaterial(root: THREE.Object3D, opts: { oneShadow?: boolean } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; order: number; geos: THREE.BufferGeometry[] }>();
  const victims: THREE.Mesh[] = [];
  const m = new THREE.Matrix4();

  const visit = (o: THREE.Object3D) => {
    if (o !== root && o.userData.keep) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && mesh.visible) {
      const orig = mesh.material as THREE.Material & { map?: THREE.Texture | null };
      const bake = bakeable(orig);
      const mat = bake ? VC_MAT : orig;
      let g = mesh.geometry.clone();
      if (g.index) g = g.toNonIndexed();
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && !(name === 'uv' && mat.map)) g.deleteAttribute(name);
      }
      if (bake) {
        const c = (orig as THREE.MeshLambertMaterial).color;
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      if (mat.map && !g.attributes.uv) { g.dispose(); for (const c of o.children) visit(c); return; }
      g.morphAttributes = {};
      m.multiplyMatrices(inv, mesh.matrixWorld);
      g.applyMatrix4(m);
      // small props: casting and non-casting bits share one mesh (one draw call)
      const cast = opts.oneShadow ? true : mesh.castShadow;
      const key = `${mat.uuid}|${cast}|${mesh.receiveShadow}|${mesh.renderOrder}`;
      let b = buckets.get(key);
      if (!b) { b = { mat, cast, recv: mesh.receiveShadow, order: mesh.renderOrder, geos: [] }; buckets.set(key, b); }
      b.geos.push(g);
      victims.push(mesh);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  if (victims.length < 2) { for (const b of buckets.values()) for (const g of b.geos) g.dispose(); return; }

  for (const v of victims) v.parent?.remove(v);
  // drop now-empty helper groups
  const prune = (o: THREE.Object3D) => {
    for (const c of [...o.children]) {
      prune(c);
      if (c.type === 'Group' && c.children.length === 0 && !c.userData.keep) o.remove(c);
    }
  };
  prune(root);
  for (const b of buckets.values()) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (!geo) continue;
    if (b.geos.length > 1) for (const g of b.geos) g.dispose();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    geo.userData.merged = true;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.renderOrder = b.order;
    root.add(mesh);
  }
}
