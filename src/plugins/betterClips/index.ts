/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
 * 
 * Testing auto-update. Disregard
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SelectOption } from "@webpack/types";


const settings = definePluginSettings({
    clipAllStreams: {
        description: "Allows clipping on all streams regardless of the streamer's settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    clipAllParticipants: {
        description: "Allows recording of all voice call participants regardless of their settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    moreClipDurations: {
        description: "Adds more clip durations.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    moreClipFramerates: {
        description: "Change clip framerate. (UP TO 240FPS!!)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterClips",
    authors: [
        Devs.LSDZaddi
    ],
    description: "Enables extra clipping options for streams.",
    settings,
    patches: [
        {
            predicate: () => settings.store.clipAllStreams,
            find: "}isViewerClippingAllowedForUser",
            replacement: {
                match: /isViewerClippingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            predicate: () => settings.store.clipAllParticipants,
            find: "}isVoiceRecordingAllowedForUser",
            replacement: {
                match: /isVoiceRecordingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            predicate: () => settings.store.moreClipDurations,
            find: "clips_recording_settings",
            replacement: {
                match: /\[\{.{0,10}\i.\i.SECONDS_30.{0,250}\}\]/,
                replace: "$self.patchDurations($&)"
            }
        },
        {
            predicate: () => settings.store.moreClipFramerates,
            find: "clips_recording_settings",
            replacement: {
                match: /\[\{.{0,10}\i.\i.FPS_15.{0,250}\}\]/,
                replace: "$self.patchFPS($&)"
            }
        },
    ],
    patchDurations(timeslots: SelectOption[]) {
        const newTimeslots = [...timeslots];
        const extraTimeslots = [3, 5, 7, 10];

        extraTimeslots.forEach(timeslot => newTimeslots.push({ value: timeslot * 60000, label: `${timeslot} Minutes` }));

        return newTimeslots;
    },
    patchFPS(framerates: SelectOption[]) {
        const extraFramerates = [...framerates];
        const moFRAMES = [45, 90, 120, 144, 165, 240];

        moFRAMES.forEach(framerate => extraFramerates.push({ value: framerate, label: `${framerate}FPS` }));

        return extraFramerates.toSorted();
    }
});
