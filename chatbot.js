// Importando as dependências necessárias
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { executablePath } = require("puppeteer");
const axios = require("axios");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
const TelegramBot = require("node-telegram-bot-api");
let isWhatsAppBotActive = true; // Define o estado inicial do bot como ativo

// --- CONFIGURAÇÕES E MENSAGENS ---
const NOME_AUTOESCOLA = "Autoescola Sucesso";

// Credenciais do Telegram
const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "7934260697:AAEjI0XpENN5ml-8I4qYEDrcVKUYU3AwHwM"; // Token do bot do Telegram
const urlApiTelegram = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`; // URL da API do Telegram para envio de mensagens
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6219371991"; // ID do chat do Telegram para notificações

// CONFIGURAÇÕES DA INTELIGÊNCIA ARTIFICIAL (OpenRouter)
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  "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";
const OPENROUTER_MODEL = "openai/gpt-4.1-nano";

// NOVO: CONFIGURAÇÕES DO SUPABASE
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://fcfydhdcpbgtnfkujgxc.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjZnlkaGRjcGJndG5ma3VqZ3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDQwMTAsImV4cCI6MjA2OTMyMDAxMH0.piZ4oY6kqS5V_n5vspGURg1U4tdycQkyviLc0Dy0Xvw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

//TELEGRAM BOT

const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

async function setTelegramCommands() {
  try {
    const commands = [
      {
        command: "relatorio",
        description: "Gerar relatório de atividades do bot",
      },
      {
        command: "status",
        description: "Verificar o status do bot (WhatsApp, Supabase)",
      },
      {
        command: "recarregar",
        description: "Recarregar configurações e cache em memória",
      },
      {
        command: "desativar",
        description: "Desativar temporariamente o bot principal do WhatsApp",
      },
      { command: "ativar", description: "Ativar o bot principal do WhatsApp" },
    ];
    await telegramBot.setMyCommands(commands);
    console.log("[TELEGRAM] Comandos do bot definidos com sucesso!");
  } catch (error) {
    console.error("[TELEGRAM] Erro ao definir comandos do bot:", error.message);
  }
}

console.log("[TELEGRAM] Bot Telegram iniciado e ouvindo mensagens...");

setTelegramCommands();

// MENSAGENS ADMIN DO TELEGRAM
telegramBot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const fromId = msg.from.id; // ID do usuário que enviou a mensagem

  console.log(
    `[TELEGRAM] Mensagem recebida de ${
      msg.chat.first_name || msg.chat.title || fromId
    }: "${text}"`
  );

  // Verifica se a mensagem veio do seu TELEGRAM_CHAT_ID (ID do administrador)
  // Converte para string para comparação segura
  if (String(chatId) !== String(TELEGRAM_CHAT_ID)) {
    console.log(
      `[TELEGRAM] Mensagem de chat não autorizado (${chatId}). Ignorando.`
    );
    telegramBot.sendMessage(
      chatId,
      "Olá! Este bot é privado e não interage com usuários fora do grupo de administração. Obrigado pela compreensão!"
    );
    return;
  }

  // --- Lógica para os comandos ---
  if (text === "/relatorio") {
    telegramBot.sendMessage(chatId, "Gerando relatório, aguarde...");
    await gerarRelatorioCompleto(); // Chama a sua função de relatório
  } else if (text === "/status") {
    // Implementa a lógica para verificar o status do bot (WhatsApp, Supabase)
    let whatsappStatus = "🔴 Inativo ou não conectado";
    if (client && client.pupPage) {
      // Verifica se a instância do cliente WhatsApp existe e se a página do puppeteer está aberta
      try {
        const status = await client.getState(); // Verifica o estado da conexão do WhatsApp
        if (status === "CONNECTED") {
          whatsappStatus = "🟢 Conectado";
        } else {
          whatsappStatus = `🟡 Estado: ${status}`;
        }
      } catch (e) {
        whatsappStatus = `🟠 Erro ao verificar: ${e.message}`;
      }
    }

    let supabaseStatus = "🔴 Desconectado ou com erro";
    try {
      // Tenta fazer uma consulta simples para verificar a conexão com Supabase
      const { data, error } = await supabase
        .from("mensagens")
        .select("id")
        .limit(1);
      if (!error) {
        supabaseStatus = "🟢 Conectado";
      } else {
        supabaseStatus = `🟠 Erro: ${error.message}`;
      }
    } catch (e) {
      supabaseStatus = `🟠 Erro na conexão: ${e.message}`;
    }

    const botActiveStatus = isWhatsAppBotActive ? "🟢 Ativo" : "🔴 Desativado";

    const statusMessage =
      `🤖 *Status do Bot*\n\n` +
      `WhatsApp: *${whatsappStatus}*\n` +
      `Supabase: *${supabaseStatus}*\n` +
      `Bot Principal (WhatsApp): *${botActiveStatus}*\n` +
      `Bot Telegram: *🟢 Ativo*`; // O bot Telegram sempre estará ativo se estiver respondendo

    telegramBot.sendMessage(chatId, statusMessage, { parse_mode: "Markdown" });
  } else if (text === "/recarregar") {
    telegramBot.sendMessage(
      chatId,
      "Recarregando configurações/cache... (se houver)"
    );
    // Implemente a lógica para recarregar dados ou cache aqui.
    // Por exemplo, se você carrega preços de um arquivo ou do Supabase no início:
    // await carregarPrecosDoSupabase(); // Exemplo de função que recarrega dados
    // await carregarFluxosDeConversa(); // Exemplo de função que recarrega fluxos

    // Se você tiver dados carregados em memória (por exemplo, a variável `respostas`),
    // e esses dados podem mudar sem o bot reiniciar, você os recarregaria aqui.
    // No seu código atual, `respostas` parece ser um objeto estático, e `AI_SYSTEM_PROMPT`
    // vem de variáveis de ambiente. Se eles precisassem ser recarregados de um DB,
    // você chamaria uma função que os busque novamente.

    // Por enquanto, apenas um log, mas você pode adicionar mais aqui no futuro.
    console.log("[BOT] Tentativa de recarregar configurações.");
    telegramBot.sendMessage(
      chatId,
      "✅ Configurações recarregadas com sucesso (se houver dados dinâmicos para recarregar)."
    );
  } else if (text === "/desativar") {
    isWhatsAppBotActive = false; // Define a variável global como false
    console.log("[BOT] Bot de WhatsApp desativado por comando do Telegram.");
    telegramBot.sendMessage(
      chatId,
      "🔴 Bot principal de WhatsApp *desativado*."
    );
  } else if (text === "/ativar") {
    isWhatsAppBotActive = true; // Define a variável global como true
    console.log("[BOT] Bot de WhatsApp ativado por comando do Telegram.");
    telegramBot.sendMessage(chatId, "🟢 Bot principal de WhatsApp *ativado*.");
  } else {
    telegramBot.sendMessage(
      chatId,
      "Comando não reconhecido. Comandos disponíveis: /relatorio, /status, /recarregar, /desativar, /ativar"
    );
  }
});

// Tratamento de erros para o bot do Telegram
telegramBot.on("polling_error", (error) => {
  console.error("[TELEGRAM ERROR] Erro no polling:", error.code, error.message);
});

const AI_SYSTEM_PROMPT = `Você é Cadu, o assistente virtual especialista da ${NOME_AUTOESCOLA}. Você atua em um chatbot do WhatsApp que funciona 24/7 para atender clientes interessados em tirar carteira de habilitação.

## MENU DISPONÍVEL PARA OS CLIENTES:
*1* - Categorias de Habilitação 🚗
*2* - Preços e Pacotes 💰  
*3* - Documentos Necessários 📄
*4* - Horários das Aulas ⏰
*5* - Falar com um atendente humano 🧑‍💼

## SEU CONTEXTO E AMBIENTE:
- Você trabalha via WhatsApp Business integrado com IA
- O cliente já viu o menu inicial quando iniciou a conversa
- Você tem acesso ao histórico de mensagens do cliente para dar respostas mais contextualizadas
- Você deve sempre incentivar o uso do menu quando apropriado
- Para questões específicas de agendamento, preços exatos e pagamentos, deve direcionar para atendente humano (opção 5)

## SUA PERSONALIDADE E TOM:
- Seja amigável, profissional e prestativo
- Use linguagem clara e acessível (evite termos muito técnicos)
- Seja objetivo mas caloroso
- Use emojis ocasionalmente para deixar a conversa mais leve
- Trate o cliente sempre com respeito, independente da pergunta
- IMPORTANTE: Se o cliente já fez uma pergunta similar antes (conforme histórico), reconheça isso de forma natural

## SUAS RESPONSABILIDADES:
1. **Responder dúvidas gerais** sobre processo de habilitação, categorias (A, B, C, D, E), documentação básica, aulas teóricas/práticas
2. **Esclarecer dúvidas** sobre o funcionamento da autoescola, metodologia de ensino, estrutura
3. **Orientar sobre o menu** quando a pergunta se encaixa melhor em uma das opções numeradas
4. **Direcionar para atendente humano** quando necessário
5. **Usar o histórico** para dar respostas mais personalizadas

## COMO LIDAR COM PERGUNTAS FORA DO ESCOPO:

**Para perguntas sobre descontos/promoções:**
"Para informações sobre descontos e condições especiais, nossa equipe comercial pode te ajudar melhor! Digite *5* para falar com um atendente ou *2* para ver nossos pacotes. 💰"

**Para perguntas sobre outras autoescolas/comparações:**
"Posso te ajudar com informações sobre nossa autoescola! Para conhecer nossos diferenciais e metodologia, digite *2* para ver nossos pacotes ou *5* para falar com nossa equipe! 😊"

**Para perguntas pessoais/off-topic (clima, futebol, etc.):**
"Haha, que legal! Mas estou aqui para te ajudar com sua habilitação! 😄 Como posso te auxiliar hoje? Digite um número do menu ou me faça uma pergunta sobre carteira de motorista!"

**Para perguntas técnicas muito específicas:**
"Essa é uma questão bem específica! Nossa equipe técnica pode te dar uma resposta mais precisa. Digite *5* para falar com um especialista! 🧑‍💼"

**Para reclamações sobre trânsito/multas:**
"Entendo sua preocupação! Nossa missão é formar condutores conscientes e seguros. Que tal conhecer nossa metodologia? Digite *4* para ver nossos horários ou *5* para conversar com nossa equipe! 🚗"

## QUANDO DIRECIONAR PARA ATENDENTE HUMANO (OPÇÃO 5):
- Agendamento específico de aulas ou provas
- Negociação de preços, descontos ou condições de pagamento
- Problemas com documentação ou processo já iniciado
- Reclamações ou problemas específicos
- Questões que exigem acesso ao sistema interno
- Dúvidas muito específicas sobre situação individual do cliente
- Qualquer pergunta que você não saiba responder com certeza

## DIRETRIZES DE RESPOSTA:
- **Seja conciso**: Respostas entre 2-3 frases para dúvidas simples
- **Seja útil**: Sempre forneça informação relevante, mesmo que básica
- **Seja direcionador**: Termine sempre sugerindo uma ação específica (digitar número do menu ou opção 5)
- **Nunca diga "não sei"**: Sempre redirecione de forma positiva
- **Use o histórico**: Se o cliente já perguntou algo similar, mencione de forma natural

## EXEMPLOS DE COMO RESPONDER:

**Para dúvidas sobre categorias:**
"A categoria B é para carros de passeio, pickup e van até 3.500kg. Para ver todas as categorias disponíveis e detalhes completos, digite *1*! 🚗"

**Para dúvidas sobre documentos:**
"Os documentos básicos são RG, CPF, comprovante de residência e foto 3x4. Para a lista completa e atualizada, digite *3*! 📄"

**Para perguntas sobre tempo de habilitação:**
"O processo varia de pessoa para pessoa, mas geralmente leva de 3 a 6 meses. Para entender melhor nosso cronograma, digite *4* para ver horários ou *5* para falar com nossa equipe! ⏰"

**Para perguntas repetidas (usando histórico):**
"Como conversamos anteriormente sobre [assunto], [complemento da informação]. Digite *[número]* para mais detalhes ou *5* para falar com nossa equipe!"

## O QUE NUNCA FAZER:
- Nunca dê informações de preços específicos ou descontos
- Nunca confirme agendamentos ou disponibilidade  
- Nunca dê prazo exato para processos do Detran
- Nunca critique concorrentes
- Nunca responda "não sei" - sempre redirecione positivamente
- Nunca entre em discussões sobre temas não relacionados à autoescola

## FRASE PADRÃO PARA REDIRECIONAMENTO:
Quando não souber responder algo ou a pergunta fugir muito do escopo: "Para essa questão específica, nossa equipe especializada pode te ajudar melhor! Digite *5* para falar com um atendente que vai resolver isso pra você! 🧑‍💼"

Lembre-se: Seu objetivo é manter o cliente engajado, sempre oferecendo uma solução através do menu ou atendimento humano, usando o histórico para personalizar ainda mais o atendimento!`;

const respostas = {
  saudacao: `Olá! Sou o Cadu, assistente virtual da *${NOME_AUTOESCOLA}*. Como posso te ajudar hoje?\n\nPor favor, digite o número da opção desejada ou faça uma pergunta:\n\n*1* - Categorias de Habilitação 🚗\n*2* - Preços e Pacotes 💰\n*3* - Documentos Necessários 📄\n*4* - Horários das Aulas ⏰\n*5* - Falar com um atendente humano 🧑‍💼`,
  opcao1: `Trabalhamos com as seguintes categorias:\n\n*Categoria A (Moto):* Ideal para quem busca agilidade no trânsito.\n\n*Categoria B (Carro):* A mais comum, para veículos de passeio.\n\n*Categoria A+B:* Tire suas habilitações de carro e moto juntas e economize!`,
  opcao2: `Temos pacotes que cabem no seu bolso!\n\n*Pacote CNH B (Carro):* R$ 1.800,00\n*Pacote CNH A (Moto):* R$ 1.200,00\n*Pacote CNH A+B:* R$ 2.700,00\n\nPara mais detalhes e formas de pagamento, escolha a opção 5 para falar com um de nossos atendentes.`,
  opcao3: `Para iniciar seu processo de habilitação, você vai precisar de:\n\n- Documento de identidade (RG) e CPF (originais e cópias).\n- Comprovante de residência recente (últimos 3 meses).\n\nLembre-se: é necessário ser maior de 18 anos e ser alfabetizado.`,
  opcao4: `Nossos horários são flexíveis para te atender melhor!\n\n*Aulas Teóricas (CFC):*\n- Manhã: 08:00-12:00\n- Tarde: 13:00-17:00\n- Noite: 18:30-22:30\n\n*Aulas Práticas:*\n- Agendamento flexível de Segunda a Sábado.`,
  falarComHumano: `Entendido! Estou notificando um de nossos atendentes. Em breve, alguém da nossa equipe irá te responder por aqui. Por favor, aguarde um momento.`,
};

// --- INICIALIZAÇÃO DOS CLIENTES ---

// Inicialização do cliente OpenAI para se conectar com a OpenRouter
const openAiClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  timeout: 360000,
  maxRetries: 2,
});

console.log("Iniciando o bot da Autoescola...");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: executablePath(),
    headless: false,
  },
});

// Controle de sessões para saber se é a primeira interação
const sessoesUsuarios = new Map();

// Inicialização do WhatsApp
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log(
    "[QR CODE] Escaneie o QR Code com o seu WhatsApp ou use a janela do navegador."
  );
});
client.on("ready", () => {
  console.log("[SUCESSO] O bot está conectado e funcionando!");
});
client.on("authenticated", () => {
  console.log("[AUTENTICAÇÃO] Autenticado!");
});
client.on("auth_failure", (msg) => {
  console.error("[ERRO] Falha na autenticação!", msg);
  process.exit(1);
});
client.on("disconnected", (reason) => {
  console.log("[AVISO] Cliente desconectado!", reason);
});

client.initialize();

// --- FUNÇÕES AUXILIARES ---

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function enviarMensagemComTipagem(chat, texto) {
  await chat.sendStateTyping();
  await delay(1500);
  await client.sendMessage(chat.id._serialized, texto);
}

async function notificarAtendentePorTelegram(nomeContato, numeroContato) {
  const linkWhatsApp = `https://wa.me/${numeroContato}`;
  const mensagem = `🔔 *Nova Solicitação de Atendimento*\n\n*Cliente:* ${nomeContato}\n*Contato:* ${linkWhatsApp}\n\nO cliente solicitou falar com um atendente. Por favor, responda o mais rápido possível.`;
  const urlApiTelegram = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(urlApiTelegram, {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem,
      parse_mode: "Markdown",
    });
    console.log(
      `[TELEGRAM] Notificação enviada com sucesso para o atendente sobre ${nomeContato}.`
    );
  } catch (error) {
    console.error(
      "[ERRO TELEGRAM] Não foi possível enviar a notificação:",
      error.response ? error.response.data : error.message
    );
  }
}

// Função para salvar mensagem no Supabase
async function salvarMensagemSupabase(
  userTexto,
  mensagem,
  tipoMensagem = "recebida",
  nomeContato = null,
  intencao = null, // NOVO: Campo para intenção
  escaladaHumano = false // NOVO: Campo para escalada para humano
) {
  try {
    const { data, error } = await supabase.from("mensagens").insert([
      {
        user_texto: userTexto,
        mensagem: mensagem,
        tempo: new Date().toISOString(),
        tipo_mensagem: tipoMensagem, // 'recebida' ou 'enviada'
        nome_contato: nomeContato,
        intencao: intencao, // NOVO
        escalada_humano: escaladaHumano, // NOVO
      },
    ]);

    if (error) {
      console.error("[ERRO SUPABASE] Erro ao salvar mensagem:", error);
    } else {
      console.log(`[SUPABASE] Mensagem ${tipoMensagem} salva com sucesso`);
    }
  } catch (error) {
    console.error("[ERRO SUPABASE] Erro na conexão:", error.message);
  }
}

// Função para buscar histórico do usuário
async function buscarHistoricoUsuario(userTexto) {
  try {
    const { data: historico, error } = await supabase
      .from("mensagens")
      .select("mensagem, tempo, tipo_mensagem")
      .eq("user_texto", userTexto)
      .order("tempo", { ascending: false })
      .limit(10); // Busca as últimas 10 mensagens

    if (error) {
      console.error("[ERRO SUPABASE] Erro ao buscar histórico:", error);
      return "";
    }

    if (historico && historico.length > 0) {
      // Filtra apenas mensagens recebidas (do cliente) para contexto
      const mensagensCliente = historico
        .filter((m) => m.tipo_mensagem === "recebida")
        .slice(0, 5); // Pega as 5 mais recentes

      if (mensagensCliente.length > 0) {
        const historicoTexto =
          "Histórico das últimas mensagens do cliente (da mais recente para a mais antiga):\n" +
          mensagensCliente
            .map((m, i) => `${mensagensCliente.length - i}. ${m.mensagem}`)
            .reverse()
            .join("\n");

        console.log(
          `[SUPABASE] Histórico recuperado: ${mensagensCliente.length} mensagens`
        );
        return historicoTexto;
      }
    }

    return "";
  } catch (error) {
    console.error("[ERRO SUPABASE] Erro na busca do histórico:", error.message);
    return "";
  }
}

// Função para obter resposta da Inteligência Artificial com histórico
async function obterRespostaDaIA(mensagemUsuario, historicoUsuario = "") {
  if (
    !OPENROUTER_API_KEY ||
    OPENROUTER_API_KEY === "SUA_NOVA_CHAVE_DA_OPENROUTER_AQUI"
  ) {
    console.log(
      "[AVISO IA] Chave da OpenRouter não configurada. A IA está desativada."
    );
    return "Desculpe, meu sistema de inteligência artificial está temporariamente offline. Por favor, escolha uma das opções do menu.";
  }

  try {
    // Monta o contexto com histórico se disponível
    let contextoCompleto = AI_SYSTEM_PROMPT;
    if (historicoUsuario) {
      contextoCompleto += `\n\n## HISTÓRICO DO CLIENTE:\n${historicoUsuario}`;
    }

    const completion = await openAiClient.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: contextoCompleto },
        { role: "user", content: mensagemUsuario },
      ],
      temperature: 0.5, // Menor para respostas mais focadas e menos criativas
      top_p: 0.9, // Limita a seleção de tokens aos mais prováveis
      max_tokens: 150, // Limita o tamanho máximo da resposta. Ajuste conforme necessário.
      frequency_penalty: 0.3, // Reduz a chance de repetir palavras
      presence_penalty: 0.3, // Reduz a chance de repetir tópicos/ideias
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error(
      "[ERRO IA] Não foi possível obter resposta da OpenRouter:",
      error.message
    );
    return "Tive um problema para processar sua pergunta. Por favor, tente novamente ou escolha uma das opções do menu.";
  }
}

// --- LÓGICA PRINCIPAL DO CHATBOT ---

client.on("message", async (msg) => {
  // Garante que o bot não responda em grupos
  if (msg.from.endsWith("@g.us")) {
    return;
  }

  if (!isWhatsAppBotActive) {
    console.log(
      `[WHATSAPP] Bot desativado. Ignorando mensagem de ${msg.from}.`
    );
    // Opcional: Você pode enviar uma mensagem informando que o bot está desativado
    // await client.sendMessage(msg.from, "Olá! O bot está temporariamente desativado para manutenção. Por favor, tente novamente mais tarde.");
    return; // Não processa a mensagem se o bot estiver desativado
  }

  const chat = await msg.getChat();
  const textoRecebido = msg.body.trim();
  const textoRecebidoLower = textoRecebido.toLowerCase();
  const userId = msg.from;

  // Obter nome do contato
  const contact = await msg.getContact();
  const nomeUsuario = contact.pushname
    ? contact.pushname.split(" ")[0]
    : "cliente";

  let intencaoDetectada = null; // Variável para armazenar a intenção
  let foiEscaladaParaHumano = false; // Variável para marcar a escalada

  try {
    // VERIFICA SE É A PRIMEIRA INTERAÇÃO DO USUÁRIO OU COMANDOS DE REINÍCIO
    if (
      !sessoesUsuarios.has(userId) ||
      textoRecebidoLower.match(
        /^(oi|olá|ola|menu|começar|inicio|dia|tarde|noite|boa)$/i
      )
    ) {
      sessoesUsuarios.set(userId, true);
      intencaoDetectada = "MENU_PRINCIPAL"; // Marque a intenção como menu principal

      const saudacaoCompleta = `Olá, ${nomeUsuario}! Sou o Cadu, assistente virtual da *${NOME_AUTOESCOLA}*. Como posso te ajudar hoje?\n\nPor favor, digite o número da opção desejada ou faça uma pergunta:\n\n*1* - Categorias de Habilitação 🚗\n*2* - Preços e Pacotes 💰\n*3* - Horários das Aulas ⏰\n*4* - Falar com um atendente humano 🧑‍💼`; // Notei que 3 e 4 estão trocados no seu menu, ajustei para 4 opções

      await enviarMensagemComTipagem(chat, saudacaoCompleta);

      await salvarMensagemSupabase(
        userId,
        saudacaoCompleta,
        "enviada",
        contact.pushname,
        intencaoDetectada // Salva a intenção
      );
      // Nenhuma mensagem recebida ainda, então não salvamos com intenção aqui.
      // A intenção da MENSAGEM RECEBIDA será definida abaixo.
      await salvarMensagemSupabase(
        userId,
        textoRecebido,
        "recebida",
        contact.pushname,
        intencaoDetectada // Salva a intenção da mensagem que acionou o menu
      );
      return;
    }

    let respostaEnviada = "";

    // PROCESSA OPÇÕES DO MENU
    if (textoRecebidoLower === "1") {
      respostaEnviada = respostas.opcao1;
      intencaoDetectada = "CATEGORIAS";
      await enviarMensagemComTipagem(chat, respostaEnviada);
    } else if (textoRecebidoLower === "2") {
      respostaEnviada = respostas.opcao2;
      intencaoDetectada = "PRECOS_PACOTES";
      await enviarMensagemComTipagem(chat, respostaEnviada);
    } else if (textoRecebidoLower === "3") {
      // Ajustei o número aqui se o seu menu foi ajustado acima
      respostaEnviada = respostas.opcao3;
      intencaoDetectada = "DOCUMENTOS"; // Se for a opção 3 original, era documentos
      await enviarMensagemComTipagem(chat, respostaEnviada);
    } else if (textoRecebidoLower === "4") {
      // Ajustei o número aqui se o seu menu foi ajustado acima
      respostaEnviada = respostas.opcao4;
      intencaoDetectada = "HORARIOS_AULAS"; // Se for a opção 4 original, era horários
      await enviarMensagemComTipagem(chat, respostaEnviada);
    } else if (textoRecebidoLower === "5") {
      respostaEnviada = respostas.falarComHumano;
      intencaoDetectada = "FALAR_HUMANO";
      foiEscaladaParaHumano = true; // Marca como escalada!
      await enviarMensagemComTipagem(chat, respostaEnviada);
      await notificarAtendentePorTelegram(contact.pushname, contact.id.user);
    } else {
      // ACIONA A IA PARA OUTRAS MENSAGENS COM HISTÓRICO
      console.log(`[IA] Mensagem recebida para IA: "${textoRecebido}"`);
      await chat.sendStateTyping();

      const historicoUsuario = await buscarHistoricoUsuario(userId);
      const respostaIA = await obterRespostaDaIA(
        textoRecebido,
        historicoUsuario
      );
      await client.sendMessage(msg.from, respostaIA);
      respostaEnviada = respostaIA;
      intencaoDetectada = "IA_GERAL"; // Intenção para mensagens tratadas pela IA
    }

    // Salvar mensagem recebida *antes* da resposta ser enviada (com a intenção detectada)
    // Fiz a correção aqui. A mensagem recebida deve ser salva com a intenção detectada por último.
    // A primeira chamada de salvarMensagemSupabase dentro do if(!sessoesUsuarios.has...)
    // já cuida da mensagem recebida que acionou o menu, então essa de baixo não precisa mais
    // ser a primeira coisa no try. Ela é a *primeira* pra QUALQUER mensagem.

    // NOVO: Salvar mensagem recebida no Supabase com intenção e flag de escalada
    // Se a mensagem inicial já foi salva no bloco de saudação, não salva de novo.
    // Caso contrário, salva a mensagem recebida aqui com a intenção.
    if (
      !textoRecebidoLower.match(
        /^(oi|olá|ola|menu|começar|inicio|dia|tarde|noite|boa)$/i
      )
    ) {
      await salvarMensagemSupabase(
        userId,
        textoRecebido,
        "recebida",
        contact.pushname,
        intencaoDetectada, // Salva a intenção
        foiEscaladaParaHumano // Salva a flag de escalada
      );
    }

    // NOVO: Salvar resposta enviada no Supabase (para todas as respostas)
    if (respostaEnviada) {
      await salvarMensagemSupabase(
        userId,
        respostaEnviada,
        "enviada",
        contact.pushname,
        intencaoDetectada // A resposta enviada pode ter a mesma intenção da pergunta que a gerou
      );
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    const mensagemErro =
      "Ops, tive um probleminha técnico! Digite *5* para falar com um atendente ou tente novamente em alguns segundos. 😅";
    await client.sendMessage(msg.from, mensagemErro);

    // Salvar erro também
    await salvarMensagemSupabase(
      userId,
      mensagemErro,
      "enviada",
      contact.pushname,
      "ERRO_SISTEMA", // Intenção para erros do sistema
      false // Não foi escalada por erro
    );
    // Salva a mensagem recebida que causou o erro com a intenção 'ERRO_SISTEMA'
    await salvarMensagemSupabase(
      userId,
      textoRecebido,
      "recebida",
      contact.pushname,
      "ERRO_SISTEMA", // A intenção é erro do sistema
      false // Não foi escalada diretamente
    );
  }
});

// Limpar sessões antigas periodicamente (a cada 24 horas)
setInterval(() => {
  if (sessoesUsuarios.size > 0) {
    console.log(
      `[LIMPEZA] Limpando ${sessoesUsuarios.size} sessões antigas...`
    );
    sessoesUsuarios.clear();
  }
}, 24 * 60 * 60 * 1000); // 24 horas

// --- RELATÓRIO SIMPLES PARA TELEGRAM ---

async function gerarRelatorioCompleto() {
  try {
    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Consulta para mensagens recebidas, incluindo intenção e escalada_humano
    const { data: mensagensRecebidas, error: erroMensagens } = await supabase
      .from("mensagens")
      .select("user_texto, nome_contato, intencao, escalada_humano, tempo") // Inclua as novas colunas
      .eq("tipo_mensagem", "recebida")
      .gte("tempo", umDiaAtras);

    if (erroMensagens) {
      console.error(
        "[ERRO RELATÓRIO] Erro ao buscar dados do Supabase:",
        erroMensagens.message
      );
      await axios.post(urlApiTelegram, {
        chat_id: TELEGRAM_CHAT_ID,
        text: `⚠️ Erro ao gerar relatório (Supabase): ${erroMensagens.message}`,
        parse_mode: "Markdown",
      });
      return;
    }

    let mensagemRelatorio = "";
    if (!mensagensRecebidas || mensagensRecebidas.length === 0) {
      mensagemRelatorio =
        "📊 *Relatório das últimas 24h*\n\nNenhuma mensagem recebida no período.";
      console.log("[RELATÓRIO] Nenhuma mensagem encontrada nas últimas 24h.");
    } else {
      const totalMensagens = mensagensRecebidas.length;
      const usuariosUnicos = [
        ...new Set(mensagensRecebidas.map((m) => m.user_texto)),
      ];
      const numUsuariosUnicos = usuariosUnicos.length;

      const mediaMensagensPorUsuario = (
        totalMensagens / numUsuariosUnicos
      ).toFixed(1);

      // --- Contagem de Mensagens por Intenção ---
      const contagemIntencoes = mensagensRecebidas.reduce((acc, msg) => {
        const intencao = msg.intencao || "NÃO_IDENTIFICADA"; // Se a intenção não estiver preenchida
        acc[intencao] = (acc[intencao] || 0) + 1;
        return acc;
      }, {});

      const topIntencoes = Object.entries(contagemIntencoes)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5);

      let intencoesTexto = "\n*Principais Tópicos de Conversa:*\n";
      topIntencoes.forEach(([intencao, count], index) => {
        intencoesTexto += `${index + 1}. ${intencao.replace(
          /_/g,
          " "
        )}: ${count} vezes\n`; // Formata a intenção
      });

      // --- Contagem de Escalas para Humano ---
      const totalEscalasHumano = mensagensRecebidas.filter(
        (m) => m.escalada_humano
      ).length;

      // --- Novos Contatos vs. Contatos Recorrentes ---
      // CHAMADA À NOVA FUNÇÃO RPC
      const {
        data: primeiraInteracaoDosUsuariosDoPeriodo,
        error: erroPrimeiraInteracao,
      } = await supabase.rpc("get_first_interaction_times", {
        user_texts: usuariosUnicos,
      }); // Passa o array de user_texts

      if (erroPrimeiraInteracao) {
        console.error(
          "[ERRO RELATÓRIO] Erro ao buscar primeira interação dos usuários via RPC:",
          erroPrimeiraInteracao.message
        );
      } else {
        let novosContatos = 0;
        let contatosRecorrentes = 0;

        primeiraInteracaoDosUsuariosDoPeriodo.forEach((user) => {
          const primeiraInteracaoTempo = new Date(
            user.primeiro_tempo
          ).getTime();
          const umDiaAtrasMs = new Date(umDiaAtras).getTime();

          if (primeiraInteracaoTempo >= umDiaAtrasMs) {
            // Se a primeira interação *total* desse usuário foi dentro das últimas 24h
            novosContatos++;
          } else {
            // Se a primeira interação *total* desse usuário foi antes das últimas 24h
            contatosRecorrentes++;
          }
        });

        mensagemRelatorio =
          `📊 *Relatório das últimas 24h*\n\n` +
          `Total de mensagens recebidas: *${totalMensagens}*\n` +
          `Usuários únicos que enviaram mensagem: *${numUsuariosUnicos}*\n` +
          `Média de mensagens por usuário: *${mediaMensagensPorUsuario}*\n\n` +
          `✅ Conversas escaladas para humano: *${totalEscalasHumano}*\n\n` +
          `🆕 Novos contatos no período: *${novosContatos}*\n` +
          `🔁 Contatos recorrentes no período: *${contatosRecorrentes}*\n\n` +
          intencoesTexto; // Adiciona o texto das intenções
      }

      console.log(
        `[RELATÓRIO] ${totalMensagens} mensagens de ${numUsuariosUnicos} usuários únicos`
      );
    }

    // Enviar a mensagem para o Telegram
    if (mensagemRelatorio) {
      await axios.post(urlApiTelegram, {
        chat_id: TELEGRAM_CHAT_ID,
        text: mensagemRelatorio,
        parse_mode: "Markdown",
      });
      console.log("[RELATÓRIO] Relatório enviado para o Telegram.");
    }
  } catch (error) {
    console.error("[ERRO RELATÓRIO]", error.message);
    try {
      await axios.post(urlApiTelegram, {
        chat_id: TELEGRAM_CHAT_ID,
        text: `⚠️ *Erro crítico ao gerar/enviar relatório*: ${error.message}`,
        parse_mode: "Markdown",
      });
    } catch (telegramError) {
      console.error(
        "[ERRO RELATÓRIO] Falha ao enviar erro para o Telegram:",
        telegramError.message
      );
    }
  }
}

// Mantenha o setInterval com a nova função
setInterval(gerarRelatorioCompleto, 24 * 60 * 60 * 1000);
