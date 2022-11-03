import { FavouriteDomain, NAME_OFFERS_ID } from "@bonfida/name-offers";
import {
  findSubdomains,
  getDomainKey,
  getPicRecord,
  NameRegistryState,
  performReverseLookup,
} from "@bonfida/spl-name-service";
import { useCachedPromise } from "@raycast/utils";
import { Connection } from "@solana/web3.js";
import { useRef } from "react";
import useConnection from "./useConnection";

const useDomain = (domain: string) => {
  const abortable = useRef<AbortController>();

  const { connection } = useConnection();

  const {
    data: domainData,
    isLoading: isDomainLoading,
    revalidate: revalidateDomainData,
  } = useCachedPromise(
    async (domain: string) => {
      const { pubkey } = await getDomainKey(domain);

      const d = await NameRegistryState.retrieve(connection, pubkey);

      const owner = d.registry.owner.toString();

      return { pubkey: pubkey.toString(), owner };
    },
    [domain],
    { abortable }
  );

  return {
    domainData,
    isDomainLoading,
    revalidateDomainData,
  };
};

export default useDomain;
