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

import { types } from "../../philsPluginLibraryVisualRefresh";

export const PluginInfo = {
    PLUGIN_NAME: "BetterScreenshare",
    DESCRIPTION: "This plugin allows you to further customize your screen sharing.",
    AUTHOR: {
        ...Devs.philhk,
        github: "https://github.com/philhk"
    },
    CONTRIBUTORS: {
        LSD𝓩𝓪𝓭𝓭𝓲: {
            github: "https://github.com/mordertehmod",
            id: 413072381087580166n,
            name: "LSD𝓩𝓪𝓭𝓭𝓲"
        }
    },
    README: "https://github.com/Vendicated/Vencord/tree/main/src/plugins/betterScreenshare"
} as const satisfies types.PluginInfo;
