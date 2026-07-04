// By doing settings in such a way, we can have auto-completable
//`mod.settings.checkbox` anywhere, and it would also have a correct `boolean`
// type.
//
// Additionally, you also can declare something like this anywhere:
// ```typesctipt
// declare global {
//   interface SettingsShape {
//     a_setting_we_just_use_to_persist_stuff: string
//   }
// }
// And just get/set/delete it via `mod.settings.<name> = <value>` for convenience.
// It will use `mod_id.setting_name` key for the actual stored setting of course.
declare global {
  interface SettingsShape extends ExtractSettings<
    typeof import("./settings")
  > {}
}

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
] as const satisfies ModSetting[];
