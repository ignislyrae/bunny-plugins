import Settings from "./Settings";

export default definePlugin({
    start: () => {
        console.log("Hello world!");
    },
    stop: () => {
        console.log("Goodbye, world.");
    },
    SettingsComponent: Settings,
});
