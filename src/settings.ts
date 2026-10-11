import { MOD_ID } from "$mod";

declare global {
  interface SettingsShape extends ExtractSettings<
    typeof import("./settings")
  > {}
}

const runStartId = `${MOD_ID}.run_start_deaths`;

export default [
  {
    id: "port",
    ui_name: "Port",
    ui_description: "What port to run the server on",
    value_default: 5435,
    value_min: 1024,
    value_max: 65535,
    scope: ModSettingScope.Runtime,
  },
  {
    id: "run_start_deaths",
    ui_name: "Reset the runs counter",
    value_default: 0,
    value_min: 0,
    value_max: 2147483647,
    scope: ModSettingScope.Runtime,
    draw: ({ gui, im_id }) => {
      const [clicked] = GuiButton(gui, im_id, 0, 0, "Reset the runs counter");
      GuiTooltip(gui, "Sets the runs counter to zero.", "");
      if (clicked) {
        const deaths = tonumber(StatsGlobalGetValue("death_count")) ?? 0;
        // set both, so that the overlay updates while the game is paused
        ModSettingSetNextValue(runStartId, deaths, false);
        ModSettingSet(runStartId, deaths);
      }
    },
  },
] as const satisfies ModSetting[];
