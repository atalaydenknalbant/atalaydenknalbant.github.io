import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "cheerio";
import { completedExperienceMonths } from "../scripts/experience-math.mjs";

const html = load(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
const periods = html("#experience .timeline article").toArray().map((article) => {
  const dates = html(article).find("time[datetime]");
  return { start: dates.eq(0).attr("datetime"), end: dates.eq(1).attr("datetime") };
});
const monthsAt = (date, roles = periods) =>
  completedExperienceMonths(roles, new Date(date));
const yearsAt = (date) => Math.floor(monthsAt(date) / 12);

test("all listed roles contribute 58 completed months on September 12, 2026", () => {
  assert.equal(periods.length, 7);
  assert.equal(html("#experienceYears").length, 1);
  assert.equal(monthsAt("2026-09-12T12:00:00Z"), 58);
  assert.equal(yearsAt("2026-09-12T12:00:00Z"), 4);
});

test("counter advances exactly at the 5 and 6 year milestones", () => {
  assert.equal(yearsAt("2026-10-31T23:59:59.999Z"), 4);
  assert.equal(yearsAt("2026-11-01T00:00:00Z"), 5);
  assert.equal(yearsAt("2027-10-31T23:59:59.999Z"), 5);
  assert.equal(yearsAt("2027-11-01T00:00:00Z"), 6);
  assert.equal(yearsAt("2030-11-01T00:00:00Z"), 9);
});

test("overlapping, duplicated and nested roles count only once", () => {
  const roles = [
    { start: "2022-06", end: "2023-06" },
    { start: "2022-02", end: "2022-07" },
    { start: "2022-03", end: "2022-04" },
    { start: "2022-06", end: "2023-06" },
  ];
  assert.equal(monthsAt("2026-09-12", roles), 17);
  assert.equal(monthsAt("2026-09-12", roles.toReversed()), 17);
});

test("gaps do not count and finished end months are included", () => {
  assert.equal(monthsAt("2026-09-12", [
    { start: "2020-01", end: "2020-01" },
    { start: "2020-03", end: "2020-04" },
  ]), 3);
});

test("current partial months and future roles do not count", () => {
  const roles = [
    { start: "2026-08" },
    { start: "2026-09", end: "2028-01" },
    { start: "2027-01" },
  ];
  assert.equal(monthsAt("2026-09-30T23:59:59.999Z", roles), 1);
  assert.equal(monthsAt("2026-10-01T00:00:00Z", roles), 2);
  assert.equal(monthsAt("2018-01-01"), 0);
  assert.equal(monthsAt("2026-09-12", []), 0);
});

test("closing the ongoing role stops future growth", () => {
  const ended = periods.map((role) => ({ ...role, end: role.end ?? "2026-09" }));
  assert.equal(monthsAt("2026-10-01", ended), 59);
  assert.equal(monthsAt("2030-10-01", ended), 59);
});

test("leap years and time zone offsets keep the UTC month boundary consistent", () => {
  const roles = [{ start: "2024-02" }];
  assert.equal(monthsAt("2024-02-29T23:59:59Z", roles), 0);
  assert.equal(monthsAt("2024-03-01T00:00:00Z", roles), 1);
  assert.equal(monthsAt("2025-02-01T00:00:00Z", roles), 12);
  assert.equal(yearsAt("2026-11-01T02:59:59+03:00"), 4);
  assert.equal(yearsAt("2026-11-01T03:00:00+03:00"), 5);
});

test("invalid dates fail instead of silently inflating the counter", () => {
  for (const start of [undefined, "Jul 2024", "2024-00", "2024-13"])
    assert.throws(() => monthsAt("2026-09-12", [{ start }]), /Invalid experience month/);
  assert.throws(() => monthsAt("2026-09-12", [{ start: "2024-07", end: "2024-06" }]), /ends before/);
  assert.throws(() => monthsAt("invalid"), /Invalid current date/);
});
