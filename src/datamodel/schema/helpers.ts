// A schema creator returns its field record; these read the create-time and initialized shapes off it,
// so a type reads `Create<typeof X>` / `Initialized<typeof X>` instead of the full SchemaField boilerplate.
export type Create<C extends (...args: never[]) => foundry.data.fields.DataSchema> = foundry.data.fields.SchemaField.CreateData<ReturnType<C>>;
export type Initialized<C extends (...args: never[]) => foundry.data.fields.DataSchema> = foundry.data.fields.SchemaField.InitializedData<ReturnType<C>>;
