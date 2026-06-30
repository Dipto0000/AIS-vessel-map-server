declare module 'ais-stream-decoder' {
  import type { Transform } from 'node:stream';
  type AisDecoderCtor = new (options?: { silent?: boolean }) => Transform;
  const AisDecoder: AisDecoderCtor;
  export default AisDecoder;
}
