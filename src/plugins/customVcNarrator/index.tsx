/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { wordsToTitle } from "@utils/text";
import definePlugin, { OptionType, PluginOptionsItem } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildMemberStore, SelectedChannelStore, SelectedGuildStore, useMemo, UserStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

const VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel", "getCurrentClientVoiceChannelId");

// Mute/Deaf for other people than you is commented out, because otherwise someone can spam it and it will be annoying
// Filtering out events is not as simple as just dropping duplicates, as otherwise mute, unmute, mute would
// not say the second mute, which would lead you to believe they're unmuted

async function speak(text: string, settings: any = Settings.plugins.VcNarratorCustom) {
    if (text.trim().length === 0) return;
    const response = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        },
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
            text: text,
            voice: Settings.plugins.VcNarratorCustom.customVoice
        })
    });

    const data = await response.json();
    const audioData = atob(data.data);

    const binaryData: number[] = [];
    for (let i = 0; i < audioData.length; i++) {
        binaryData.push(audioData.charCodeAt(i));
    }

    const blob = new Blob([new Uint8Array(binaryData)], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play();

    audio.volume = settings.volume;
    audio.playbackRate = settings.rate;
}

function clean(str: string) {
    const replacer = Settings.plugins.VcNarratorCustom.latinOnly
        ? /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu
        : /[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu;

    return str.normalize("NFKC")
        .replace(replacer, "")
        .replace(/_{2,}/g, "_")
        .trim();
}

function formatText(str: string, user: string, channel: string, displayName: string, nickname: string) {
    return str
        .replaceAll("{{USER}}", clean(user) || (user ? "Someone" : ""))
        .replaceAll("{{CHANNEL}}", clean(channel) || "channel")
        .replaceAll("{{DISPLAY_NAME}}", clean(displayName) || (displayName ? "Someone" : ""))
        .replaceAll("{{NICKNAME}}", clean(nickname) || (nickname ? "Someone" : ""));
}

/*
let StatusMap = {} as Record<string, {
    mute: boolean;
    deaf: boolean;
}>;
*/

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

function getTypeAndChannelId({ channelId, oldChannelId }: VoiceState, isMe: boolean) {
    if (isMe && channelId !== myLastChannelId) {
        oldChannelId = myLastChannelId;
        myLastChannelId = channelId;
    }

    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    /*
    if (channelId) {
        if (deaf || selfDeaf) return ["deafen", channelId];
        if (mute || selfMute) return ["mute", channelId];
        const oldStatus = StatusMap[userId];
        if (oldStatus.deaf) return ["undeafen", channelId];
        if (oldStatus.mute) return ["unmute", channelId];
    }
    */
    return ["", ""];
}

/*
function updateStatuses(type: string, { deaf, mute, selfDeaf, selfMute, userId, channelId }: VoiceState, isMe: boolean) {
    if (isMe && (type === "join" || type === "move")) {
        StatusMap = {};
        const states = VoiceStateStore.getVoiceStatesForChannel(channelId!) as Record<string, VoiceState>;
        for (const userId in states) {
            const s = states[userId];
            StatusMap[userId] = {
                mute: s.mute || s.selfMute,
                deaf: s.deaf || s.selfDeaf
            };
        }
        return;
    }

    if (type === "leave" || (type === "move" && channelId !== SelectedChannelStore.getVoiceChannelId())) {
        if (isMe)
            StatusMap = {};
        else
            delete StatusMap[userId];

        return;
    }

    StatusMap[userId] = {
        deaf: deaf || selfDeaf,
        mute: mute || selfMute
    };
}
*/

function playSample(tempSettings: any, type: string) {
    const settings = Object.assign({}, Settings.plugins.VcNarratorCustom, tempSettings);
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    speak(formatText(settings[type + "Message"], currentUser.username, "general", (currentUser as any).globalName ?? currentUser.username, GuildMemberStore.getNick(myGuildId, currentUser.id) ?? currentUser.username), settings);
}

export default definePlugin({
    name: "VcNarratorCustom",
    description: "Announces when users join, leave, or move voice channels via narrator. TikTok TTS version; speechSynthesis is pretty boring",
    authors: [Devs.Ven, Devs.Nyako, Devs.LSDZaddi],

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myGuildId = SelectedGuildStore.getGuildId();
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            if (ChannelStore.getChannel(myChanId!)?.type === 13 /* Stage Channel */) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (isMe && Settings.plugins.VcNarratorCustom.ignoreSelf) continue;
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId) continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);
                if (!type) continue;

                const template = Settings.plugins.VcNarratorCustom[type + "Message"];
                const user = isMe && !Settings.plugins.VcNarratorCustom.sayOwnName ? "" : UserStore.getUser(userId).username;
                const displayName = user && ((UserStore.getUser(userId) as any).globalName ?? user);
                const nickname = user && (GuildMemberStore.getNick(myGuildId, userId) ?? displayName);
                const channel = ChannelStore.getChannel(id).name;

                speak(formatText(template, user, channel, displayName, nickname));

                // updateStatuses(type, state, isMe);
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.mute || s.selfMute ? "unmute" : "mute";
            speak(formatText(Settings.plugins.VcNarratorCustom[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.deaf || s.selfDeaf ? "undeafen" : "deafen";
            speak(formatText(Settings.plugins.VcNarratorCustom[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        }
    },

    optionsCache: null as Record<string, PluginOptionsItem> | null,
    get options() {
        return this.optionsCache ??= {
            customVoice: {
                type: OptionType.STRING,
                description: "Custom voice id, currently just tiktok",
                default: "en_us_001"
            },
            volume: {
                type: OptionType.SLIDER,
                description: "Narrator Volume",
                default: 1,
                markers: [0, 0.25, 0.5, 0.75, 1],
                stickToMarkers: false
            },
            rate: {
                type: OptionType.SLIDER,
                description: "Narrator Speed",
                default: 1,
                markers: [0.1, 0.5, 1, 2, 5, 10],
                stickToMarkers: false
            },
            sayOwnName: {
                description: "Say own name",
                type: OptionType.BOOLEAN,
                default: false
            },
            ignoreSelf: {
                description: "Ignore yourself for all events.",
                type: OptionType.BOOLEAN,
                default: false
            },
            latinOnly: {
                description: "Strip non latin characters from names before saying them",
                type: OptionType.BOOLEAN,
                default: false
            },
            joinMessage: {
                type: OptionType.STRING,
                description: "Join Message",
                default: "{{DISPLAY_NAME}} joined"
            },
            leaveMessage: {
                type: OptionType.STRING,
                description: "Leave Message",
                default: "{{DISPLAY_NAME}} left"
            },
            moveMessage: {
                type: OptionType.STRING,
                description: "Move Message",
                default: "{{DISPLAY_NAME}} moved to {{CHANNEL}}"
            },
            muteMessage: {
                type: OptionType.STRING,
                description: "Mute Message (only self for now)",
                default: "{{DISPLAY_NAME}} Muted"
            },
            unmuteMessage: {
                type: OptionType.STRING,
                description: "Unmute Message (only self for now)",
                default: "{{DISPLAY_NAME}} unmuted"
            },
            deafenMessage: {
                type: OptionType.STRING,
                description: "Deafen Message (only self for now)",
                default: "{{DISPLAY_NAME}} deafened"
            },
            undeafenMessage: {
                type: OptionType.STRING,
                description: "Undeafen Message (only self for now)",
                default: "{{DISPLAY_NAME}} undeafened"
            }
        };
    },

    settingsAboutComponent({ tempSettings: s }) {

        const types = useMemo(
            () => Object.keys(Vencord.Plugins.plugins.VcNarratorCustom.options!).filter(k => k.endsWith("Message")).map(k => k.slice(0, -7)),
            [],
        );

        const errorComponent: React.ReactElement | null = null;

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the spoken messages below. You can disable specific messages by setting them to nothing
                </Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code>, <code>{"{{DISPLAY_NAME}}"}</code>, <code>{"{{NICKNAME}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively
                </Forms.FormText>
                <Forms.FormText>
                    You can find a list of custom voices (tiktok only for now) <a href="https://github.com/oscie57/tiktok-voice/wiki/Voice-Codes" target="_blank" rel="noreferrer">here</a>
                </Forms.FormText>
                <Forms.FormTitle className={Margins.top20} tag="h3">Play Example Sounds</Forms.FormTitle>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "1rem",
                    }}
                    className={"vc-narrator-buttons"}
                >
                    {types.map(t => (
                        <Button key={t} onClick={() => playSample(s, t)}>
                            {wordsToTitle([t])}
                        </Button>
                    ))}
                </div>
                {errorComponent}
            </Forms.FormSection>
        );
    }
});
