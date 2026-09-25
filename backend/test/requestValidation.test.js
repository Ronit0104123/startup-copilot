import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IDEA_LENGTH, validateIdea } from "../src/lib/requestValidation.js";

test("accepts a useful idea and trims surrounding whitespace", () => {
  assert.deepEqual(validateIdea("  A scheduling tool for independent tutors  "), {
    valid: true,
    idea: "A scheduling tool for independent tutors",
  });
});

test("rejects a missing idea", () => {
  assert.equal(validateIdea(undefined).valid, false);
});

test("rejects an object instead of an idea string", () => {
  assert.equal(validateIdea({ idea: "A marketplace" }).valid, false);
});

test("rejects a description that is too short to research", () => {
  assert.equal(validateIdea("good app").valid, false);
});

test("rejects an accidental long paste", () => {
  assert.equal(validateIdea("a".repeat(MAX_IDEA_LENGTH + 1)).valid, false);
});
