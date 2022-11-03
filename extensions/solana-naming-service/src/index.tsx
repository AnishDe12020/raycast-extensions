import { List } from "@raycast/api";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import SNSName from "./components/SNSName";

export default function Command() {
  const [query, setQuery] = useState<string>();
  const [debouncedQuery] = useDebounce(query, 200);

  if (debouncedQuery && debouncedQuery?.trim().length > 0) {
    return <SNSName domain={debouncedQuery} />;
  }

  return (
    <List searchBarPlaceholder="Search by address or transaction signature" onSearchTextChange={setQuery} throttle>
      <List.EmptyView title="Type a account address or transaction signature" />
    </List>
  );
}
