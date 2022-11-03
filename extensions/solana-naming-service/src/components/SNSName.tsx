import { Record } from "@bonfida/spl-name-service";
import { ActionPanel, List, Action } from "@raycast/api";
import useDomain from "../hoooks/useDomain";
import useOwner from "../hoooks/useOwner";
import useRecords from "../hoooks/useRecords";

interface Props {
  domain: string;
}

const SNSName = ({ domain }: Props) => {
  const { records, isRecordsLoading, revalidateRecords } = useRecords(domain);
  const { domainData, isDomainLoading, revalidateDomainData } = useDomain(domain);

  const { ownerData, isOwnerLoading, revalidateOwnerData } = useOwner(domainData?.owner);

  console.log("records", records);
  // console.log("domainData", domainData);
  // console.log("ownerData", ownerData);

  const isLoading = isRecordsLoading || isDomainLoading || isOwnerLoading;

  const revalidateAll = () => {
    revalidateRecords();
    revalidateDomainData();
    revalidateOwnerData && revalidateOwnerData();
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidateAll()} />
        </ActionPanel>
      }
    >
      {domainData && (
        <List.Item
          title="Domain Details"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    title="Owner"
                    target={`https://explorer.solana.com/address/${domainData.owner}`}
                    text={domainData.owner}
                  />
                  <List.Item.Detail.Metadata.Link
                    title="Public Key"
                    target={`https://explorer.solana.com/address/${domainData.pubkey}`}
                    text={domainData.pubkey}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  {records &&
                    records.length > 0 &&
                    records.map((record) => {
                      if (!record) {
                        return;
                      }

                      switch (record.key) {
                        case Record.ETH:
                          return (
                            <List.Item.Detail.Metadata.Link
                              key={record.key}
                              title={record.key}
                              target={`https://etherscan.io/address/${record.data}`}
                              text={record.data}
                            />
                          );
                        case Record.SOL:
                          return (
                            <List.Item.Detail.Metadata.Link
                              key={record.key}
                              title={record.key}
                              target={`https://explorer.solana.com/address/${record.data}`}
                              text={record.data}
                            />
                          );
                      }
                    })}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
    </List>
  );
};

export default SNSName;
