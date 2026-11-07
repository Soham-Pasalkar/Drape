/**
 * Focused automated regression tests for PoseTracker frame scheduling (Milestone 0.5).
 * Validates continuous frame inference across RVFC (zero, increasing, undefined mediaTime)
 * and RAF fallback, monotonic timestamps, error resilience, session reset, and stop cancellation.
 */

const { suite, assert, finish, results } = require('./lib/harness.cjs');

// Provide DOM enums/stubs for Node.js test environment
if (!global.HTMLMediaElement) {
  global.HTMLMediaElement = {
    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4,
  };
}

let rafQueue = [];
let nextRafId = 1;
global.requestAnimationFrame = (cb) => {
  const id = nextRafId++;
  rafQueue.push({ id, cb });
  return id;
};
global.cancelAnimationFrame = (id) => {
  rafQueue = rafQueue.filter((item) => item.id !== id);
};

const { PoseTracker } = require('../dist_test/pose-tracker.js');

let currentSuiteName = '';
function setSuite(name) {
  currentSuiteName = name;
  suite(name);
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.failed++;
    results.failures.push(`${currentSuiteName} › ${name}: ${e.message}`);
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

function createValidLandmarks() {
  const lms = [];
  for (let i = 0; i < 33; i++) {
    lms.push({
      x: 0.5 + (i % 2 === 0 ? 0.05 : -0.05),
      y: 0.2 + i * 0.02,
      z: -0.1,
      visibility: 0.95,
      presence: 0.95,
    });
  }
  return lms;
}

function createMockLandmarker(options = {}) {
  const calls = [];
  let shouldThrow = options.throwOnCall ?? null;
  let throwError = options.throwError ?? new Error('Simulated Landmarker Error');

  return {
    calls,
    setThrowOnCall(n) { shouldThrow = n; },
    detectForVideo(video, timestamp) {
      calls.push({ video, timestamp });
      if (shouldThrow !== null && calls.length === shouldThrow) {
        throw throwError;
      }
      if (options.empty) {
        return { landmarks: [], worldLandmarks: [] };
      }
      return {
        landmarks: [createValidLandmarks()],
        worldLandmarks: [createValidLandmarks()],
      };
    },
    close() {},
  };
}

function createMockVideo(hasRvfc = true) {
  let rvfcQueue = [];
  let nextRvfcId = 1;

  const video = {
    readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    paused: false,
    ended: false,
    videoWidth: 1280,
    videoHeight: 720,
    currentTime: 0,
  };

  if (hasRvfc) {
    video.requestVideoFrameCallback = (cb) => {
      const id = nextRvfcId++;
      rvfcQueue.push({ id, cb });
      return id;
    };
    video.cancelVideoFrameCallback = (id) => {
      rvfcQueue = rvfcQueue.filter((item) => item.id !== id);
    };
    video.triggerRvfc = (mediaTime, now = performance.now()) => {
      const pending = [...rvfcQueue];
      rvfcQueue = [];
      for (const item of pending) {
        item.cb(now, mediaTime !== undefined ? { mediaTime } : undefined);
      }
    };
    video.getPendingRvfcCount = () => rvfcQueue.length;
  } else {
    video.triggerRaf = (now = performance.now()) => {
      const pending = [...rafQueue];
      rafQueue = [];
      for (const item of pending) {
        item.cb(now);
      }
    };
    video.getPendingRafCount = () => rafQueue.length;
  }

  return video;
}

(async () => {
  setSuite('PoseTracker Scheduling Recovery (Milestone 0.5)');

  await testAsync('1. Continuous frame processing when RVFC delivers identical mediaTime (mediaTime = 0)', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);
    let poseCallbacks = 0;

    await tracker.startTracking(video, {
      onKeypoints: (pts) => {
        if (pts) poseCallbacks++;
      },
    });

    assert(video.getPendingRvfcCount() === 1, 'Initial frame should be scheduled via RVFC');

    // Simulate 10 consecutive camera frames where mediaTime stays 0 (e.g. Safari live stream)
    for (let frame = 0; frame < 10; frame++) {
      video.triggerRvfc(0);
    }

    assert(tracker.stats.callbackCount === 10, `Expected 10 callbacks, got ${tracker.stats.callbackCount}`);
    assert(tracker.stats.inferenceCount === 10, `Expected 10 inferences, got ${tracker.stats.inferenceCount}`);
    assert(tracker.stats.detectionCount === 10, `Expected 10 detections, got ${tracker.stats.detectionCount}`);
    assert(poseCallbacks === 10, `Expected 10 pose callbacks, got ${poseCallbacks}`);
    assert(tracker.stats.lastMediaTime === 0, `Expected lastMediaTime 0, got ${tracker.stats.lastMediaTime}`);
    assert(landmarker.calls.length === 10, `Expected 10 detectForVideo calls, got ${landmarker.calls.length}`);

    tracker.stopTracking();
  });

  await testAsync('2. Continuous frame processing when RVFC delivers increasing mediaTime values', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);
    let poseCallbacks = 0;

    await tracker.startTracking(video, {
      onKeypoints: (pts) => {
        if (pts) poseCallbacks++;
      },
    });

    for (let frame = 0; frame < 10; frame++) {
      const mediaTime = frame * 0.0333;
      video.triggerRvfc(mediaTime);
    }

    assert(tracker.stats.callbackCount === 10, `Expected 10 callbacks, got ${tracker.stats.callbackCount}`);
    assert(tracker.stats.inferenceCount === 10, `Expected 10 inferences, got ${tracker.stats.inferenceCount}`);
    assert(tracker.stats.detectionCount === 10, `Expected 10 detections, got ${tracker.stats.detectionCount}`);
    assert(poseCallbacks === 10, `Expected 10 pose callbacks, got ${poseCallbacks}`);
    assert(Math.abs(tracker.stats.lastMediaTime - (9 * 0.0333)) < 1e-6, 'lastMediaTime should record latest');

    tracker.stopTracking();
  });

  await testAsync('3. Continuous frame processing when RVFC metadata is undefined', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);
    let poseCallbacks = 0;

    await tracker.startTracking(video, {
      onKeypoints: (pts) => {
        if (pts) poseCallbacks++;
      },
    });

    for (let frame = 0; frame < 8; frame++) {
      video.triggerRvfc(undefined);
    }

    assert(tracker.stats.callbackCount === 8, `Expected 8 callbacks, got ${tracker.stats.callbackCount}`);
    assert(tracker.stats.inferenceCount === 8, `Expected 8 inferences, got ${tracker.stats.inferenceCount}`);
    assert(tracker.stats.detectionCount === 8, `Expected 8 detections, got ${tracker.stats.detectionCount}`);
    assert(poseCallbacks === 8, `Expected 8 pose callbacks, got ${poseCallbacks}`);
    assert(tracker.stats.lastMediaTime === null, 'lastMediaTime should remain null when undefined');

    tracker.stopTracking();
  });

  await testAsync('4. Monotonically increasing now timestamps passed to detectForVideo', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const originalPerfNow = performance.now;
    let mockNow = 1000;
    performance.now = () => mockNow;

    try {
      const video = createMockVideo(true);
      await tracker.startTracking(video, {});

      // Feed timestamps: [1000, 1000 (duplicate), 999 (jitter backwards), 1010 (advances), 1010 (duplicate), 1020]
      const sequence = [1000, 1000, 999, 1010, 1010, 1020];
      for (const t of sequence) {
        mockNow = t;
        video.triggerRvfc(0);
      }

      assert(landmarker.calls.length === 3, `Expected 3 strictly increasing calls, got ${landmarker.calls.length}`);
      const timestamps = landmarker.calls.map(c => c.timestamp);
      assert(timestamps[0] === 1000 && timestamps[1] === 1010 && timestamps[2] === 1020, 'Timestamps must strictly increase');

      assert(tracker.stats.callbackCount === 6, 'All 6 presentations should be counted in callbacks');
      assert(tracker.stats.inferenceCount === 3, 'Only 3 strictly increasing timestamps should infer');

      tracker.stopTracking();
    } finally {
      performance.now = originalPerfNow;
    }
  });

  await testAsync('5. Scheduling continuation even when detectForVideo throws a temporary exception', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    // Throw on frame 2
    landmarker.setThrowOnCall(2);

    const video = createMockVideo(true);
    let errorsReported = 0;

    const origConsoleError = console.error;
    console.error = () => {}; // Suppress expected error log

    try {
      await tracker.startTracking(video, {
        onError: () => {
          errorsReported++;
        },
      });

      // Frame 1: succeeds
      video.triggerRvfc(0);
      assert(tracker.stats.inferenceCount === 1, 'Frame 1 inferred');

      // Frame 2: throws
      video.triggerRvfc(0);
      assert(errorsReported === 1, 'Error callback received');
      assert(tracker.isTracking, 'Tracking should remain active after error');
      assert(video.getPendingRvfcCount() === 1, 'Next frame must be scheduled despite error');

      // Frame 3: recovers and succeeds
      video.triggerRvfc(0);
      assert(tracker.stats.inferenceCount === 3, 'Frame 3 inferred (total 3 attempts)');
      assert(tracker.stats.detectionCount === 2, 'Frame 3 detected successfully (total 2 successful detections)');
      assert(tracker.stats.callbackCount === 3, '3 callbacks processed');

      tracker.stopTracking();
    } finally {
      console.error = origConsoleError;
    }
  });

  await testAsync('6. Execution stop when stopTracking() is called (cancelling active scheduling)', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);

    await tracker.startTracking(video, {});
    video.triggerRvfc(0);
    assert(video.getPendingRvfcCount() === 1, 'Frame 2 is pending');

    // Stop tracking
    tracker.stopTracking();
    assert(!tracker.isTracking, 'isTracking is false');
    assert(video.getPendingRvfcCount() === 0, 'Pending RVFC handle cancelled');

    // If a stale callback somehow arrives after stopTracking, it must be ignored
    const initialInferences = tracker.stats.inferenceCount;
    video.triggerRvfc(0);
    assert(tracker.stats.inferenceCount === initialInferences, 'No inference occurs after stopTracking');
    assert(video.getPendingRvfcCount() === 0, 'No new RVFC scheduled after stopTracking');
  });

  await testAsync('7. Clean diagnostic reset when starting a new session', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);

    // Session 1
    await tracker.startTracking(video, {});
    for (let i = 0; i < 5; i++) {
      video.triggerRvfc(i * 0.033);
    }
    assert(tracker.stats.callbackCount === 5, 'Session 1: 5 callbacks');
    assert(tracker.stats.inferenceCount === 5, 'Session 1: 5 inferences');
    assert(tracker.stats.detectionCount === 5, 'Session 1: 5 detections');

    // Stop session 1: stats are reset
    tracker.stopTracking();
    assert(tracker.stats.callbackCount === 0, 'Reset: callbackCount 0');
    assert(tracker.stats.inferenceCount === 0, 'Reset: inferenceCount 0');
    assert(tracker.stats.detectionCount === 0, 'Reset: detectionCount 0');
    assert(tracker.stats.emptyCount === 0, 'Reset: emptyCount 0');
    assert(tracker.stats.lastMediaTime === null, 'Reset: lastMediaTime null');

    // Session 2
    await tracker.startTracking(video, {});
    assert(tracker.stats.callbackCount === 0, 'New session starts at 0');
    for (let i = 0; i < 3; i++) {
      video.triggerRvfc(i * 0.033);
    }
    assert(tracker.stats.callbackCount === 3, 'Session 2: 3 callbacks');
    assert(tracker.stats.inferenceCount === 3, 'Session 2: 3 inferences');
    assert(tracker.stats.detectionCount === 3, 'Session 2: 3 detections');

    tracker.stopTracking();
  });

  await testAsync('8. RAF fallback when requestVideoFrameCallback is undefined', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker();
    tracker.landmarker = landmarker;

    // Video WITHOUT requestVideoFrameCallback
    const video = createMockVideo(false);
    let poseCallbacks = 0;

    await tracker.startTracking(video, {
      onKeypoints: (pts) => {
        if (pts) poseCallbacks++;
      },
    });

    assert(video.getPendingRafCount() === 1, 'Initial frame scheduled via RAF');

    for (let frame = 0; frame < 5; frame++) {
      video.triggerRaf();
    }

    assert(tracker.stats.callbackCount === 5, `Expected 5 RAF callbacks, got ${tracker.stats.callbackCount}`);
    assert(tracker.stats.inferenceCount === 5, `Expected 5 RAF inferences, got ${tracker.stats.inferenceCount}`);
    assert(tracker.stats.detectionCount === 5, `Expected 5 RAF detections, got ${tracker.stats.detectionCount}`);
    assert(poseCallbacks === 5, `Expected 5 pose callbacks, got ${poseCallbacks}`);
    assert(tracker.stats.lastMediaTime === null, 'RAF delivers no mediaTime');

    tracker.stopTracking();
    assert(video.getPendingRafCount() === 0, 'cancelAnimationFrame called on stop');
  });

  await testAsync('9. Empty detections increment emptyCount and transition status to body_lost', async () => {
    const tracker = new PoseTracker();
    const landmarker = createMockLandmarker({ empty: true });
    tracker.landmarker = landmarker;

    const video = createMockVideo(true);
    const statuses = [];

    await tracker.startTracking(video, {
      onStatusChange: (status) => {
        statuses.push(status);
      },
    });

    video.triggerRvfc(0);

    assert(tracker.stats.callbackCount === 1, '1 callback');
    assert(tracker.stats.inferenceCount === 1, '1 inference attempted');
    assert(tracker.stats.detectionCount === 0, '0 detections');
    assert(tracker.stats.emptyCount === 1, '1 empty count');
    assert(tracker.status === 'body_lost', 'Status transitioned to body_lost');
    assert(statuses.includes('body_lost'), 'Status callback received body_lost');

    tracker.stopTracking();
  });

  finish('test-ar-pose-tracker');
})();
