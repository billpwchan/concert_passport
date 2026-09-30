'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 origin = vec2(0.5 + uPointer.x * 0.045, -0.18 + uPointer.y * 0.02);
    vec2 ray = uv - origin;
    float angle = atan(ray.y, ray.x);
    float distanceToOrigin = length(ray);

    float narrow = pow(max(0.0, sin(angle * 10.0 + uTime * 0.14)), 24.0);
    float wide = pow(max(0.0, sin(angle * 5.0 - uTime * 0.09)), 10.0);
    float horizon = smoothstep(1.15, 0.18, distanceToOrigin) * smoothstep(-0.02, 0.42, uv.y);
    float sideBloom = exp(-18.0 * length(uv - vec2(0.82 + uPointer.x * 0.02, 0.54)));
    float centerBloom = exp(-9.0 * length(uv - vec2(0.47, 0.42)));

    vec3 cyan = vec3(0.23, 0.95, 1.0);
    vec3 coral = vec3(1.0, 0.12, 0.34);
    vec3 violet = vec3(0.35, 0.18, 1.0);
    vec3 color = cyan * narrow * horizon * 0.75;
    color += coral * wide * horizon * 0.48;
    color += violet * sideBloom * 0.55;
    color += mix(cyan, coral, uv.x) * centerBloom * 0.18;

    float scan = sin((uv.y + uTime * 0.012) * 760.0) * 0.018;
    float grain = (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.075;
    color += scan + grain;

    float alpha = clamp((narrow * 0.42 + wide * 0.22) * horizon + sideBloom * 0.32 + centerBloom * 0.15, 0.0, 0.76);
    gl_FragColor = vec4(max(color, 0.0), alpha);
  }
`;

function LightField() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  useFrame((state) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = state.clock.elapsedTime;
    material.current.uniforms.uPointer.value.lerp(state.pointer, 0.035);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
export function StageField({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;

  return (
    <Canvas
      aria-hidden="true"
      className="stage-field"
      dpr={[1, 1.5]}
      flat
      frameloop="always"
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
    >
      <LightField />
    </Canvas>
  );
}
