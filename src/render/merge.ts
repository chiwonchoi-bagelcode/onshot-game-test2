import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapse all meshes under `root` that share a material into a single mesh
 * (baking their transforms). Cuts draw calls a lot on phones. Subtrees with
 * `userData.keep` (animated parts) are left alone.
 */
export function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; order: number; geos: THREE.BufferGeometry[] }>();
  const victims: THREE.Mesh[] = [];
  const m = new THREE.Matrix4();

  const visit = (o: THREE.Object3D) => {
    if (o !== root && o.userData.keep) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && mesh.visible) {
      const mat = mesh.material as THREE.Material & { map?: THREE.Texture | null };
      let g = mesh.geometry.clone();
      if (g.index) g = g.toNonIndexed();
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && !(name === 'uv' && mat.map)) g.deleteAttribute(name);
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      if (mat.map && !g.attributes.uv) { g.dispose(); for (const c of o.children) visit(c); return; }
      g.morphAttributes = {};
      m.multiplyMatrices(inv, mesh.matrixWorld);
      g.applyMatrix4(m);
      const key = `${mat.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.renderOrder}`;
      let b = buckets.get(key);
      if (!b) { b = { mat, cast: mesh.castShadow, recv: mesh.receiveShadow, order: mesh.renderOrder, geos: [] }; buckets.set(key, b); }
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
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.renderOrder = b.order;
    root.add(mesh);
  }
}
