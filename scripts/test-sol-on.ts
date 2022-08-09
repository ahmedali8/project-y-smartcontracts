import { keccak256 } from "js-sha3";

import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { OptimizedSignature, optimizeSignature } from "./sol-optimize-name";

export interface SignatureCollection extends OptimizedSignature {
  signature: string;
  signatureHash: string;
}

async function main() {
  const { projecty } = await deployProjectyFixture();

  const { signatureCollection } = createOptimizedSignatureCollection(
    Object.keys(projecty.interface.functions)
  );
  console.log({ signatureCollection });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

export function createOptimizedSignatureCollection(signatures: Array<string>) {
  const signatureCollection: Array<SignatureCollection> = [] as Array<SignatureCollection>;

  for (const funcSig of signatures) {
    const res = optimizeSignature(funcSig, false);

    if (res === undefined) continue;

    signatureCollection.push({
      ...res,
      signature: funcSig,
      signatureHash: keccak256(funcSig).substring(0, 8),
    });
  }

  const signatureToHashMap = signatureCollection.reduce<{
    [signature: string]: string;
  }>((memo, { signature, signatureHash }) => {
    memo[signature] = signatureHash;
    return memo;
  }, {});

  const optimizedSignatureToHashMap = signatureCollection.reduce<{
    [optimizedSignature: string]: string;
  }>((memo, { optimizedSignature, optimizedSignatureHash }) => {
    memo[optimizedSignature] = optimizedSignatureHash;
    return memo;
  }, {});

  const signatureToOptimizedSignatureMap = signatureCollection.reduce<{
    [signature: string]: string;
  }>((memo, { signature, optimizedSignature }) => {
    memo[signature] = optimizedSignature;
    return memo;
  }, {});

  return {
    signatureCollection,
    signatureToHashMap,
    optimizedSignatureToHashMap,
    signatureToOptimizedSignatureMap,
  };
}
