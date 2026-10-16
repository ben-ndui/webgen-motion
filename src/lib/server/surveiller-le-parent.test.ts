import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { surveillerLeParent } from "./surveiller-le-parent";

describe("surveillerLeParent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ne fait rien tant que l'application qui l'a lancé est là", () => {
    const arreter = vi.fn();
    surveillerLeParent({ parentAuDepart: 42, parentActuel: () => 42, arreter });
    vi.advanceTimersByTime(60_000);
    expect(arreter).not.toHaveBeenCalled();
  });

  it("s'arrête une seule fois quand l'application disparaît (parent repris par le système)", () => {
    let parent = 42;
    const arreter = vi.fn();
    surveillerLeParent({ parentAuDepart: 42, parentActuel: () => parent, arreter });
    vi.advanceTimersByTime(2000);
    expect(arreter).not.toHaveBeenCalled();
    parent = 1;
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(10_000);
    expect(arreter).toHaveBeenCalledTimes(1);
  });

  it("se désactive quand on le lui demande", () => {
    let parent = 42;
    const arreter = vi.fn();
    const desactiver = surveillerLeParent({ parentAuDepart: 42, parentActuel: () => parent, arreter });
    desactiver();
    parent = 1;
    vi.advanceTimersByTime(10_000);
    expect(arreter).not.toHaveBeenCalled();
  });
});
