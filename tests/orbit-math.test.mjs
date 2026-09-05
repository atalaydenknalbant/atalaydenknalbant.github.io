import test from "node:test";
import assert from "node:assert/strict";
import {
  SATELLITES,
  VIEW_HEIGHT,
  ORBIT_PERIOD,
  orbitPoint,
  orbitPosition,
  projectedPosition,
} from "../scripts/orbit-math.mjs";

test("satellites remain framed and separated over 1 hour", () => {
  for (const width of [288, 320, 340, 420, 500]) {
    for (let time = 0; time < 3600; time += 0.25) {
      const positions = SATELLITES.map((spec) => {
        const projected = projectedPosition(orbitPosition(spec, time));
        const radius =
          spec.size * Math.max(1, 288 / width) * projected.perspective;
        assert.ok(
          Math.abs(projected.x) + radius < VIEW_HEIGHT / 2,
          "Horizontal canvas bounds",
        );
        assert.ok(
          Math.abs(projected.y) + radius < VIEW_HEIGHT / 2,
          "Vertical canvas bounds",
        );
        return { ...projected, radius };
      });
      positions.forEach((a, i) =>
        positions.slice(i + 1).forEach((b) => {
          assert.ok(
            Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2,
            "Satellites remain separated",
          );
        }),
      );
    }
  }
});

test("offset circular tracks traverse the front and rear depth planes", () => {
  for (const spec of SATELLITES) {
    let hidden = false,
      front = false;
    for (let t = 0; t < ORBIT_PERIOD; t += 0.01) {
      const point = orbitPosition(spec, t);
      if (point.z + spec.size < 0) hidden = true;
      if (point.z > spec.size) front = true;
      const track = orbitPoint(spec, t);
      assert.ok(
        Math.abs(
          Math.hypot(track.x - spec.centerX, track.y - spec.centerY, track.z) -
            spec.radius,
        ) < 1e-10,
      );
    }
    assert.ok(
      hidden && front,
      `${spec.name} traverses both sides of the portrait`,
    );
    const a = orbitPosition(spec, 0),
      b = orbitPosition(spec, ORBIT_PERIOD);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-10);
  }
});

test("initial satellite positions follow the supplied reference", () => {
  const centers = { ai: [945, 882], cv: [205, 685], ml: [303, 232] };
  for (const spec of SATELLITES) {
    const p = projectedPosition(orbitPosition(spec, 0));
    const x = (0.5 + p.x / VIEW_HEIGHT) * 1254;
    const y = (0.5 - p.y / VIEW_HEIGHT) * 1254;
    assert.ok(
      Math.hypot(x - centers[spec.name][0], y - centers[spec.name][1]) < 32,
      `${spec.name} aligns with its reference position`,
    );
  }
});

test("positions and trail samples have no jump at revolution boundaries", () => {
  for (const spec of SATELLITES) {
    for (const time of [0, 9, 18, 90, 3600]) {
      const a = orbitPosition(spec, time - 0.0001);
      const b = orbitPosition(spec, time + 0.0001);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.001);
      assert.ok(
        Object.values(orbitPosition(spec, time - 4.8)).every(Number.isFinite),
      );
    }
  }
});

test("orbits move without pointer input and are deterministic at the same time", () => {
  for (const spec of SATELLITES) {
    assert.deepEqual(orbitPosition(spec, 12.5), orbitPosition(spec, 12.5));
    assert.notDeepEqual(orbitPosition(spec, 0), orbitPosition(spec, 1));
  }
});
