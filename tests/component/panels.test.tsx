import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollectionPanel } from "@/components/collection-panel";
import { RankingsPanel } from "@/components/rankings-panel";
import { ResetDialog } from "@/components/reset-dialog";
import { LocaleProvider } from "@/i18n/locale-provider";

const withLocale = (children: React.ReactNode) => (
  <LocaleProvider initialLocale="en">{children}</LocaleProvider>
);

describe("secondary panels", () => {
  it("renders locked and unlocked archive states", () => {
    render(
      withLocale(<CollectionPanel
        collection={[
          { slug: "a", name: "Recovered", nameZh: "已恢复", description: "Known", descriptionZh: "已知", difficulty: 1, category: "META", unlocked: true, completedAt: "2026-08-02" },
          { slug: "b", name: "CLASSIFIED", nameZh: "机密", description: null, descriptionZh: null, difficulty: 2, category: "VISUAL", unlocked: false, completedAt: null },
        ]}
      />),
    );
    expect(screen.getByText("Recovered")).toBeInTheDocument();
    expect(screen.getByText("MYSTERY")).toBeInTheDocument();
    expect(screen.getByLabelText("Unlocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
  });

  it("covers rank loading, error with retry, and empty data", async () => {
    const retry = vi.fn();
    const { rerender } = render(withLocale(<RankingsPanel rankings={null} loading error={null} onRetry={retry} />));
    expect(screen.getByText(/Loading the leaderboard/)).toBeInTheDocument();
    rerender(withLocale(<RankingsPanel rankings={null} loading={false} error="Offline" onRetry={retry} />));
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(withLocale(<RankingsPanel rankings={{ timeHackers: [], perfectTiming: [], cheatMasters: [] }} loading={false} error={null} onRetry={retry} />));
    expect(screen.getAllByText(/Be the first/)).toHaveLength(3);
  });

  it("focuses cancel and supports cancel and confirmation", async () => {
    const cancel = vi.fn();
    const confirm = vi.fn();
    render(withLocale(<ResetDialog open busy={false} onCancel={cancel} onConfirm={confirm} />));
    const keep = screen.getByRole("button", { name: "Keep progress" });
    expect(keep).toHaveFocus();
    await userEvent.click(keep);
    expect(cancel).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Reset my progress" }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});
