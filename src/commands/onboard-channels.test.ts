import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import {
  patchChannelOnboardingAdapter,
  setDefaultChannelPluginRegistryForTests,
} from "./channel-test-helpers.js";
import { setupChannels } from "./onboard-channels.js";
import { createExitThrowingRuntime, createWizardPrompter } from "./test-wizard-helpers.js";

function createPrompter(overrides: Partial<WizardPrompter> = {}): WizardPrompter {
  return createWizardPrompter(
    {
      progress: vi.fn(() => ({ update: vi.fn(), stop: vi.fn() })),
      ...overrides,
    },
    { defaultSelect: "__done__" },
  );
}

function createTelegramSecretRefCfg(): OpenClawConfig {
  return {
    channels: {
      telegram: {
        botToken: {
          source: "bws",
          provider: "default",
          id: "8bf0e2cf-0b2e-4550-a044-b40800b78f83",
        },
      },
    },
    secrets: {
      providers: {
        default: {
          source: "bws",
          accessTokenEnv: "BWS_ACCESS_TOKEN",
        },
      },
    },
  } as OpenClawConfig;
}

describe("setupChannels disabled hints", () => {
  beforeEach(() => {
    setDefaultChannelPluginRegistryForTests();
  });

  it("does not crash channel selection when Telegram uses an unresolved SecretRef", async () => {
    const restore = patchChannelOnboardingAdapter("telegram", {
      getStatus: vi.fn(async () => ({
        channel: "telegram",
        configured: true,
        statusLines: [],
        selectionHint: "configured",
        quickstartScore: 1,
      })),
    });
    const select = vi.fn(async () => "__done__");
    const prompter = createPrompter({
      select: select as unknown as WizardPrompter["select"],
    });

    try {
      await expect(
        setupChannels(createTelegramSecretRefCfg(), createExitThrowingRuntime(), prompter, {
          skipConfirm: true,
          quickstartDefaults: false,
        }),
      ).resolves.toMatchObject({
        channels: {
          telegram: {
            botToken: {
              source: "bws",
              provider: "default",
              id: "8bf0e2cf-0b2e-4550-a044-b40800b78f83",
            },
          },
        },
      });
    } finally {
      restore();
    }
  });
});
