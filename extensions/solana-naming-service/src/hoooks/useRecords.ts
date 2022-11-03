import { getDomainKey, NameRegistryState, Record } from "@bonfida/spl-name-service";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import useConnection from "./useConnection";

interface RecordOutput {
  key: Record;
  data: string;
}

/**
 * This hook can be used to retrieve all the records of a domain
 * @param domains Domains to resolve records for e.g "bonfida"
 * @returns
 */
export const useRecords = (domain: string) => {
  const { connection } = useConnection();
  const abortable = useRef<AbortController>();

  const {
    isLoading: isRecordsLoading,
    data: records,
    revalidate: revalidateRecords,
  } = useCachedPromise(
    async (domain: string) => {
      const recordsKeys = Object.keys(Record).map((e) => Record[e as keyof typeof Record]);

      const keys = await Promise.all(recordsKeys.map((e) => getDomainKey(e + "." + domain, true)));

      const registries = await NameRegistryState.retrieveBatch(
        connection,
        keys.map((e) => e.pubkey)
      );

      // Remove trailling 0s
      const records: (RecordOutput | undefined)[] = registries.map((e, index) => {
        if (e?.data) {
          const idx = e.data?.indexOf(0x00);
          e.data = e.data?.slice(0, idx);

          const dataStr = e.data.toString();

          return { key: recordsKeys[index], data: dataStr };
        }
        // Record is not defined
        return undefined;
      });

      return records;
    },
    [domain],
    { abortable }
  );

  return { records, isRecordsLoading, revalidateRecords };
};

export default useRecords;
