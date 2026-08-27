import { createPublicClient, defineChain, http, type WalletClient } from "viem";
import { hskMainnet } from "../config/hsk";
import { normalizeWalletError } from "./errors";

export const hskChain = defineChain({
  id: hskMainnet.id,
  name: hskMainnet.name,
  nativeCurrency: hskMainnet.nativeCurrency,
  rpcUrls: {
    default: {
      http: [hskMainnet.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "HSK Blockscout",
      url: hskMainnet.explorerUrl,
    },
  },
  testnet: false,
});

export const hskPublicClient = createPublicClient({
  chain: hskChain,
  transport: http(hskMainnet.rpcUrl),
});

export async function switchWalletClientToHsk(client: WalletClient) {
  try {
    await client.switchChain({ id: hskMainnet.id });
  } catch (error) {
    const normalized = normalizeWalletError(error);
    if (normalized.kind !== "unsupported-chain") throw normalized;
    await client.addChain({ chain: hskChain });
    await client.switchChain({ id: hskMainnet.id });
  }
}
