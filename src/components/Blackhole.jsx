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

    float diskHalfThickness = 0.07;

  for(int i = 0; i < 300; i++) {
      float r = length(pos);
      
      // Hit the Event Horizon
      if(r < Rs) {
          break;
      }
      
      // Escaped gravitational field
      if(r > maxTraceRadius) break;

      // --- GRAVITATIONAL LENSING ---
      // Instead of simple Newtonian, we use a sharper inverse cube pull 
      // mimicking Einstein's general relativity bending slightly better for the photon ring
      vec3 gravity = -normalize(pos) * (1.5 * Rs * Rs) / (r * r * r);
      rd = normalize(rd + gravity * dt);

        // --- CLOSEST-HIT TESTING (HORIZON VS DISK SURFACE) ---
        float tHorizon = 1e20;
        {
          float b = dot(pos, rd);
          float c = dot(pos, pos) - Rs * Rs;
          float h = b * b - c;
          if(h >= 0.0) {
            float sqrtH = sqrt(h);
            float tNear = -b - sqrtH;
            float tFar = -b + sqrtH;
            if(tNear >= 0.0) {
              tHorizon = tNear;
            } else if(tFar >= 0.0) {
              tHorizon = tFar;
            }
          }
        }

        float tDisk = 1e20;
        vec3 diskHitPos = vec3(0.0);
        float diskEdgeFade = 0.0;
        float diskThicknessFade = 0.0;
        float diskFacing = 0.0;

        if(abs(rd.y) > 0.0001) {
          float tTop = (diskHalfThickness - pos.y) / rd.y;
          float tBottom = (-diskHalfThickness - pos.y) / rd.y;
          float tEnter = min(tTop, tBottom);
          float tExit = max(tTop, tBottom);

          float tSurface = tEnter;
          if(tSurface < 0.0) {
            tSurface = tExit;
          }

          if(tSurface >= 0.0) {
            vec3 candidateHit = pos + rd * tSurface;
            float hitR = length(candidateHit);
            if(hitR > R_in && hitR < R_out) {
              vec3 diskNormal = vec3(0.0, 1.0, 0.0);
              diskFacing = abs(dot(rd, diskNormal));

              float edgeIn = smoothstep(R_in, R_in + 0.6, hitR);
              float edgeOut = 1.0 - smoothstep(R_out - 2.0, R_out, hitR);
              diskEdgeFade = max(0.0, edgeIn * edgeOut);

              float insideTravel = max(0.0, tExit - max(tEnter, 0.0));
              float slabFade = smoothstep(0.0, diskHalfThickness * 2.5, insideTravel);
              diskThicknessFade = max(0.35, slabFade);

              tDisk = tSurface;
              diskHitPos = candidateHit;
            }
          }
        }

        float tClosest = min(tHorizon, tDisk);
        if(tClosest <= dt) {
          if(tHorizon <= tDisk) {
            // Horizon occludes everything behind it.
            col = vec3(0.0);
            break;
          }

          float angle = atan(diskHitPos.z, diskHitPos.x);
          float hitR = length(diskHitPos);
          float velocity = 2.0 / sqrt(max(hitR, 0.001));
          float timeOffset = uTime * velocity;

          vec3 polarPos = vec3(angle - timeOffset, 0.0, hitR);
          float densityNoise = fbm(vec3(polarPos.x * 8.0, polarPos.y * 10.0, polarPos.z * 1.5));
          float density = clamp(densityNoise * 0.75 + 0.25, 0.0, 1.0);

          vec3 flowDir = normalize(vec3(-diskHitPos.z, 0.0, diskHitPos.x));
          float dopplerFactor = dot(rd, flowDir) * velocity;

          vec3 baseColor = mix(
          vec3(1.0, 0.9, 0.6),
          vec3(1.0, 0.4, 0.1),
          clamp((hitR - R_in) / (R_out - R_in), 0.0, 1.0)
          );

          vec3 shiftColor = mix(
          vec3(0.8, 0.15, 0.0),
          vec3(0.7, 0.9, 1.0),
          clamp(dopplerFactor + 0.5, 0.0, 1.0)
          );

          float facingWeight = mix(0.65, 1.25, pow(clamp(diskFacing, 0.0, 1.0), 0.45));
          float baseEmission = 0.34 * diskEdgeFade;
          float texturedEmission = density * 0.88 * diskEdgeFade * diskThicknessFade;
          float brightness = (baseEmission + texturedEmission) * facingWeight;
          float beaming = pow(clamp(1.0 + dopplerFactor * 0.8, 0.2, 2.4), 1.55);
          brightness *= beaming;

          col = baseColor * shiftColor * brightness;
          break;
        }

      // Adaptive ray step-size: Move slower near gravity well and near disk plane, faster in empty space
        float distToTopFace = abs(pos.y - diskHalfThickness);
        float safeDist = min(abs(r - Rs * 1.5), distToTopFace);
      dt = clamp(safeDist * 0.2, 0.02, 1.0);
      
      pos += rd * dt;
  }

  // Interstellar filmic tone mapping
  col *= 1.05;
  col = col / (1.0 + col); // Reinhard tone mapping
  col = pow(col, vec3(1.0 / 2.2)); // Gamma correction

  gl_FragColor = vec4(col, 1.0);
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
        transparent={false}
      />
    </mesh>
  );
}
