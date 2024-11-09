import { findAsset, findAssetId } from "@bunny/api/assets";
import { after } from "@bunny/api/patcher";
import { findByNameLazy } from "@bunny/metro";
import { TableRowGroup, TableRowIcon, TableSwitchRow } from "@bunny/metro/common/components";
import { findInReactTree } from "@bunny/utils";
import { createStorage } from "@bunny/plugin";
import { useObservable } from "@bunny/api/storage";

const _lazyContextSymbol = Symbol.for("bunny.metro.lazyContext");

const storage = createStorage<{
    hideGiftButton: boolean;
    hideThreadsButton: boolean;
    hideAppsButton: boolean;
}>();

function getChatInputPrototype() {
    const ctxt = findByNameLazy("ChatInput")[_lazyContextSymbol];
    return new Promise(resolve => ctxt.getExports(exp => resolve(exp.prototype)));
}

export default definePlugin({
    start() {
        storage.hideGiftButton ??= true;
        storage.hideAppsButton ??= true;
        storage.hideThreadsButton ??= true;

        const blocklist = {
            hideGiftButton: "ic_gift",
            hideAppsButton: "AppsIcon",
            hideThreadsButton: "ic_thread_normal_24px",
        } as Record<keyof typeof storage, string>;

        after.await("render", getChatInputPrototype(), (_, ret) => {
            const input = findInReactTree(ret, t => "forceAnimateButtons" in t.props && t.props.actions);
            if (input)
                input.props.actions = input.props.actions.filter(a => {
                    const name = findAsset(a.source)?.name;
                    if (!name) return true;

                    for (const [key, value] of Object.entries(blocklist)) {
                        if (storage[key] && name === value) return false;
                    }

                    return true;
                });
        });
    },
    SettingsComponent() {
        useObservable([storage]);
 
        return <ReactNative.ScrollView contentContainerStyle={{ padding: 16 }}>
            <TableRowGroup title="Hide buttons">
                <TableSwitchRow
                    label="Hide threads button"
                    icon={<TableRowIcon source={findAssetId("ThreadPlusIcon")} />}
                    value={storage.hideThreadsButton}
                    onValueChange={value => storage.hideThreadsButton = value}
                />
                <TableSwitchRow
                    label="Hide gift button"
                    icon={<TableRowIcon source={findAssetId("GiftIcon")} />}
                    value={storage.hideGiftButton}
                    onValueChange={value => storage.hideGiftButton = value}
                />
                <TableSwitchRow
                    label="Hide apps button"
                    icon={<TableRowIcon source={findAssetId("AppsIcon")} />}
                    value={storage.hideAppsButton}
                    onValueChange={value => storage.hideAppsButton = value}
                />
            </TableRowGroup>
        </ReactNative.ScrollView>
    },
});
