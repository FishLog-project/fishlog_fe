// Run with: node scripts/check-zone-data.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '../assets/data/fishing-prohibited-zones.json');

/** check-map-state 가 지도 화면을 그릴 때 쓰는 모듈. 실제 좌표를 그대로 읽는다 */
function zoneModule() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const zones = data.zones;
  return {
    PROHIBITED_ZONE_COUNT: zones.length,
    allZones() {
      return zones;
    },
    toZonePolygons(list) {
      return list.map((zone) => ({
        id: zone.id,
        name: zone.name,
        rings: zone.rings.map((ring) => ring.map(([lat, lng]) => `${lat},${lng}`).join(' ')).join(';'),
      }));
    },
  };
}

module.exports = { zoneModule, DATA_PATH };

if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  assert.ok(Array.isArray(data.zones) && data.zones.length > 0, 'zones must not be empty');
  assert.match(data.source, /국립해양조사원/, 'keep the data source recorded');

  let points = 0;
  for (const zone of data.zones) {
    assert.ok(zone.id && zone.name, `zone needs id and name: ${JSON.stringify(zone).slice(0, 60)}`);
    const [south, west, north, east] = zone.bbox;
    assert.ok(south <= north && west <= east, `${zone.id}: bbox is inverted`);
    // 한반도 주변 해역을 벗어나면 좌표계 변환이 틀어진 것이다
    assert.ok(south >= 32 && north <= 44, `${zone.id}: latitude ${south}~${north} out of range`);
    assert.ok(west >= 123 && east <= 133, `${zone.id}: longitude ${west}~${east} out of range`);

    assert.ok(zone.rings.length > 0, `${zone.id}: needs at least one ring`);
    for (const ring of zone.rings) {
      assert.ok(ring.length >= 3, `${zone.id}: a ring with ${ring.length} points cannot form an area`);
      points += ring.length;
      for (const [lat, lng] of ring) {
        assert.ok(lat >= south && lat <= north, `${zone.id}: point escapes its own bbox`);
        assert.ok(lng >= west && lng <= east, `${zone.id}: point escapes its own bbox`);
      }
    }
  }

  // 단순화를 되돌리면 지도가 느려진다. 원본 22,941 개에서 충분히 줄었는지 지킨다
  assert.ok(points < 4000, `too many vertices to draw smoothly: ${points}`);

  const { toZonePolygons } = zoneModule();
  const encoded = toZonePolygons(data.zones);
  assert.equal(encoded.length, data.zones.length);
  for (const zone of encoded) {
    assert.ok(!zone.rings.includes(';;'), `${zone.id}: empty ring in encoded string`);
    for (const ring of zone.rings.split(';')) {
      for (const point of ring.split(' ')) {
        assert.match(point, /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, `${zone.id}: bad point "${point}"`);
      }
    }
  }

  console.log(`zone data checks passed: ${data.zones.length} zones, ${points} vertices, bounds and encoding`);
}
