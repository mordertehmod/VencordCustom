import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";

export default definePlugin({
    name: "AlwaysExpandProfile",
    description: "Always display a user's full popout",
    authors: [Devs.LSDZaddi],
    patches: [
        {
            find: '"UserProfilePopout"',
            replacement: {
                match: /(?<=user:(\i).*?"PRESS_VIEW_PROFILE".{0,50})return/,
                replace: "return $self.openUserProfile($1);"
            }
        },
        {
            find: '"BotUserProfilePopout"',
            replacement: {
                match: /(?<=user:(\i).*?"PRESS_VIEW_PROFILE".{0,50})return/,
                replace: "return $self.openUserProfile($1);"
            }
        },
    ],
    openUserProfile(user: User) {
        openUserProfile(user.id);
    }
});