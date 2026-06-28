declare module 'ais-stream-decoder' {
  import type { Transform } from 'node:stream';
  type AisDecoderCtor = new () => Transform;
  const AisDecoder: AisDecoderCtor;
  export default AisDecoder;
}
