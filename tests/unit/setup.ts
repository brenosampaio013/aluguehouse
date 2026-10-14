import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// "server-only" lança erro fora do ambiente de servidor do Next.js.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
