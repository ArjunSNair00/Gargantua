import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uMass;
uniform float uSpin;
uniform vec2 uResolution;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vWorldPosition;

const float G = 1.0;

// 2D Hash
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 3D Noise for Disk texture
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    vec2 uv = (i.xy + vec2(37.0, 17.0) * i.z) + f.xy;
    vec2 rg = fract(sin((floor(uv) + vec2(0.0,0.0)) * 0.0034) * 43758.5453);
    return mix(rg.x, rg.y, f.z);
}

// 3D FBM for the accretion disk noise
float fbm(vec3 p) {
    float f = 0.0;
    float w = 0.5;
    for(int i = 0; i < 5; i++) {
        f += w * noise(p);
        p *= 2.02;
        w *= 0.5;
    }
    return f;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = -1.0 + 2.0 * uv;
  p.x *= uResolution.x / uResolution.y;

  vec3 ro = uCameraPos;
  vec3 rd = normalize(vWorldPosition - ro);

  // Keep march escape radius relative to observer distance so far FPS travel
  // does not instantly terminate tracing.
  float maxTraceRadius = max(120.0, length(ro) + 80.0);

  float dt = 0.02;
  vec3 pos = ro;
  vec3 col = vec3(0.0);
  
  float Rs = 2.0 * G * uMass; // Schwarzschild radius (C=1)
  float R_in = Rs * 2.5;      // Inner disk edge (further out in Gargantua)
  float R_out = Rs * 9.0;     // Outer disk edge

  float acc = 0.0;
  float isBlackHole = 0.0;

  for(int i = 0; i < 300; i++) {
      float r = length(pos);
      
      // Hit the Event Horizon
      if(r < Rs) {
          isBlackHole = 1.0;
          break;
      }
      
      // Escaped gravitational field
      if(r > maxTraceRadius) break;

      // --- GRAVITATIONAL LENSING ---
      // Instead of simple Newtonian, we use a sharper inverse cube pull 
      // mimicking Einstein's general relativity bending slightly better for the photon ring
      vec3 gravity = -normalize(pos) * (1.5 * Rs * Rs) / (r * r * r);
      rd = normalize(rd + gravity * dt);

      // --- ACCRETION DISK ---
      // We sample the disk when the ray is close to the equatorial plane (y = 0)
      float distToPlane = abs(pos.y);
      
      // Disk gets thicker towards the outside
      float diskThickness = 0.04 + smoothstep(R_in, R_out, r) * 0.15; 
      
      if(distToPlane < diskThickness && r > R_in && r < R_out) {
          // Circular coordinates inside the disk
          float angle = atan(pos.z, pos.x);
          
          // Keplerian velocity: v proportional to 1/sqrt(r)
          float velocity = 2.0 / sqrt(r); 
          float timeOffset = uTime * velocity;
          
          vec3 polarPos = vec3(angle - timeOffset, 0.0, r);
          
          // Fluid noise structure
          float densityNoise = fbm(vec3(polarPos.x * 8.0, polarPos.y * 10.0, polarPos.z * 1.5));
          
          // Gradients to fade out edges smoothly
          float edgeFade = smoothstep(R_in, R_in + 0.5, r) * (1.0 - smoothstep(R_out - 2.0, R_out, r));
          float heightFade = 1.0 - (distToPlane / diskThickness);
          
          float density = densityNoise * edgeFade * heightFade;
          
          if(density > 0.01) {
              // --- RELATIVISTIC DOPPLER BEAMING ---
              // Fluid moves perpendicular to radius vector in XZ plane
              vec3 flowDir = normalize(vec3(-pos.z, 0.0, pos.x));
              
              // Weaker doppler multiplier so it doesn't zero out the receding side entirely
              float dopplerFactor = dot(rd, flowDir) * velocity; 
              
              // Base temperature color: Gargantua is bright orange/yellow fading to red
              vec3 baseColor = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.4, 0.1), clamp((r - R_in) / (R_out - R_in), 0.0, 1.0));
              
              // Keep some warmth even when moving away
              vec3 shiftColor = mix(vec3(0.8, 0.15, 0.0), vec3(0.7, 0.9, 1.0), clamp(dopplerFactor + 0.5, 0.0, 1.0));
              
              float brightness = density * 0.14;
              
              // Prevent the receding side from going completely black with a clamp floor
              float beaming = pow(clamp(1.0 + dopplerFactor * 0.8, 0.2, 2.4), 1.55);
              brightness *= beaming;
              
              col += baseColor * shiftColor * brightness;
              acc += density * 0.1;
          }
      }

      // Adaptive ray step-size: Move slower near gravity well and near disk plane, faster in empty space
      float safeDist = min(abs(r - Rs * 1.5), distToPlane);
      dt = clamp(safeDist * 0.2, 0.02, 1.0);
      
      pos += rd * dt;
  }

  // Interstellar filmic tone mapping
  col *= 1.05;
  col = col / (1.0 + col); // Reinhard tone mapping
  col = pow(col, vec3(1.0 / 2.2)); // Gamma correction

  gl_FragColor = vec4(col, clamp(acc, 0.0, 1.0) + (length(col) > 0.1 ? 1.0 : 0.0));
}
`;

export default function Blackhole({ mass = 1.0, spin = 0.0 }) {
  const meshRef = useRef();
  const materialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMass: { value: mass },
      uSpin: { value: spin },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      uCameraPos: { value: new THREE.Vector3(0, 3, 10) },
    }),
    [],
  );

  useFrame((state) => {
    if (meshRef.current) {
      // Keep the raymarch shell centered on the observer to avoid geometry clip
      // artifacts when traveling far from origin.
      meshRef.current.position.copy(state.camera.position);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uMass.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMass.value,
        mass,
        0.05,
      );
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);
      materialRef.current.uniforms.uResolution.value.set(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio,
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* We use a large sphere around the camera, or a screen-filling quad, mapped to handle backgrounds */}
      {/* For raymarching, effectively rendering inside a giant sphere */}
      <sphereGeometry args={[100, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={true}
      />
    </mesh>
  );
}
