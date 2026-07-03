const BASE = 'http://localhost:8080';
const id = '69de8dc3c179bd6c29ec7ff0';

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.lessons,
    payload?.data,
    payload?.course?.lessonsArray,
    payload?.lessonsArray
  ];
  const first = candidates.find((item) => Array.isArray(item));
  return first || [];
};

const run = async () => {
  const [lessonsRes, detailRes, adminLessonsRes] = await Promise.all([
    fetch(`${BASE}/api/courses/v2/${id}/lessons`),
    fetch(`${BASE}/api/courses/v2/${id}`),
    fetch(`${BASE}/api/courses/admin/${id}/lessons`)
  ]);

  console.log('STATUS', lessonsRes.status, detailRes.status, adminLessonsRes.status);

  const merged = new Map();

  if (lessonsRes.ok) {
    const payload = await lessonsRes.json();
    normalizeList(payload).forEach((lesson) => {
      const key = lesson?._id || lesson?.id;
      if (key) merged.set(String(key), lesson);
    });
  }

  if (detailRes.ok) {
    const payload = await detailRes.json();
    normalizeList(payload).forEach((lesson) => {
      const key = lesson?._id || lesson?.id;
      if (key) merged.set(String(key), lesson);
    });
  }

  if (adminLessonsRes.ok) {
    const payload = await adminLessonsRes.json();
    normalizeList(payload).forEach((lesson) => {
      const key = lesson?._id || lesson?.id;
      if (key) merged.set(String(key), lesson);
    });
  }

  const allLessons = Array.from(merged.values());
  console.log('MERGED_COUNT', allLessons.length);
  for (const l of allLessons) {
    console.log('-', l._id || l.id, '|', l.title, '| chapter=', l?.chapter?.name);
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
