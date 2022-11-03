import { useCachedPromise } from "@raycast/utils";
import { PublicKey } from "@solana/web3.js";
import { useRef } from "react";
import useConnection from "./useConnection";

const useOwner = (address: string | undefined) => {
  const abortable = useRef<AbortController>();
  const { connection } = useConnection();

  if (!address) {
    return { ownerData: undefined, isOwnerLoading: true, revalidateOwner: undefined };
  }

  const {
    data: ownerData,
    isLoading: isOwnerLoading,
    revalidate: revalidateOwnerData,
  } = useCachedPromise(
    async (address: string) => {
      const ownerData = await connection.getAccountInfo(new PublicKey(address));
      return ownerData;
    },
    [address],
    { abortable, execute: address ? true : false }
  );

  return {
    ownerData,
    isOwnerLoading,
    revalidateOwnerData,
  };
};

export default useOwner;
