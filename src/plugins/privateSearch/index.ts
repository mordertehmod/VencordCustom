import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageSearchChatBarIcon } from "./MessageSearchChatBarIcon";

export default definePlugin({
    name: "PrivateSearch",
    description: "Search through messages in every DM channels and group DMs globally",
    authors: [Devs.LSDZaddi],
    renderChatBarButton: MessageSearchChatBarIcon
});