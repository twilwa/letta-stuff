// Quick debug script to test SSRC flow

const map = new Map<number, string>();

// Simulate what the mock does
const userId = "user123";
const ssrc = 12345;

map.set(ssrc, userId);

console.log("Map after set:", map);
console.log("Map has entry:", map.has(ssrc));
console.log("Map get:", map.get(ssrc));

// Simulate what the handler does
let foundSsrc = 0;
for (const [receiverSsrc, mappedUserId] of map.entries()) {
  console.log(`Checking: ${receiverSsrc} -> ${mappedUserId}`);
  if (mappedUserId === userId) {
    foundSsrc = receiverSsrc;
    break;
  }
}

console.log("Found SSRC:", foundSsrc);
