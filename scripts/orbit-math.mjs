export const CAMERA_DISTANCE = 9;
export const CAMERA_FOV = 37.8;
export const ORBIT_PERIOD = 9;
export const PORTRAIT_RATIO = 0.4;
export const VIEW_HEIGHT =
  2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV * Math.PI) / 360);
export const SATELLITES = [
  // Camera-space circle fits to the reference's three projected ellipses.
  {
    name: "ai",
    phase: 5.027051,
    centerX: 0.151826,
    centerY: 0.135807,
    radius: 2.38369,
    inclination: -0.943227,
    yaw: 0,
    roll: 0.260471,
    size: 0.39,
  },
  {
    name: "cv",
    phase: 4.215811,
    centerX: 0.110785,
    centerY: 0.237739,
    radius: 2.563938,
    inclination: -0.95957,
    yaw: 0,
    roll: -0.554473,
    size: 0.28,
  },
  {
    name: "ml",
    phase: 3.192806,
    centerX: 0.157715,
    centerY: 0.419581,
    radius: 2.333737,
    inclination: -0.485102,
    yaw: 0,
    roll: -0.760874,
    size: 0.31,
  },
];

export function orbitPosition(spec, time, target = {}) {
  return orbitPoint(
    spec,
    spec.phase + (time * Math.PI * 2) / ORBIT_PERIOD,
    target,
  );
}

export function orbitPoint(spec, angle, target = {}) {
  const x = spec.radius * Math.cos(angle);
  const y = spec.radius * Math.sin(angle) * Math.cos(spec.inclination);
  const z = spec.radius * Math.sin(angle) * Math.sin(spec.inclination);
  const rotatedX = x * Math.cos(spec.yaw) + z * Math.sin(spec.yaw);
  target.x =
    rotatedX * Math.cos(spec.roll) - y * Math.sin(spec.roll) + spec.centerX;
  target.y =
    rotatedX * Math.sin(spec.roll) + y * Math.cos(spec.roll) + spec.centerY;
  target.z = -x * Math.sin(spec.yaw) + z * Math.cos(spec.yaw);
  return target;
}

export function projectedPosition(position) {
  const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - position.z);
  return {
    x: position.x * perspective,
    y: position.y * perspective,
    perspective,
  };
}
