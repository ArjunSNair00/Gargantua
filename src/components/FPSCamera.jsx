import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FPSCamera({ active, mass = 1.5 }) {
  const { camera, gl } = useThree();

  const state = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rollMode: false,
  });

  const velocity = useRef(new THREE.Vector3(0, 0, 0));

  const lookSpeed = 0.002;
  const thrustSpeed = 0.0015; // Extremely small acceleration to make the player feel tiny

  const direction = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const upVec = new THREE.Vector3();

  useEffect(() => {
    if (!active) {
      document.exitPointerLock?.();
      return;
    }

    const requestCapture = () => {
      gl.domElement.setAttribute("tabindex", "0");
      gl.domElement.focus();
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock?.();
      }
    };

    requestCapture();

    const onKeyDown = (e) => {
      const code = e.code.toLowerCase();
      if (code === "keyw") state.current.forward = true;
      if (code === "keys") state.current.backward = true;
      if (code === "keya") state.current.left = true;
      if (code === "keyd") state.current.right = true;
      if (code === "keyl") state.current.left = true;
      if (code === "keyr") {
        state.current.rollMode = true;
      }

      if (e.key === "Shift") state.current.up = true;
      if (e.key === "Control") state.current.down = true;
    };

    const onKeyUp = (e) => {
      const code = e.code.toLowerCase();
      if (code === "keyw") state.current.forward = false;
      if (code === "keys") state.current.backward = false;
      if (code === "keya" || code === "keyl") state.current.left = false;
      if (code === "keyd") state.current.right = false;
      if (code === "keyr") state.current.rollMode = false;

      if (e.key === "Shift") state.current.up = false;
      if (e.key === "Control") state.current.down = false;
    };

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== gl.domElement) return;

      if (state.current.rollMode) {
        camera.rotateZ(-e.movementX * lookSpeed * 1.5);
      } else {
        camera.rotateX(-e.movementY * lookSpeed);
        camera.rotateY(-e.movementX * lookSpeed);
      }
    };

    const onMouseDown = () => {
      if (active) {
        requestCapture();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    gl.domElement.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      gl.domElement.removeEventListener("mousedown", onMouseDown);
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    };
  }, [active, camera, gl.domElement]);

  useFrame((_, delta) => {
    if (!active) {
      // If inactive, naturally bleed off momentum so you don't fly away infinitely while paused
      velocity.current.multiplyScalar(0.95);
      return;
    }

    let moveZ = Number(state.current.forward) - Number(state.current.backward);
    let moveX = Number(state.current.right) - Number(state.current.left);
    let moveY = Number(state.current.up) - Number(state.current.down);

    camera.getWorldDirection(direction);
    rightVec.copy(direction).cross(camera.up).normalize();
    upVec.copy(rightVec).cross(direction).normalize();

    // Apply thrust to velocity vector (momentum)
    if (moveZ !== 0)
      velocity.current.addScaledVector(direction, moveZ * thrustSpeed);
    if (moveX !== 0)
      velocity.current.addScaledVector(rightVec, moveX * thrustSpeed);
    if (moveY !== 0)
      velocity.current.addScaledVector(upVec, moveY * thrustSpeed);

    // --- GRAVITY ---
    // Calculate distance squared to the black hole at origin (0,0,0)
    const distSq = Math.max(0.1, camera.position.lengthSq());

    // G-Constant multiplier to make the pull noticeable
    // F = G * (M1 * M2) / r^2 (simplified since camera mass is negligible)
    const G_FORCE = 8.0;
    const gravityAccel = (G_FORCE * mass) / distSq;

    // Direction points from camera towards origin
    const gravityDir = camera.position.clone().negate().normalize();
    velocity.current.addScaledVector(gravityDir, gravityAccel * delta);

    // Slight inertial dampening simulating suit thruster stabilization
    velocity.current.multiplyScalar(0.985);

    // Apply strictly resulting velocity to position
    camera.position.add(velocity.current);

    camera.up
      .copy(upVec)
      .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(direction, 0));
    camera.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  });

  return null;
}
