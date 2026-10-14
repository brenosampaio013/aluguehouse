import { describe, expect, it } from "vitest";

import { averageRating, parseReviewTab, reviewSchema } from "@/lib/reviews";

describe("avaliações", () => {
  it("média com uma casa decimal no formato brasileiro", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([5])).toBe("5,0");
    expect(averageRating([5, 4, 5])).toBe("4,7");
    expect(averageRating([4, 5])).toBe("4,5");
  });

  it("nota obrigatória de 1 a 5 e comentário limitado", () => {
    const base = { bookingId: "3f0c1a8e-2b4d-4c6e-8a1b-9d2e3f4a5b6c" };
    expect(reviewSchema.safeParse({ ...base, rating: "5", comment: " Ótimo " }).data).toEqual({
      ...base,
      rating: 5,
      comment: "Ótimo",
    });
    for (const rating of [undefined, "0", "6", "3.5"]) {
      const result = reviewSchema.safeParse({ ...base, rating });
      expect(result.success, String(rating)).toBe(false);
    }
    expect(reviewSchema.safeParse({ ...base, rating: 4, comment: "x".repeat(2001) }).success).toBe(
      false,
    );
  });

  it("abas: pendentes por padrão", () => {
    expect(parseReviewTab(undefined).status).toBe("pending");
    expect(parseReviewTab("nao-publicadas").status).toBe("rejected");
    expect(parseReviewTab("qualquer").status).toBe("pending");
  });
});
