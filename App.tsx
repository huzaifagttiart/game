
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function App() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ab6d6);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.set(0, 6, 15);
    camera.lookAt(0, 0, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.current.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x526644, 2));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x587747 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    scene.add(ground);

    function makeHelicopter(color: number, z: number) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 16),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.8,
          roughness: 0.25
        })
      );
      body.scale.set(1, 0.7, 1.6);
      group.add(body);

      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 20, 16),
        new THREE.MeshStandardMaterial({
          color: 0x73c9ed,
          metalness: 0.7,
          roughness: 0.15
        })
      );
      cockpit.position.z = -0.8;
      group.add(cockpit);

      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 3),
        new THREE.MeshStandardMaterial({ color })
      );
      tail.position.z = 2.3;
      group.add(tail);

      const rotor = new THREE.Group();
      rotor.position.y = 0.8;
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.05, 4),
          new THREE.MeshStandardMaterial({ color: 0x202020 })
        );
        blade.rotation.y = i * Math.PI / 2;
        rotor.add(blade);
      }
      group.add(rotor);
      group.userData.rotor = rotor;
      group.position.set(0, 1, z);
      scene.add(group);
      return group;
    }

    const player = makeHelicopter(0x172d39, 3);
    const enemy = makeHelicopter(0x8b3028, -18);
    const bullets: THREE.Mesh[] = [];
    const keys: Record<string, boolean> = {};
    let score = 0;
    let health = 100;
    let lastShot = 0;
    let running = true;

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const fire = () => {
      const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe44d })
      );
      bullet.position.copy(player.position);
      scene.add(bullet);
      bullets.push(bullet);
    };

    const onClick = () => fire();
    renderer.domElement.addEventListener('click', onClick);

    const hud = document.createElement('div');
    hud.style.cssText =
      'position:fixed;top:15px;left:15px;color:white;background:#101923dd;padding:15px;border-radius:8px;font:16px Arial;line-height:1.8';
    hud.innerHTML =
      '🚁 HELICOPTER BATTLE<br>Score: 0<br>Enemy health: 100%<br>WASD / Arrows: Fly · Space: Fire';
    document.body.appendChild(hud);

    let frame = 0;
    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);
      frame++;

      player.userData.rotor.rotation.y += 0.7;
      enemy.userData.rotor.rotation.y += 0.7;
      enemy.position.x = Math.sin(frame * 0.015) * 5;

      if (keys.ArrowLeft || keys.KeyA) player.position.x -= 0.12;
      if (keys.ArrowRight || keys.KeyD) player.position.x += 0.12;
      if (keys.ArrowUp || keys.KeyW) player.position.y += 0.1;
      if (keys.ArrowDown || keys.KeyS) player.position.y -= 0.1;

      player.position.x = THREE.MathUtils.clamp(player.position.x, -9, 9);
      player.position.y = THREE.MathUtils.clamp(player.position.y, -1, 8);

      if (keys.Space && frame - lastShot > 12) {
        fire();
        lastShot = frame;
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.z -= 0.6;
        if (bullet.position.distanceTo(enemy.position) < 1.8) {
          scene.remove(bullet);
          bullets.splice(i, 1);
          health -= 20;
          if (health <= 0) {
            score += 100;
            health = 100;
          }
          hud.innerHTML =
            `🚁 HELICOPTER BATTLE<br>Score: ${score}<br>Enemy health: ${health}%<br>WASD / Arrows: Fly · Space: Fire`;
        } else if (bullet.position.z < -30) {
          scene.remove(bullet);
          bullets.splice(i, 1);
        }
      }

      camera.position.x += (player.position.x - camera.position.x) * 0.03;
      camera.lookAt(player.position.x, player.position.y, -8);
      renderer.render(scene, camera);
    }
    animate();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      running = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('click', onClick);
      hud.remove();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={container} style={{ width: '100%', height: '100vh' }} />;
}
