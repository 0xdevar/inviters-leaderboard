import {getGitTag} from "./macro.ts" with { type: "macro" };

export const VERSION = getGitTag();
