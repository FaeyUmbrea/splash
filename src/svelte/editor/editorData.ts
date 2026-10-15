import type { SplashModel, SpriteCreate } from '../../datamodel/SplashModel.ts';

/** Stored splash fields edited as plain data; newly added sprites may still need schema defaults. */
export type EditorDraft = Omit<ReturnType<SplashModel['toObject']>, 'children'> & { children: SpriteCreate[] };
