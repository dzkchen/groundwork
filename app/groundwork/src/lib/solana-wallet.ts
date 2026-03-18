import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";

type SignableTx = Transaction | VersionedTransaction;

export function keypairAsWallet(payer: Keypair) {
  return {
    publicKey: payer.publicKey,
    signTransaction: async (tx: SignableTx) => {
      if (tx instanceof VersionedTransaction) tx.sign([payer]);
      else tx.partialSign(payer);
      return tx;
    },
    signAllTransactions: async (txs: SignableTx[]) => {
      return txs.map((tx) => {
        if (tx instanceof VersionedTransaction) tx.sign([payer]);
        else tx.partialSign(payer);
        return tx;
      });
    },
  };
}

