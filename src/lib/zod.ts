import { z } from "zod";

// A CSP do site proíbe eval. Sem isto, o zod testa `new Function` para
// acelerar a validação e o navegador registra uma violação de CSP.
z.config({ jitless: true });

export { z };
