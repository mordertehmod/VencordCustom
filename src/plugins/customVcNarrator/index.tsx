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

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { wordsToTitle } from "@utils/text";
import definePlugin, { ReporterTestable } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildMemberStore, SelectedChannelStore, SelectedGuildStore, useMemo, UserStore } from "@webpack/common";
import { ReactElement } from "react";

import { getCurrentVoice, settings } from "./settings";

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

async function speak(text: string) {
    if (!text || text.trim().length === 0) return;
    const { volume, rate } = settings.store;

    try {
        const voiceSelection = getCurrentVoice();

        if (!voiceSelection) {
            throw new Error("No voice selected");
        }

        const response = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                voice: voiceSelection.id
            })
        });

        if (!response.ok) {
            throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data?.success) {
            throw new Error(data?.error || "Unknown TTS API error");
        }

        const audioData = atob(data.data);
        const binaryData = new Uint8Array(audioData.length);

        for (let i = 0; i < audioData.length; i++) {
            binaryData[i] = audioData.charCodeAt(i);
        }

        const blob = new Blob([binaryData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = volume;
        audio.playbackRate = rate;

        audio.addEventListener("ended", () => {
            URL.revokeObjectURL(url);
        }, { once: true });

        await audio.play();

    } catch (error) {
        new Logger("CustomVCNarrator").error("Failed to play TTS: ", error);
    }
}

function clean(str: string) {
    const replacer = settings.store.latinOnly
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

    return ["", ""];
}

function playSample(type: string) {
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    speak(formatText(
        settings.store[type + "Message"],
        currentUser.username,
        "general",
        currentUser.globalName ?? currentUser.username,
        GuildMemberStore.getNick(myGuildId!, currentUser.id) ?? currentUser.username
    ));
}

export default definePlugin({
    name: "CustomVcNarrator",
    description: "Announces when users join, leave, or move voice channels via narrator. TikTok TTS version; speechSynthesis is pretty boring",
    authors: [Devs.Ven, Devs.Nyako, Devs.LSDZaddi],
    reporterTestable: ReporterTestable.None,
    settings,
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myGuildId = SelectedGuildStore.getGuildId();
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            if (ChannelStore.getChannel(myChanId!)?.type === 13) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId) continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);
                if (!type) continue;

                const template = settings.store[type + "Message"];
                const user = isMe && !settings.store.sayOwnName ? "" : UserStore.getUser(userId).username;
                const displayName = user && ((UserStore.getUser(userId) as any).globalName ?? user);
                const nickname = user && (GuildMemberStore.getNick(myGuildId!, userId) ?? user);
                const channel = ChannelStore.getChannel(id).name;

                speak(formatText(template, user, channel, displayName, nickname));
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;

            if (!s) return;

            const event = s.mute || s.selfMute ? "unmute" : "mute";
            speak(formatText(settings.store[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;

            if (!s) return;

            const event = s.deaf || s.selfDeaf ? "undeafen" : "deafen";
            speak(formatText(settings.store[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        }
    },

    settingsAboutComponent() {

        const types = useMemo(
            () => Object.keys(settings.def).filter(k => k.endsWith("Message")).map(k => k.slice(0, -7)),
            [],
        );

        const errorComponent: ReactElement<any> | null = null;

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the spoken messages below. You can disable specific messages by setting them to nothing
                </Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code>, <code>{"{{DISPLAY_NAME}}"}</code>, <code>{"{{NICKNAME}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively
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
                        <Button key={t} onClick={() => playSample(t)}>
                            {wordsToTitle([t])}
                        </Button>
                    ))}
                </div>
                {errorComponent}
            </Forms.FormSection>
        );
    }
});
