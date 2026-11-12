# v10a self-hosted face runtime

- @mediapipe/tasks-vision 0.10.21 from the npm package, pinned (package.json retained).
- Current npm latest compared on 2026-11-11 Asia/Taipei: 1.2.2.
- 0.10.21 SIMD wasm: 9,574,032 bytes; non-SIMD fallback: 9,448,638 bytes.
- 1.2.2 SIMD wasm: 14,603,354 bytes (module variant: 14,603,372 bytes).
- Picked 0.10.21: the tested IMAGE/CPU/numFaces=5/blendshape API works, with
  5,029,322 fewer bytes per SIMD wasm download (~34.4% smaller).
- face_landmarker.task is copied from the local QA fixture tools/model.
- Original package: https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.21
- Docs: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MediaPipe source/runtime is Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

No runtime CDN calls. sw.v10a.js precaches the v10a HTML and all runtime assets,
including the non-SIMD fallback. Offline works after one successful online install,
on localhost or HTTPS; user images are never in the service-worker cache.
The service worker only intercepts these v10 URLs, never other index versions.
A future changed build must bump the service-worker cache name. No deployment done.
