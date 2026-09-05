const expected = [
  "IRON 1",
  "IRON 2",
  "IRON 3",
  "BRONZE 1",
  "BRONZE 2",
  "BRONZE 3",
  "SILVER 1",
  "SILVER 2",
  "SILVER 3",
  "GOLD 1",
  "GOLD 2",
  "GOLD 3",
  "PLATINUM 1",
  "PLATINUM 2",
  "PLATINUM 3",
  "DIAMOND 1",
  "DIAMOND 2",
  "DIAMOND 3",
  "ASCENDANT 1",
  "ASCENDANT 2",
  "ASCENDANT 3",
  "IMMORTAL 1",
  "IMMORTAL 2",
  "IMMORTAL 3",
  "RADIANT",
];

const keys =
  expected.map(
    (name) =>
      name
        .toLowerCase()
        .replace(
          /\s+/g,
          ""
        )
  );

if (
  new Set(
    keys
  ).size !==
    25
) {
  throw new Error(
    "Rank key fixture contains duplicates."
  );
}

if (
  keys[0] !==
    "iron1" ||
  keys[18] !==
    "ascendant1" ||
  keys[24] !==
    "radiant"
) {
  throw new Error(
    "Rank key fixture normalization is incorrect."
  );
}

console.log(
  "Cosmetics V2 Phase 4C rank self-test passed."
);
