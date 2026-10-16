import { describe, expect, it } from "vitest";

import { visiblePages } from "@/components/admin/ui/pagination";
import { toCsv } from "@/lib/admin/csv";
import { safeReturnPath } from "@/lib/admin/return-to";
import { parseBookingFilters, parseInquiryFilters, parseUuid } from "@/lib/admin/filters";
import {
  buildHref,
  orIlike,
  pageRange,
  parseDate,
  parsePage,
  parseSearch,
  parseSort,
  totalPages,
} from "@/lib/admin/list-params";

describe("parâmetros das listas do painel", () => {
  it("página: só inteiros positivos", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["4", "5"])).toBe(4);
  });

  it("busca: sem espaços sobrando e com limite de tamanho", () => {
    expect(parseSearch("  Ana   Maria ")).toBe("Ana Maria");
    expect(parseSearch("x".repeat(300))).toHaveLength(100);
  });

  it("data: só datas que existem no calendário", () => {
    expect(parseDate("2026-02-28")).toBe("2026-02-28");
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("28/02/2026")).toBeNull();
  });

  it("ordenação: coluna desconhecida volta ao padrão", () => {
    const fallback = { key: "recebida", dir: "desc" } as const;
    const allowed = ["recebida", "total"] as const;
    expect(parseSort({ ordem: "senha" }, allowed, fallback)).toEqual(fallback);
    expect(parseSort({ ordem: "total", dir: "desc" }, allowed, fallback)).toEqual({
      key: "total",
      dir: "desc",
    });
    expect(parseSort({ ordem: "total" }, allowed, fallback)).toEqual({ key: "total", dir: "asc" });
  });

  it("paginação: faixa do banco e total de páginas", () => {
    expect(pageRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(pageRange(3, 20)).toEqual({ from: 40, to: 59 });
    expect(totalPages(0)).toBe(1);
    expect(totalPages(41, 20)).toBe(3);
    expect(visiblePages(1, 1)).toEqual([1]);
    expect(visiblePages(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(visiblePages(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("URL só com parâmetros preenchidos", () => {
    expect(buildHref("/admin/imoveis", { q: "", situacao: null, pagina: 2 })).toBe(
      "/admin/imoveis?pagina=2",
    );
    expect(buildHref("/admin", {})).toBe("/admin");
  });

  it("busca no banco: curingas e separadores do filtro viram texto", () => {
    expect(orIlike(["title"], "Casa")).toBe('title.ilike."%Casa%"');
    expect(orIlike(["a", "b"], "100%")).toBe('a.ilike."%100\\\\%%",b.ilike."%100\\\\%%"');
    expect(orIlike(["a"], 'x,"y)')).toBe('a.ilike."%x,\\"y)%"');
  });

  it("uuid e filtros das solicitações", () => {
    expect(parseUuid("not-a-uuid")).toBeNull();
    expect(parseUuid("7E9B1C2A-1111-4222-8333-944455556666")).toBe(
      "7e9b1c2a-1111-4222-8333-944455556666",
    );
    const filters = parseBookingFilters({
      situacao: "pendentes",
      de: "2026-05-10",
      ate: "2026-05-01",
    });
    expect(filters.from).toBe("2026-05-01");
    expect(filters.to).toBe("2026-05-10");
    // Pendentes: quem espera há mais tempo primeiro.
    expect(filters.sort).toEqual({ key: "recebida", dir: "asc" });
    expect(parseBookingFilters({ situacao: "todas" }).sort.dir).toBe("desc");
  });

  it("contatos: aba 'todos' sem filtro de situação", () => {
    expect(parseInquiryFilters({ situacao: "todos" }).tab.status).toBeNull();
    expect(parseInquiryFilters({}).tab.status).toBe("new");
    expect(parseInquiryFilters({}).dir).toBe("asc");
  });
});

describe("CSV para Excel em português", () => {
  it("BOM, separador ; e linhas CRLF", () => {
    const csv = toCsv(["Nome", "Total"], [["Ana", 1800.5]]);
    expect(csv).toBe("﻿Nome;Total\r\nAna;1800,5\r\n");
  });

  it("aspas quando o texto tem ; aspas ou quebra de linha", () => {
    expect(toCsv(["Msg"], [['Oi; tudo "bem"?\nTchau']])).toContain('"Oi; tudo ""bem""?\nTchau"');
  });

  it("neutraliza fórmulas (injeção de CSV)", () => {
    const csv = toCsv(["A"], [['=HYPERLINK("x")'], ["+1"], ["-2"], ["@soma"]]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("\r\n'+1\r\n'-2\r\n'@soma");
  });

  it("vazios, booleanos e números negativos", () => {
    expect(toCsv(["a", "b", "c", "d"], [[null, true, false, -3]])).toBe(
      "﻿a;b;c;d\r\n;Sim;Não;-3\r\n",
    );
  });
});

describe("volta para a lista depois de uma ação", () => {
  it("mantém filtros e acrescenta o aviso", () => {
    expect(
      safeReturnPath(
        "/admin/contatos?situacao=todos&q=ana&movido=new",
        "/admin/contatos",
        { aviso: "excluido" },
        ["movido"],
      ),
    ).toBe("/admin/contatos?situacao=todos&q=ana&aviso=excluido");
  });

  it("recusa caminhos fora da lista, inclusive com .. e barras invertidas", () => {
    for (const value of [
      "/admin/contatos/../..//evil.com",
      "/admin/contatos\\..\\..\\\\evil.com",
      "//evil.com/admin/contatos",
      "https://evil.com/admin/contatos",
      "/admin/imoveis",
      "/admin/contatosX",
      null,
    ]) {
      expect(safeReturnPath(value, "/admin/contatos")).toBe("/admin/contatos");
    }
  });
});
