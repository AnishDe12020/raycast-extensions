import { useRef, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, OAuth } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const CLIENT_ID = "481699922272-udqnqqpbquns0bp5k7vsav84j7bltt78.apps.googleusercontent.com";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "https://www.google.com/favicon.ico",
  description: "Connect your Google Account...",
});

const authorize = async () => {
  const tokenSet = await oauthClient.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await oauthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await oauthClient.authorizationRequest({});
};

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [isLoading, setIsLoading] = useState(true);

  const abortable = useRef<AbortController>();

  const {
    isLoading: isPhotosLoading,
    data: photos,
    revalidate: revalidatePhotos,
  } = useCachedPromise(
    async () => {
      OAuth;
    },
    [],
    { abortable }
  );

  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        Object.entries(Icon).map(([name, icon]) => (
          <Grid.Item
            key={name}
            content={{ value: { source: icon, tintColor: Color.PrimaryText }, tooltip: name }}
            title={name}
            subtitle={icon}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={icon} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
