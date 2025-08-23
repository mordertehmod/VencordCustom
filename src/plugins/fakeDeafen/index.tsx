import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Toasts } from "@webpack/common";

export let fakeD = false;

const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

function showSuccessToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId(),
        options: {
            duration: 3000,
            position: Toasts.Position.TOP
        }
    });
}

function showErrorToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            duration: 4000,
            position: Toasts.Position.TOP
        }
    });
}

function showInfoToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.MESSAGE,
        id: Toasts.genId(),
        options: {
            duration: 2500,
            position: Toasts.Position.TOP
        }
    });
}

function mute() {
    const muteButton = document.querySelector('[aria-label="Mute"]') as HTMLElement;
    if (muteButton) {
        muteButton.click();
        if (settings.store.showToasts) {
            showInfoToast("🔇 Muted for fake deafen");
        }
    } else {
        console.warn("FakeDeafen: Mute button not found");
        if (settings.store.showToasts) {
            showErrorToast("❌ Failed to find mute button");
        }
    }
}

function deafen() {
    const deafenButton = document.querySelector('[aria-label="Deafen"]') as HTMLElement;
    if (deafenButton) {
        deafenButton.click();
        return true;
    } else {
        console.warn("FakeDeafen: Deafen button not found");
        if (settings.store.showToasts) {
            showErrorToast("❌ Failed to find deafen button");
        }
        return false;
    }
}

function makeDeafenIcon(useFakeState: boolean) {
    return function DeafenIconComponent() {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Ear Icon Paths */}
                <path
                    d="M5.274 5.876c0.396-0.89 0.744-1.934 1.611-2.476 4.086-2.554 8.316 1.441 7.695 5.786-0.359 2.515-3.004 3.861-4.056 5.965-0.902 1.804-4.457 3.494-4.742 0.925"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M11.478 11.931c2.111-2.239 1.579-7.495-1.909-7.337-2.625 0.119-2.012 3.64-1.402 4.861"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M7.636 7.755c2.796-0.194 3.747 2.749 1.933 4.563-0.472 0.472-1.386-0.214-1.933 0.06-0.547 0.274-0.957 1.136-1.497 0.507"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Strike-through (only shown in fake state) */}
                {useFakeState && (
                    <path
                        d="M19 1L1 19"
                        stroke="var(--status-danger)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                    />
                )}
            </svg>
        );
    };
}

const TooltipModule = findByPropsLazy("Cy", "u", "FG");

function fakeDeafenToggleButton() {
    const DeafenIcon = makeDeafenIcon(fakeD);

    return (
        <TooltipModule.u
            text="Fake Deafen"
        >
            {tooltipProps => (
                <button
                    {...tooltipProps}
                    onClick={() => {
                        const wasActivated = !fakeD;
                        fakeD = !fakeD;

                        let success = true;

                        if (!deafen()) {
                            success = false;
                        }

                        setTimeout(() => {
                            if (!deafen()) {
                                success = false;
                            }
                        }, 250);

                        if (settings.store.muteUponFakeDeafen) {
                            setTimeout(mute, 300);
                        }

                        setTimeout(() => {
                            if (settings.store.showToasts) {
                                if (success) {
                                    if (wasActivated) {
                                        showSuccessToast("🔇 FakeDeafen Activated!");
                                    } else {
                                        showSuccessToast("🔊 FakeDeafen Deactivated!");
                                    }
                                } else {
                                    showErrorToast("❌ FakeDeafen failed - Please report this error to LSDZaddi");
                                }
                            }
                        }, 500);
                    }}
                    role="switch"
                    className="expressive-fakedeafen-button"
                    aria-checked={!fakeD}
                    style={{
                        background: fakeD
                            ? "linear-gradient(45deg, rgba(237, 66, 69, 0.25), rgba(240, 71, 71, 0.25))"
                            : "linear-gradient(45deg, rgba(88, 101, 242, 0.25), rgba(114, 137, 218, 0.25))",
                        border: fakeD ? "1px solid rgba(237, 66, 69, 0.4)" : "1px solid rgba(88, 101, 242, 0.4)",
                        borderRadius: "6px",
                        padding: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        position: "relative",
                        transition: "all 0.2s ease",
                        animation: fakeD ? "expressiveGlowActive 3s ease-in-out infinite" : "expressiveGlow 15s ease-in-out infinite",
                        color: "white"
                    }}
                >
                    <DeafenIcon />
                </button>
            )}
        </TooltipModule.u>
    );
}

const settings = definePluginSettings({
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show debug notifications for status updates",
        default: true
    },
    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "",
        default: true
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "",
        default: true
    },
    cam: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false
    }
});

export default definePlugin({
    name: "FakeDeafen",
    description: "You're deafened but you're not",
    dependencies: ["PhilsPluginLibraryVisualRefresh"],
    authors: [Devs.philhk, Devs.LSDZaddi],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1, 'mute'),self_deaf:$self.toggle($2, 'deaf'),self_video:$self.toggle($3, 'video')"
            }
        },
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.fakeDeafenToggleButton(),"
            }
        }
    ],

    settings,
    toggle: (au: any, what: string) => {
        if (fakeD === false)
            return au;
        else
            switch (what) {
                case "mute": return settings.store.mute;
                case "deaf": return settings.store.deafen;
                case "video": return settings.store.cam;
            }
    },
    fakeDeafenToggleButton: ErrorBoundary.wrap(fakeDeafenToggleButton, { noop: true }),

    start(): void {
        const style = document.createElement("style");
        style.id = "fakedeafen-expressive-styles";
        style.textContent = `
            @keyframes expressiveGlow {
                0% {
                    box-shadow: 0 0 8px rgba(255, 0, 128, 0.4), 0 0 16px rgba(255, 0, 128, 0.2);
                }
                25% {
                    box-shadow: 0 0 8px rgba(0, 255, 128, 0.4), 0 0 16px rgba(0, 255, 128, 0.2);
                }
                50% {
                    box-shadow: 0 0 8px rgba(128, 0, 255, 0.4), 0 0 16px rgba(128, 0, 255, 0.2);
                }
                75% {
                    box-shadow: 0 0 8px rgba(255, 128, 0, 0.4), 0 0 16px rgba(255, 128, 0, 0.2);
                }
                100% {
                    box-shadow: 0 0 8px rgba(255, 0, 128, 0.4), 0 0 16px rgba(255, 0, 128, 0.2);
                }
            }

            @keyframes expressiveGlowActive {
                0% {
                    box-shadow: 0 0 12px rgba(237, 66, 69, 0.6), 0 0 24px rgba(237, 66, 69, 0.3);
                }
                50% {
                    box-shadow: 0 0 16px rgba(240, 71, 71, 0.8), 0 0 32px rgba(240, 71, 71, 0.4);
                }
                100% {
                    box-shadow: 0 0 12px rgba(237, 66, 69, 0.6), 0 0 24px rgba(237, 66, 69, 0.3);
                }
            }

            .expressive-fakedeafen-button:hover {
                transform: scale(1.05) !important;
                animation-duration: 2s !important;
            }

            /* Custom toast styles */
            .toast-success {
                background: linear-gradient(90deg, rgba(67, 181, 129, 0.1), rgba(52, 168, 83, 0.1)) !important;
                border-left: 4px solid #43b581 !important;
            }

            .toast-error {
                background: linear-gradient(90deg, rgba(237, 66, 69, 0.1), rgba(240, 71, 71, 0.1)) !important;
                border-left: 4px solid #ed4245 !important;
            }

            .toast-info {
                background: linear-gradient(90deg, rgba(88, 101, 242, 0.1), rgba(114, 137, 218, 0.1)) !important;
                border-left: 4px solid #5865f2 !important;
            }
        `;
        document.head.appendChild(style);

        if (settings.store.showToasts) {
            setTimeout(() => {
                showInfoToast("🎉 FakeDeafen loaded! Click the glowing button to toggle FakeDeafen!");
            }, 1000);
        }
    },

    stop(): void {
        const style = document.getElementById("fakedeafen-expressive-styles");
        if (style) style.remove();

        if (settings.store.showToasts) {
            showInfoToast("FakeDeafen disabled");
        }
    },
});
