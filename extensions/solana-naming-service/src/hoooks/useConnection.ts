import { clusterApiUrl, Connection } from "@solana/web3.js";
import { useMemo } from "react";

const useConnection = () => {
  const connection = useMemo(() => new Connection(clusterApiUrl("mainnet-beta")), []);

  return { connection };
};

export default useConnection;
