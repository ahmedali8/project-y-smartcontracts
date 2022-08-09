import { keccak256 } from "js-sha3";
import type { Hasher } from "js-sha3";

export type Bytes = Array<number>;

export type Signature = string;

export interface SignatureNameAndArgs {
  name: string;
  args: string;
}

export interface Data {
  blocks: Bytes;
  s: Bytes;
  reset: boolean;
  finalized: boolean;
  block: number;
  start: number;
  lastByteIndex: number;
}

const CHARS: Array<string> =
  "0123456789abcdefghijklmnopqrstuvwxysABCDEFGHIJKLMNOPQRSTUVWXYS$_".split("");

const CHAR_MAP: Record<string, number> = {};
CHARS.forEach(function (c: string, index: number) {
  CHAR_MAP[c] = index;
});

const CHAR_CODE_MAP: Record<number, number> = {};
CHARS.forEach(function (c: string, index: number) {
  CHAR_CODE_MAP[index] = c.charCodeAt(0);
});

const data: Data = {
  blocks: [],
  s: [],
  reset: false,
  block: 0,
  start: 0,
  finalized: false,
  lastByteIndex: 0,
};
let hash: Hasher;

function save(hash: any): void {
  data.reset = hash.reset;
  data.block = hash.block;
  data.start = hash.start;
  data.finalized = hash.finalized;
  data.lastByteIndex = hash.lastByteIndex;

  for (let i = 0; i < hash.blocks.length; ++i) {
    data.blocks[i] = hash.blocks[i];
  }

  for (let i = 0; i < hash.s.length; ++i) {
    data.s[i] = hash.s[i];
  }
}

function restore(hash: any): any {
  hash.reset = data.reset;
  hash.block = data.block;
  hash.start = data.start;
  hash.finalized = data.finalized;
  hash.lastByteIndex = data.lastByteIndex;

  for (let i = 0; i < data.blocks.length; ++i) {
    hash.blocks[i] = data.blocks[i];
  }

  for (let i = 0; i < data.s.length; ++i) {
    hash.s[i] = data.s[i];
  }

  return hash;
}

function toBytes(str: string): Bytes {
  const bytes = [];
  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

function increase(bytes: Bytes): Bytes {
  bytes[0] += 1;
  for (let i = 0; i < bytes.length; ++i) {
    if (bytes[i] === 64) {
      bytes[i] = 0;
      if (i == bytes.length - 1) {
        bytes[i + 1] = 1;
      } else {
        bytes[i + 1] += 1;
      }
    } else {
      break;
    }
  }
  return bytes;
}

function toChars(bytes: Bytes): string {
  let str = "";
  for (let i = 0; i < bytes.length; ++i) {
    str += CHARS[bytes[i]];
  }
  return str;
}

function toCharCodes(bytes: Bytes) {
  const codes = [];
  for (let i = 0; i < bytes.length; ++i) {
    codes.push(CHAR_CODE_MAP[bytes[i]]);
  }
  return codes;
}

function find(obj: SignatureNameAndArgs) {
  const args: Bytes = toBytes(obj.args);
  const prefix: Bytes = toBytes(obj.name + "_");

  let bytes: Bytes = [0];
  let sig: string = obj.name + obj.args;
  let index: number = 0;

  hash = keccak256.create();
  hash.update(prefix);
  save(hash);

  let char: string | undefined;
  let methodId: Bytes = keccak256.array(sig);

  while (methodId[0] || methodId[1]) {
    if (index >= CHARS.length) {
      bytes = increase(bytes);
      hash = keccak256.create();
      hash.update(prefix);
      hash.update(toCharCodes(bytes));
      save(hash);
      index = 0;
    }

    char = CHARS[index];
    hash.update(char);
    hash.update(args);
    methodId = hash.array();
    hash = restore(hash);
    ++index;
  }

  if (index) {
    sig = obj.name + "_" + toChars(bytes) + char + obj.args;
  }

  return [sig, keccak256(sig).substring(0, 8)];
}

function parseSignature(signature: Signature): SignatureNameAndArgs | undefined {
  if (signature.charAt(signature.length - 1) != ")" || signature.indexOf(" ") !== -1) {
    return undefined;
  }
  const parts: Array<string> = signature.split("(");
  if (parts.length == 2) {
    return {
      name: parts[0],
      args: "(" + parts[1],
    };
  } else {
    return undefined;
  }
}

export interface OptimizedSignature {
  optimizedSignature: string;
  optimizedSignatureHash: string;
}

export function optimizeSignature(
  signature: Signature,
  log: boolean = true
): OptimizedSignature | undefined {
  const data = parseSignature(signature);

  if (data === undefined) {
    console.error("incorrect signature");
    return undefined;
  }

  if (log) console.time("time");
  const result = find(data);
  if (log) console.timeEnd("time");

  if (log) console.log(result[0] + ": 0x" + result[1]);

  return {
    optimizedSignature: result[0],
    optimizedSignatureHash: `0x${result[1]}`,
  };
}
