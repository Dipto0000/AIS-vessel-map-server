// `ais-stream-decoder` is a CJS package whose `module.exports` is
// shaped `{ default: <class>, __esModule: true }`. Loading it via CJS
// `require` (through `createRequire`) bypasses the ESM/CJS interop
// edge cases in tsx and compiled `node dist/`, where the canonical
// `import AisDecoder from 'ais-stream-decoder'` ends up binding the
// wrapper object instead of the class. The ambient declaration at
// `src/types/ais-stream-decoder.d.ts` gives us the type, this shim
// gives us a clean ESM-shaped default export.

import { createRequire } from 'node:module';

type AisDecoderCtor = typeof import('ais-stream-decoder').default;

const nodeRequire = createRequire(import.meta.url);
const AisDecoder: AisDecoderCtor = nodeRequire('ais-stream-decoder').default;

export default AisDecoder;
