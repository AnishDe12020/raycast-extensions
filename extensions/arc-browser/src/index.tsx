import { ActionPanel, Detail, List, Action, Icon, closeMainWindow, popToRoot } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { runAppleScript } from "run-applescript";

const TAB_CONTENTS_SEPARATOR = "~~~";

const parse = (line: string) => {
  const parts = line.split(TAB_CONTENTS_SEPARATOR);

  return {
    title: parts[0],
    url: parts[1],
    favicon: parts[2],
    windowsIndex: +parts[3],
    tabIndex: +parts[4],
  };
};

const urlWithoutScheme = (url: string) => {
  return url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
};

const urlDomain = (url: string) => {
  return urlWithoutScheme(url).split("/")[0];
};

async function setActiveTab(tab): Promise<void> {
  // console.log("Setting active tab to", tab);
  await runAppleScript(`
    tell application "Arc"
      activate
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
  `);
  console.log("tes");
}

export default function Command() {
  const abortable = useRef<AbortController>();
  const {
    isLoading: isOpenTabsLoading,
    data: openTabs,
    revalidate: revalidateOpenTabs,
  } = useCachedPromise(
    async () => {
      const faviconFormula = `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`;

      const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Arc"
        set _window_index to 1
        repeat with w in windows
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${TAB_CONTENTS_SEPARATOR}" & _url & "${TAB_CONTENTS_SEPARATOR}" & _favicon & "${TAB_CONTENTS_SEPARATOR}" & _window_index & "${TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
          set _window_index to _window_index + 1
          if _window_index > count windows then exit repeat
        end repeat
      end tell
      return _output
  `);

      return openTabs
        .split("\n")
        .filter((line) => line.length !== 0)
        .map((line) => parse(line));
    },
    [],
    { abortable }
  );

  // console.log("openTabs", openTabs);

  return (
    <List
      isLoading={isOpenTabsLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidateOpenTabs} />
        </ActionPanel>
      }
    >
      {openTabs &&
        openTabs.map((tab, index) => (
          <List.Item
            key={index}
            title={tab.title}
            subtitle={urlWithoutScheme(tab.url)}
            keywords={[urlWithoutScheme(tab.url)]}
            icon={getFavicon(tab.url)}
            actions={
              <ActionPanel title={tab.title}>
                <Action
                  title="Open Tab"
                  icon={{ source: Icon.Eye }}
                  onAction={async () => {
                    closeMainWindow();
                    popToRoot();
                    await setActiveTab(tab);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
