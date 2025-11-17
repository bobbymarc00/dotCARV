import { PublicKey } from "@solana/web3.js";

export const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://rpc.testnet.carv.io/rpc';
export const programId = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || '8MPuR7zKVk2XQJ7apb1Ksc49oKF4AozvF5huKhwBubCa';
export const treasuryWallet = process.env.NEXT_PUBLIC_SOLANA_TREASURY_WALLET || '3KLEMtjay3MTvNvtmBq8FNkgvfmw3phPUuvggP2vPo83';
