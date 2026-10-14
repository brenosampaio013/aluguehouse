import { testEnv } from "./env";

type SearchResult = { messages: { ID: string }[] };
type Message = { HTML: string; Text: string };

/** Espera o e-mail chegar no Mailpit (Supabase local) e devolve o link de acesso. */
export async function waitForAccessLink(email: string, timeoutMs = 15_000): Promise<URL> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:"${email}"`);

  while (Date.now() < deadline) {
    const search = (await (
      await fetch(`${testEnv.mailpitUrl}/api/v1/search?query=${query}`)
    ).json()) as SearchResult;
    const id = search.messages[0]?.ID;
    if (id) {
      const message = (await (
        await fetch(`${testEnv.mailpitUrl}/api/v1/message/${id}`)
      ).json()) as Message;
      const href = message.HTML.match(/href="([^"]*\/auth\/callback[^"]*)"/)?.[1];
      if (!href) throw new Error("E-mail recebido sem link de acesso.");
      return new URL(href.replaceAll("&amp;", "&"));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum e-mail para ${email} em ${timeoutMs} ms.`);
}

/** Espera um e-mail que combine com a busca do Mailpit e devolve assunto e texto. */
export async function waitForEmail(
  query: string,
  timeoutMs = 15_000,
): Promise<{ subject: string; text: string; to: string[]; replyTo: string[] }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = (await (
      await fetch(`${testEnv.mailpitUrl}/api/v1/search?query=${encodeURIComponent(query)}`)
    ).json()) as SearchResult;
    const id = search.messages[0]?.ID;
    if (id) {
      const message = (await (
        await fetch(`${testEnv.mailpitUrl}/api/v1/message/${id}`)
      ).json()) as Message & {
        Subject: string;
        To: { Address: string }[];
        ReplyTo: { Address: string }[];
      };
      return {
        subject: message.Subject,
        text: message.Text,
        to: message.To.map((a) => a.Address),
        replyTo: (message.ReplyTo ?? []).map((a) => a.Address),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum e-mail para a busca "${query}" em ${timeoutMs} ms.`);
}
