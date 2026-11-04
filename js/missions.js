/* Conexão para Todos — missions.js
 * As 10 missões (dados) e o motor que executa cada passo: conversa, escolha, ordenar, achar problemas,
 * planejar, coletar objetos e postos de trabalho cooperativos. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});

  const list = [
    {
      id: 'saude', title: 'Consulta sem vergonha', place: 'Posto de Saúde', area: 'posto', npc: 'marta',
      blurb: 'Dona Marta precisa marcar uma consulta, mas o posto agora usa um aplicativo.',
      learn: 'Muita gente tem dúvida com aplicativos de serviços públicos. Ensinar sem humilhar e manter mais de um canal de atendimento (app, balcão e telefone) garante o direito à saúde para todos.',
      idle: 'Já marquei outra consulta sozinha, sabia? Obrigada por tudo, meu bem!',
      steps: [
        { t: 'talk', lines: [
          ['marta', 'Bom dia! A moça do posto disse que a consulta com a cardiologista agora só se marca pelo aplicativo. Eu nunca usei isso... tenho vergonha de pedir ajuda.'],
          ['me', 'Sem vergonha nenhuma, Dona Marta. Aplicativo novo confunde muita gente. Vamos resolver juntas.'] ] },
        { t: 'choice', who: 'marta', prompt: 'Dona Marta olha para você, esperançosa. Como você vai ajudar?',
          hint: 'Ajudar de verdade é fazer a pessoa ganhar autonomia, sem fazer com que ela se sinta incapaz.',
          options: [
            { text: 'Dizer: “É fácil, é só baixar e clicar. A senhora aprende sozinha.”', tier: 'bad', fx: { co: -2 }, why: 'Dizer que é “fácil” faz a pessoa se sentir incapaz por não saber. Dona Marta ficou calada e disse que volta outro dia.' },
            { text: 'Marcar a consulta no celular dela e ir embora.', tier: 'ok', fx: { ac: 3, co: 1 }, why: 'A consulta foi marcada hoje, mas na próxima vez ela vai depender de alguém de novo. Ajuda que não ensina resolve só o problema de agora.' },
            { text: 'Sentar ao lado, explicar passo a passo e deixar ela tocar na tela.', tier: 'best', fx: { co: 8, ab: 2 }, why: 'Ela aprendeu fazendo, no ritmo dela, e saiu mais confiante. Ensinar sem humilhar cria autonomia.' } ] },
        { t: 'order', who: 'marta', title: 'Passo a passo da consulta', prompt: 'Monte, na ordem certa, o caminho que Dona Marta vai seguir no aplicativo.',
          items: ['Abrir o aplicativo Saúde Conecta e entrar com o CPF', 'Tocar em “Marcar consulta”', 'Escolher a especialidade: Cardiologia', 'Escolher o dia e o horário', 'Confirmar e guardar o comprovante'],
          hint: 'Pense em como se faz com papel: primeiro a pessoa se identifica, depois diz o que quer, depois escolhe a data.',
          fx: { co: 6, ac: 2 }, done: 'Consulta marcada com as próprias mãos! “Agora eu sei fazer sozinha”, disse Dona Marta.' },
        { t: 'choice', who: 'me', prompt: 'O aplicativo só funciona em celular com internet. E quem não tem celular ou sinal? O que sugerir ao posto?',
          hint: 'Pense em oferecer mais de um caminho para a mesma consulta.',
          options: [
            { text: 'Deixar só o aplicativo: quem quiser que se vire.', tier: 'bad', fx: { ab: -3, ac: -2 }, why: 'Um serviço de saúde só digital deixa de fora idosos, pessoas sem celular e quem tem deficiência. O que é conveniente para uns exclui outros.' },
            { text: 'Colocar um computador de uso livre no posto.', tier: 'ok', fx: { ac: 5, ab: 2 }, why: 'Ajuda quem não tem aparelho, mas ainda exige saber usar o sistema e depende da internet do posto.' },
            { text: 'Manter também a marcação no balcão e por telefone, ao lado do aplicativo.', tier: 'best', fx: { ab: 8, ac: 4 }, why: 'Com mais de um caminho, ninguém fica de fora: o app ajuda quem pode usar e o balcão atende quem não pode ou não quer.' } ] }
      ],
      outro: [['marta', 'Muito obrigada, meu bem! Vou contar para as vizinhas que dá para aprender sem passar vergonha.']]
    },
    {
      id: 'barreiras', title: 'Portal difícil de usar', place: 'Prefeitura', area: 'prefeitura', npc: 'beto',
      blurb: 'O portal de serviços da Prefeitura tem barreiras que afastam muita gente.',
      learn: 'Barreiras como contraste baixo, botões pequenos, imagens sem descrição, CAPTCHA só visual e linguagem difícil afetam pessoas com deficiência, idosos e quem tem pouca experiência. Testar com pessoas reais evita esses problemas.',
      idle: 'A equipe já está testando o portal com os moradores. Valeu pela ajuda!',
      steps: [
        { t: 'talk', lines: [
          ['beto', 'Oi! O portal da Prefeitura recebe pedidos de segunda via e reclamações, mas muita gente desiste no meio. Pode me ajudar a achar os problemas?'],
          ['me', 'Claro, Beto. Vamos olhar a tela como se fosse a primeira vez de quem usa.'] ] },
        { t: 'spot', who: 'beto', kind: 'web', url: 'portal.conecta.gov/segunda-via', title: 'Barreiras no portal',
          prompt: 'Toque nos trechos da tela que atrapalham o uso. Depois, verifique.',
          hint: 'Procure problemas de cor, de tamanho, de descrição de imagens, de alternativas e de linguagem.',
          elements: [
            { id: 'e1', cls: 'e-title', html: '<span class="faint">Solicite aqui a sua 2ª via</span>', flaw: true, why: 'Texto cinza claro sobre fundo branco: quem enxerga pouco (ou usa o celular no sol) não consegue ler. Falta contraste.' },
            { id: 'e2', cls: 'e-tiny', html: '<span class="tiny">Enviar</span>', flaw: true, why: 'O botão “Enviar” é minúsculo: difícil de tocar para quem tem tremor, dedos grandes ou pouca precisão.' },
            { id: 'e3', cls: 'e-img', html: '<span class="imgbox">[ foto do formulário ]</span><small>(sem texto alternativo)</small>', flaw: true, why: 'Imagem sem descrição em texto: o leitor de tela não consegue explicar a imagem a quem não enxerga.' },
            { id: 'e4', cls: 'e-cap', html: 'Prove que você é humano: digite as letras da imagem (sem opção de áudio)', flaw: true, why: 'CAPTCHA só visual bloqueia pessoas cegas ou com baixa visão. É preciso oferecer alternativa, como áudio.' },
            { id: 'e5', cls: 'e-txt', html: 'Protocole o requerimento ensejando a tramitação regular do feito.', flaw: true, why: 'Linguagem cheia de termos difíceis afasta quem tem pouca prática de leitura. Frases curtas e palavras simples ajudam todo mundo.' },
            { id: 'e6', cls: 'e-good', html: '<b>Falar com uma atendente</b> (botão grande, texto escuro)', flaw: false, why: 'Esse botão é grande, tem bom contraste e dá uma saída humana para quem trava. Bom exemplo!' },
            { id: 'e7', cls: 'e-good', html: 'Nome completo: [______________] (rótulo claro acima do campo)', flaw: false, why: 'Campo com rótulo claro e bastante espaço para digitar. Está bom.' } ],
          fx: { ab: 14, co: 4 }, after: 'Esses são os tipos de barreira que mais aparecem em serviços digitais.' },
        { t: 'choice', who: 'beto', prompt: 'Agora, quem deve consertar o portal e como garantir que ele fique bom para todos?',
          hint: 'Quem entende o problema melhor é quem vive com ele: teste com pessoas diferentes, antes e depois de publicar.',
          options: [
            { text: 'Deixar como está: quem não consegue usar pede ajuda a um parente.', tier: 'bad', fx: { ab: -3, ac: -1 }, why: 'Transformar a exclusão em “problema da família” tira a responsabilidade de quem criou o serviço. O portal é que precisa mudar.' },
            { text: 'Só os desenvolvedores revisam o código e corrigem o que acharem necessário.', tier: 'ok', fx: { ab: 3 }, why: 'Ajuda, mas sem ouvir quem tem dificuldades a equipe pode corrigir o que não era o problema e deixar passar o que importa.' },
            { text: 'Prefeitura, desenvolvedores e moradores (incluindo pessoas com deficiência) testam juntos e corrigem em conjunto.', tier: 'best', fx: { ab: 8, co: 3, ac: 2 }, why: 'Quando quem usa participa do teste, os problemas reais aparecem. Acessibilidade não é um “extra”: é parte do projeto desde o início.' } ] }
      ],
      outro: [['beto', 'Vou levar a lista para a equipe e marcar uma sessão de testes com moradores. Obrigado!']]
    },
    {
      id: 'estudo', title: 'Estudar sem internet estável', place: 'Escola Municipal', area: 'escola', npc: 'thiago',
      blurb: 'Thiago precisa assistir às aulas, mas o sinal de casa cai toda hora e ele só tem o celular da mãe.',
      learn: 'Sem internet estável e sem aparelho, o estudante perde aulas por motivos que não são dele. Pontos de Wi-Fi comunitários, empréstimo de aparelhos e material para estudar offline reduzem a desigualdade de acesso.',
      idle: 'Agora eu tenho um plano. Até recomendei o Wi-Fi da praça para os meus colegas!',
      steps: [
        { t: 'talk', lines: [
          ['thiago', 'Tenho aulas em vídeo para assistir, mas a internet de casa cai o tempo todo e só tenho o celular da minha mãe. Já perdi duas atividades...'],
          ['me', 'Isso não é falta de esforço, Thiago: é falta de acesso. Vamos montar um plano!'] ] },
        { t: 'collect', ids: ['tablet', 'wifi', 'caderno'], objective: 'Encontre os 3 itens brilhantes pela cidade',
          intro: [
            ['thiago', 'Preciso de três coisas: um aparelho para estudar, um lugar com Wi-Fi para baixar as aulas e um material para ler quando não tiver internet.'],
            ['me', 'Vamos procurar pela cidade! Os itens brilham: um no Centro Comunitário, um na Praça e um na Biblioteca.'] ],
          remind: 'Procure os brilhos pela cidade: Centro Comunitário, Praça Central e Biblioteca.',
          itemFx: {
            tablet: { fx: { ac: 2 }, msg: 'Tablet emprestado pelo Centro Comunitário: aparelho garantido!' },
            wifi: { fx: { ac: 2 }, msg: 'Wi-Fi gratuito da praça: dá para baixar as aulas!' },
            caderno: { fx: { ac: 2, co: 1 }, msg: 'Resumo impresso da biblioteca: estudo possível sem internet!' } } },
        { t: 'choice', who: 'thiago', prompt: 'Com tudo em mãos, como o Thiago deve estudar sem depender do sinal de casa?',
          hint: 'Use a internet de graça quando ela estiver disponível e estude depois, onde não precisa dela.',
          options: [
            { text: 'Dizer ao Thiago para esperar a internet de casa melhorar.', tier: 'bad', fx: { ac: -3, co: -1 }, why: 'Esperar significa perder aulas e atividades. Quando a solução é “aguarde”, o estudante paga o preço da falta de infraestrutura.' },
            { text: 'Pedir à mãe para comprar um pacote de dados maior.', tier: 'ok', fx: { ac: 3 }, why: 'Pode funcionar, mas custa dinheiro e nem toda família consegue pagar. Uma solução coletiva alcança mais gente.' },
            { text: 'Baixar as aulas no Wi-Fi da praça ou da biblioteca e estudar offline em casa, com o resumo impresso.', tier: 'best', fx: { ac: 8, co: 4 }, why: 'Ele usa a rede comunitária para baixar e estuda sem pressa em casa. Isso transforma o Wi-Fi coletivo em acesso de verdade.' } ] }
      ],
      outro: [['thiago', 'Valeu, equipe! Agora eu consigo estudar sem perder aula.']]
    },
    {
      id: 'golpe', title: 'Mensagem suspeita', place: 'Praça Central', area: 'praca', npc: 'raimundo',
      blurb: 'Seu Raimundo recebeu uma mensagem que promete prêmio e pede dados do banco.',
      learn: 'Golpes digitais criam pressa e medo para roubar dados. Desconfiar de prêmios inesperados, não clicar em links desconhecidos, nunca passar senha e usar senhas diferentes protege todo mundo, e conversar sobre isso em comunidade protege ainda mais.',
      idle: 'Agora eu desconfio de prêmio, de pressa e de quem pede senha!',
      steps: [
        { t: 'talk', lines: [
          ['raimundo', 'Recebi uma mensagem dizendo que ganhei um prêmio e que preciso clicar depressa. Será que é verdade? Quase cliquei...'],
          ['me', 'Fez bem em parar para perguntar, Seu Raimundo. Vamos olhar a mensagem juntos.'] ] },
        { t: 'spot', who: 'raimundo', kind: 'phone', sender: 'Número desconhecido', title: 'Sinais de golpe',
          prompt: 'Toque nos trechos da mensagem que são sinais de golpe. Depois, verifique.',
          hint: 'Golpistas usam prêmios, pressa, links estranhos e pedidos de dados pessoais.',
          elements: [
            { id: 'g1', cls: 'm-sender', html: '<b>Remetente:</b> número desconhecido (+55 00 00000-0000)', flaw: true, why: 'Mensagem de número desconhecido dizendo ser de uma empresa ou banco merece desconfiança.' },
            { id: 'g2', cls: 'm-bubble', html: 'PARABÉNS!!! Você ganhou R$ 5.000 no sorteio!', flaw: true, why: 'Prêmio de sorteio em que você nunca participou é isca clássica de golpe.' },
            { id: 'g3', cls: 'm-bubble', html: 'Clique AGORA ou perde o prêmio em 10 minutos!', flaw: true, why: 'Pressa é a arma do golpista: ele quer que você aja antes de pensar.' },
            { id: 'g4', cls: 'm-bubble', html: '<u>bit.ly/premio-ja</u>', flaw: true, why: 'Link encurtado esconde o endereço verdadeiro. Não clique em links desconhecidos.' },
            { id: 'g5', cls: 'm-bubble', html: 'Para receber, envie seu CPF e a senha do banco.', flaw: true, why: 'Nenhum banco ou órgão pede senha por mensagem. Quem pede está tentando roubar sua conta.' },
            { id: 'g6', cls: 'm-time', html: 'Hoje, 14:32', flaw: false, why: 'A hora da mensagem não indica golpe nem segurança. Procure sinais no conteúdo.' } ],
          fx: { co: 10 }, after: 'Quanto mais cedo a gente reconhece os sinais, menos golpes dão certo.' },
        { t: 'choice', who: 'raimundo', prompt: 'O que o Seu Raimundo deve fazer com essa mensagem?',
          hint: 'Proteja os dados primeiro; depois avise quem também pode ser alvo.',
          options: [
            { text: 'Responder pedindo mais informações sobre o prêmio.', tier: 'bad', fx: { co: -3 }, why: 'Responder confirma que o número está ativo e pode atrair mais tentativas de golpe. O melhor é não interagir.' },
            { text: 'Apagar a mensagem e esquecer o assunto.', tier: 'ok', fx: { co: 3 }, why: 'Ele se protegeu, mas outras pessoas podem receber a mesma mensagem. Compartilhar o alerta ajuda toda a vizinhança.' },
            { text: 'Não clicar, apagar, denunciar como spam e avisar a família e os vizinhos.', tier: 'best', fx: { co: 6, ac: 3 }, why: 'Denunciar e avisar a comunidade protege outras pessoas. Confiar nos canais oficiais faz mais gente querer usar serviços digitais.' } ] },
        { t: 'choice', who: 'raimundo', prompt: 'Seu Raimundo confessa: “Uso a senha 1234 para tudo.” Qual dica protege mais?',
          hint: 'Senhas fáceis são as primeiras que os golpistas tentam, e repetir a mesma abre todas as portas de uma vez.',
          options: [
            { text: 'Compartilhar a senha com um vizinho de confiança.', tier: 'bad', fx: { co: -3 }, why: 'Senha é pessoal. Se ele precisar de ajuda, peça que alguém ensine, sem entregar a senha a ninguém.' },
            { text: 'Guardar todas as senhas em uma nota solta no celular, sem proteção.', tier: 'ok', fx: { co: 1 }, why: 'Pelo menos não são mais iguais, mas uma nota aberta no celular é fácil de ser lida por quem pegar o aparelho.' },
            { text: 'Usar senhas longas e diferentes para cada serviço (anotadas em um caderno guardado em casa) e ativar a verificação em duas etapas.', tier: 'best', fx: { co: 6 }, why: 'Senha longa e diferente em cada serviço limita o estrago se uma delas vazar. A verificação em duas etapas protege ainda mais.' } ] }
      ],
      outro: [['raimundo', 'Agora eu sei: desconfio de prêmio, de pressa e de quem pede senha. Vou ensinar o pessoal do dominó!']]
    },
    {
      id: 'oficina', title: 'Oficina de habilidades digitais', place: 'Centro Comunitário', area: 'centro', npc: 'lucia',
      blurb: 'Tia Lúcia quer organizar uma oficina para a vizinhança, mas há horários, custos e pessoas diferentes.',
      learn: 'Uma oficina só funciona quando considera horário, espaço, formato e quem vai participar. O que é conveniente para uns pode excluir outros: planejar com a comunidade evita deixar gente de fora.',
      idle: 'A oficina deu tão certo que vai virar mensal! Você sempre tem lugar aqui.',
      steps: [
        { t: 'talk', lines: [
          ['lucia', 'Vamos organizar uma oficina de habilidades digitais para o bairro! Mas o nosso planejamento é limitado: tempo e voluntários não dão para tudo.'],
          ['me', 'Então precisamos escolher bem. Quem vai participar? Trabalhadores, idosos, pessoas com deficiência...'] ] },
        { t: 'plan', who: 'lucia', title: 'Planejando a oficina', budget: 6, min: 3,
          prompt: 'Monte a oficina escolhendo ações sem passar do planejamento disponível. Pense em quem pode participar e em quem pode ficar de fora.',
          hint: 'Pense em horários, no espaço físico e no jeito de ensinar. Quem trabalha de dia, quem usa cadeira de rodas e quem tem pouca leitura também precisa participar.',
          options: [
            { id: 'noite', text: 'Aulas à noite, depois do trabalho', cost: 1, fx: { ac: 3, co: 2 }, note: 'Horário à noite permite que quem trabalha de dia participe.' },
            { id: 'dia', text: 'Aulas só em horário comercial', cost: 1, fx: { ac: -2, co: 1 }, note: 'Só de dia, quem trabalha fica de fora. Conveniente para alguns, excludente para outros.' },
            { id: 'rampa', text: 'Sala com rampa, cadeiras confortáveis e vídeos com legenda', cost: 2, fx: { ab: 8 }, note: 'Espaço acessível e vídeos legendados permitem a participação de pessoas com deficiência.' },
            { id: 'apostila', text: 'Apostila impressa em letras grandes e linguagem simples', cost: 1, fx: { ab: 3, co: 3 }, note: 'Material impresso e simples ajuda quem enxerga pouco ou tem pouca prática de leitura.' },
            { id: 'monitores', text: 'Monitores voluntários ensinando com paciência, um para cada pequeno grupo', cost: 2, fx: { co: 8, ac: 1 }, note: 'Grupos pequenos e apoio individual aumentam a confiança de quem está começando.' },
            { id: 'maratona', text: 'Curso de oito horas em tela, sem pausas', cost: 1, fx: { co: -2, ab: -2 }, note: 'Muito conteúdo de uma vez cansa e afasta quem está começando.' },
            { id: 'computadores', text: 'Computadores e tablets emprestados para praticar', cost: 2, fx: { ac: 6, co: 2 }, note: 'Praticar com um aparelho emprestado resolve a falta de equipamento em casa.' },
            { id: 'seguranca', text: 'Aula de segurança: golpes e senhas', cost: 1, fx: { co: 4 }, note: 'Aprender a se proteger dá confiança para usar serviços digitais.' } ],
          synergy: [{ need: ['rampa', 'monitores'], fx: { ab: 3 }, text: 'Monitores atentos às necessidades de cada pessoa fazem a rampa valer ainda mais: acessibilidade é espaço e atitude.' }] }
      ],
      outro: [['lucia', 'A oficina lotou! Gente de todas as idades aprendendo junta. Isso é cidade conectada.']]
    },
    {
      id: 'padaria', title: 'Padaria na internet', place: 'Padaria Pão & Prosa', area: 'padaria', npc: 'neide',
      blurb: 'Dona Neide quer vender pelo celular sem cair em golpes e sem excluir quem não usa tecnologia.',
      learn: 'Presença digital simples e segura ajuda pequenos negócios. Pagamentos precisam de conferência, e canais alternativos (telefone, balcão) mantêm clientes que não usam celular.',
      idle: 'As encomendas não param! E o telefone continua tocando também.',
      steps: [
        { t: 'talk', lines: [
          ['neide', 'Meus clientes pedem para encomendar pelo celular, mas eu só sei usar o telefone. Não quero cair em golpe nem gastar uma fortuna.'],
          ['me', 'Dá para começar simples e seguro, Dona Neide. Vamos por partes.'] ] },
        { t: 'choice', who: 'neide', prompt: 'Primeiro: como a padaria vai aparecer na internet?',
          hint: 'Quanto mais simples e leve, mais gente consegue abrir. Imagens precisam de texto para quem usa leitor de tela.',
          options: [
            { text: 'Fazer um site pesado, cheio de animações e fotos enormes.', tier: 'bad', fx: { ac: -2, ab: -3 }, why: 'Site pesado trava em celular simples e internet fraca, e animações atrapalham quem usa leitor de tela. Bonito para alguns, inacessível para outros.' },
            { text: 'Contratar alguém para fazer tudo e entregar pronto, sem explicar nada.', tier: 'ok', fx: { ac: 4 }, why: 'Resolve rápido, mas Dona Neide não consegue atualizar sozinha e fica dependente. Participar da criação dá autonomia.' },
            { text: 'Criar um perfil comercial simples com cardápio, horário e WhatsApp, e fotos com descrição em texto.', tier: 'best', fx: { ac: 6, ab: 4, co: 2 }, why: 'Um perfil simples abre rápido em celular básico e com internet fraca. As descrições nas fotos permitem que quem não enxerga conheça o cardápio.' } ] },
        { t: 'choice', who: 'neide', prompt: 'Segundo: como receber pagamentos pelo celular com segurança?',
          hint: 'Comprovante em foto pode ser falso. O dinheiro só vale quando aparece no aplicativo do próprio banco.',
          options: [
            { text: 'Aceitar a foto do comprovante enviada pelo cliente como prova de pagamento.', tier: 'bad', fx: { co: -3 }, why: 'Comprovantes falsos são um golpe comum. Sem conferir no aplicativo do banco, Dona Neide pode entregar pão sem receber.' },
            { text: 'Aceitar só dinheiro e cartão, para não ter risco.', tier: 'ok', fx: { ac: 1 }, why: 'É seguro, mas deixa de fora clientes que preferem Pix, e a padaria perde oportunidades. Segurança não precisa significar fechar portas.' },
            { text: 'Receber por Pix com o QR Code do próprio banco e conferir o valor no aplicativo oficial antes de entregar.', tier: 'best', fx: { co: 4, ac: 2 }, why: 'Conferir no aplicativo do banco é a única prova de que o dinheiro chegou. Comprovantes em foto podem ser falsificados.' } ] },
        { t: 'choice', who: 'neide', prompt: 'Terceiro: e os clientes que não usam celular?',
          hint: 'Um bom serviço digital convive com os canais de sempre.',
          options: [
            { text: 'Atender só por celular, porque é mais moderno.', tier: 'bad', fx: { ab: -3, ac: -1 }, why: 'Modernidade não pode excluir. Quem não usa celular, muitas vezes por idade ou deficiência, perderia o direito de comprar na padaria do bairro.' },
            { text: 'Pedir que os clientes peçam a um parente que faça a encomenda pelo celular.', tier: 'ok', fx: { ac: 1 }, why: 'Funciona às vezes, mas tira a autonomia do cliente e depende da disponibilidade de outras pessoas.' },
            { text: 'Manter também o pedido por telefone e no balcão, com preços visíveis e legíveis.', tier: 'best', fx: { ab: 4, ac: 2 }, why: 'Manter canais tradicionais garante que ninguém fique de fora. O digital deve somar, não substituir quem ainda não usa.' } ] }
      ],
      outro: [['neide', 'Minhas encomendas já aumentaram! E ninguém ficou de fora. Obrigada, meus amores.']]
    },
    {
      id: 'biblioteca', title: 'Computadores para todos', place: 'Biblioteca Comunitária', area: 'biblioteca', npc: 'joana',
      blurb: 'Os computadores do pátio da biblioteca precisam servir pessoas com necessidades diferentes.',
      learn: 'Cada pessoa usa a tecnologia de um jeito. Leitores de tela, mesas ajustáveis e modos simples fazem os mesmos computadores atenderem mais gente, e a pessoa decide como quer usar.',
      idle: 'Os computadores não param! Cada pessoa usa do seu jeito.',
      steps: [
        { t: 'talk', lines: [
          ['joana', 'Os computadores do pátio são usados por muita gente, mas cada pessoa precisa de algo diferente. Pode configurar os três para quem vai usar?'],
          ['me', 'Combinado! Vamos até os computadores do pátio.'] ] },
        { t: 'stations', ids: ['pc1', 'pc2', 'pc3'], objective: 'Configure os 3 computadores do pátio da biblioteca',
          remind: 'Os três computadores ficam no pátio, logo abaixo da biblioteca. Chegue perto e aperte E.',
          mini: {
            pc1: { who: 'me', prompt: 'Computador 1: Seu Tomás enxerga pouco, mas gosta de ler as notícias. O que configurar?',
              hint: 'Pense em recursos que aumentam, contrastam e leem o texto em voz alta.',
              options: [
                { text: 'Deixar como está: ele pede ajuda a quem estiver por perto.', tier: 'bad', fx: { ab: -3 }, why: 'Obrigar alguém a depender dos outros para ler tira a autonomia dele. O computador é que precisa se adaptar.' },
                { text: 'Apenas aumentar o brilho da tela.', tier: 'ok', fx: { ab: 2 }, why: 'Ajuda um pouco, mas não resolve a leitura. Escolher recursos conversando com a pessoa é o ideal.' },
                { text: 'Ativar leitor de tela, texto ampliado e alto contraste.', tier: 'best', fx: { ab: 8 }, why: 'Seu Tomás consegue ler as notícias sozinho, no ritmo dele. É o recurso certo para a necessidade dele.' } ] },
            pc2: { who: 'me', prompt: 'Computador 2: Rita usa cadeira de rodas e quer fazer um currículo. O que ajustar?',
              hint: 'Pense no espaço, na altura da mesa e em alcançar teclado e mouse sem esforço.',
              options: [
                { text: 'Colocar o computador em um canto com um degrau na entrada.', tier: 'bad', fx: { ab: -4 }, why: 'Degrau e pouco espaço impedem a passagem. Acessibilidade precisa considerar também o caminho até o computador.' },
                { text: 'Deixar um voluntário ao lado dela o tempo todo.', tier: 'ok', fx: { ab: 2 }, why: 'Ajuda é bem-vinda quando ela pede, mas o ambiente adequado garante autonomia sem depender de alguém.' },
                { text: 'Mesa regulável com espaço livre embaixo, teclado e mouse ao alcance.', tier: 'best', fx: { ab: 7 }, why: 'Rita consegue usar o computador de forma confortável e independente. Acessibilidade começa no espaço físico.' } ] },
            pc3: { who: 'me', prompt: 'Computador 3: Dona Cida nunca usou computador e quer consultar um benefício do governo. O que preparar?',
              hint: 'Quem está começando precisa de poucos botões, claros, e de alguém para tirar dúvidas, sem pressa.',
              options: [
                { text: 'Deixar ela descobrir sozinha, sem ajuda.', tier: 'bad', fx: { co: -2, ac: -2 }, why: 'Sem apoio, o medo de errar vira desistência. Aprender precisa de ajuda gentil e de tempo.' },
                { text: 'Deixar um manual de 40 páginas ao lado do computador.', tier: 'ok', fx: { co: 1 }, why: 'Manual longo assusta mais do que ajuda. Instruções curtas e ilustradas funcionam melhor.' },
                { text: 'Modo simples com ícones grandes, atalho para serviços públicos e um voluntário de apoio por perto.', tier: 'best', fx: { co: 7, ab: 2 }, why: 'Poucos botões e ajuda humana dão confiança. Dona Cida aprende fazendo, sem se sentir cobrada.' } ] } },
          finish: { fx: { ac: 5 }, pts: 0, text: 'Os três computadores estão configurados e funcionando. A biblioteca agora atende muito mais gente.' } }
      ],
      outro: [['joana', 'Agora, quem passa por aqui encontra um computador pensado para si. Muito obrigada!']]
    },
    {
      id: 'gov', title: 'Benefício sem atravessador', place: 'Casa do Seu Zeca', area: 'casaA', npc: 'zeca',
      blurb: 'Seu Zeca precisa de uma conta gov.br para consultar o benefício e já foi abordado por quem cobra para “facilitar”.',
      learn: 'Criar a conta gov.br é gratuito. Quem cobra para “facilitar” pode ficar com documentos e senhas e causar prejuízo. Com apoio presencial, a pessoa aprende, continua dona da própria conta e protege os códigos de verificação.',
      idle: 'Consultei o meu benefício sozinho! E já avisei os vizinhos que a conta é de graça.',
      steps: [
        { t: 'talk', lines: [
          ['zeca', 'Disseram que, para consultar o meu benefício, agora preciso de uma conta gov.br. Um rapaz na feira quer R$ 80 para fazer isso por mim, mas eu mal sei mexer no celular...'],
          ['me', 'Criar a conta gov.br não custa nada, Seu Zeca. E ela é sua: o senhor precisa saber a senha e controlar tudo.'] ] },
        { t: 'choice', who: 'zeca', prompt: 'Seu Zeca pergunta: “Pago o rapaz da feira ou tento aprender?”',
          hint: 'Quem faz por você pode ficar com seus documentos e senhas. O melhor é aprender com apoio, sem pagar.',
          options: [
            { text: 'Pagar o rapaz e entregar os documentos e a senha a ele.', tier: 'bad', fx: { co: -3, ac: -1 }, why: 'A conta gov.br é gratuita. Entregar documentos e senha a um intermediário expõe Seu Zeca a fraudes, e ele perde o controle da própria conta.' },
            { text: 'Pedir a um parente de confiança que crie a conta no lugar dele.', tier: 'ok', fx: { ac: 3, co: 1 }, why: 'É mais seguro que pagar um desconhecido, mas Seu Zeca continua dependendo dos outros e pode nem saber a própria senha.' },
            { text: 'Criar a conta junto com ele, no Centro Comunitário, sem custo, com ele mesmo digitando e guardando a senha.', tier: 'best', fx: { co: 6, ac: 3 }, why: 'Sem custo e com apoio, ele aprende e continua dono da conta. Ensinar e acompanhar vale mais do que fazer por ele.' } ] },
        { t: 'order', who: 'zeca', title: 'Passo a passo da conta gov.br', prompt: 'Monte, na ordem certa, como Seu Zeca vai criar a conta.',
          items: ['Abrir o site ou aplicativo oficial gov.br (sem clicar em links de mensagens)', 'Escolher “Criar conta” e informar o CPF', 'Confirmar a identidade pelo método que o próprio gov.br oferecer', 'Criar uma senha longa que só ele conhece', 'Ativar a verificação em duas etapas e guardar a recuperação em lugar seguro'],
          hint: 'Primeiro se chega ao lugar certo, depois se diz quem é, depois se prova e, por fim, se protege.',
          fx: { co: 6, ac: 2 }, done: 'Conta criada! “Fui eu mesmo que fiz”, disse Seu Zeca, de olhos brilhando.' },
        { t: 'choice', who: 'zeca', prompt: 'Dias depois, chega uma mensagem pedindo o código que Seu Zeca recebeu por SMS “para confirmar o benefício”. O que ele deve fazer?',
          hint: 'Códigos de verificação são como a chave da porta de casa: nunca se entregam a ninguém.',
          options: [
            { text: 'Enviar o código para não perder o benefício.', tier: 'bad', fx: { co: -3, ac: -1 }, why: 'Quem tem o código entra na conta dele. Nenhum órgão pede o código de verificação por mensagem ou telefone.' },
            { text: 'Pedir a um vizinho que decida se a mensagem é verdadeira.', tier: 'ok', fx: { co: 1, ac: 1 }, why: 'Pedir ajuda é bom, mas é melhor saber a regra: código de verificação não se compartilha com ninguém.' },
            { text: 'Não enviar o código, apagar a mensagem e consultar o benefício só pelo aplicativo ou site oficial.', tier: 'best', fx: { co: 6, ac: 2 }, why: 'Ele protege a conta e confia só em canais oficiais. O bairro inteiro fica mais seguro quando ele conta o que aprendeu.' } ] },
        { t: 'choice', who: 'me', prompt: 'Seu Zeca lembra que vários vizinhos não têm celular nem internet. O que sugerir?',
          hint: 'Pense em combinar o jeito digital com atendimento presencial para quem precisar.',
          options: [
            { text: 'Dizer que, sem celular, cada um deve se virar sozinho.', tier: 'bad', fx: { ab: -3, ac: -2 }, why: 'Quem não tem celular ou internet não deixa de ter direitos. Um serviço que só funciona para quem tem aparelho exclui justamente quem mais precisa.' },
            { text: 'Pedir que cada vizinho peça ajuda a um parente que tenha celular.', tier: 'ok', fx: { ab: 1, ac: 2 }, why: 'Ajuda quando há alguém por perto, mas depende da disponibilidade dos outros e tira a autonomia de quem precisa do serviço.' },
            { text: 'Organizar um dia de atendimento presencial no Centro Comunitário, com voluntários, para criar e usar a conta junto com quem precisa.', tier: 'best', fx: { ab: 6, ac: 3, co: 2 }, why: 'O atendimento presencial garante que ninguém fique de fora e ainda ensina. O digital soma com o presencial, sem substituí-lo.' } ] }
      ],
      outro: [['zeca', 'Obrigado, minha gente! Agora eu sei: conta é de graça, a senha é minha e o código ninguém pega.']]
    },
    {
      id: 'libras', title: 'Reunião para todos', place: 'Casa da Sofia', area: 'casaB', npc: 'sofia',
      blurb: 'Sofia é surda e quer que a reunião online do bairro seja acessível para todas as pessoas.',
      learn: 'Cada pessoa participa de um jeito: Libras e legendas, leitor de tela, letras grandes, linguagem simples ou pouca internet. Planejar a acessibilidade antes, e não depois, evita deixar gente de fora.',
      idle: 'A reunião foi um sucesso! Pela primeira vez, todo mundo entendeu e participou.',
      steps: [
        { t: 'talk', lines: [
          ['sofia', 'Oi! Eu sou surda e me comunico em Libras e por escrita. A reunião online do bairro é amanhã, mas nas últimas vezes não consegui acompanhar nada: sem legendas e sem intérprete.'],
          ['me', 'Isso é uma barreira de acesso, Sofia, não um problema seu. Vamos preparar uma reunião em que todo mundo possa participar.'] ] },
        { t: 'match', who: 'sofia', title: 'Quem precisa de quê?', prompt: 'Ligue cada pessoa ao recurso que ajuda na participação. Toque em uma pessoa e depois no recurso.',
          pairs: [
            ['Pessoa surda, que se comunica em Libras', 'Intérprete de Libras visível na tela e legendas'],
            ['Pessoa cega', 'Leitor de tela, descrição de imagens e material enviado antes'],
            ['Pessoa com baixa visão', 'Letras grandes, contraste forte e zoom'],
            ['Pessoa com pouca prática de leitura', 'Linguagem simples, resumo curto e áudio'],
            ['Pessoa com internet fraca', 'Entrar só por áudio ou telefone e receber a gravação depois'] ],
          hint: 'Pense no que cada pessoa precisa para ver, ouvir, ler e participar.',
          fx: { ab: 8, co: 2 }, done: 'Cada pessoa participa de um jeito: acessibilidade é oferecer várias formas, não uma só.' },
        { t: 'spot', who: 'sofia', kind: 'web', url: 'reuniao.conecta.gov/bairro', title: 'Sala da reunião online',
          prompt: 'Toque nos trechos da sala que deixam gente de fora. Depois, verifique.',
          hint: 'Procure o que falta para ver, ouvir, ler e participar.',
          elements: [
            { id: 'r1', cls: 'e-txt', html: 'Só áudio: a reunião não tem legendas', flaw: true, why: 'Sem legendas, pessoas surdas, com deficiência auditiva ou em lugar barulhento perdem o conteúdo.' },
            { id: 'r2', cls: 'e-txt', html: 'Intérprete de Libras em uma janelinha minúscula, cortada no canto', flaw: true, why: 'O intérprete precisa aparecer bem grande e em destaque, para dar para acompanhar os sinais.' },
            { id: 'r3', cls: 'e-title', html: '<span class="faint">Slides com letras cinza claro e miúdas</span>', flaw: true, why: 'Baixo contraste e letras pequenas dificultam a leitura para quem enxerga pouco.' },
            { id: 'r4', cls: 'e-txt', html: 'Chat de texto desativado: só quem fala em voz alta consegue participar', flaw: true, why: 'O chat escrito permite participar a quem usa Libras e legendas, a quem não fala e a quem tem pouca internet.' },
            { id: 'r5', cls: 'e-txt', html: 'Todo mundo fala ao mesmo tempo, sem combinar a vez', flaw: true, why: 'Sem combinar quem fala, o intérprete e as legendas não acompanham, e muita gente se perde.' },
            { id: 'r6', cls: 'e-good', html: '<b>Botão grande “Pedir a palavra”</b> e resumo escrito enviado depois', flaw: false, why: 'Pedir a palavra e receber um resumo escrito ajudam todo mundo a participar com calma.' },
            { id: 'r7', cls: 'e-good', html: 'Pauta enviada antes, em texto simples', flaw: false, why: 'Receber a pauta antes permite se preparar, inclusive para quem usa leitor de tela ou tradução.' } ],
          fx: { ab: 12, co: 2 }, after: 'Esses são problemas comuns em reuniões online e dá para evitá-los com um pouco de planejamento.' },
        { t: 'choice', who: 'sofia', prompt: 'Como realizar a reunião para que o maior número de pessoas possa participar?',
          hint: 'Quanto mais formas de participar, mais gente entra.',
          options: [
            { text: 'Só online, só com áudio, porque é mais rápido de organizar.', tier: 'bad', fx: { ab: -3, ac: -2 }, why: 'Só áudio e só online deixam de fora pessoas surdas, quem está sem internet estável e quem não tem aparelho.' },
            { text: 'Só online, mas com legendas automáticas.', tier: 'ok', fx: { ab: 3, ac: 1 }, why: 'Legendas ajudam, mas nem sempre acertam e não substituem o intérprete de Libras. Quem está sem internet continua de fora.' },
            { text: 'Reunião híbrida: presencial no Centro Comunitário e online, com intérprete de Libras, legendas, chat e resumo escrito.', tier: 'best', fx: { ab: 8, ac: 4, co: 2 }, why: 'Com várias formas de participar, cada pessoa escolhe a que funciona melhor para ela. É assim que ninguém fica de fora.' } ] }
      ],
      outro: [['sofia', 'Essa reunião vai ser diferente: eu vou entender tudo e falar também. Obrigada!']]
    },
    {
      id: 'portal', title: 'Portal Conecta+ (em equipe)', place: 'Prefeitura', area: 'prefeitura', npc: 'helena',
      blurb: 'Antes do lançamento, a equipe testa o portal unida: cada agente cuida do que sabe melhor.',
      learn: 'Serviços digitais inclusivos nascem do trabalho conjunto: acessibilidade, conexão e linguagem precisam ser testadas por pessoas com habilidades diferentes. Inclusão digital é responsabilidade compartilhada.',
      idle: 'O Portal Conecta+ já tem milhares de acessos. Conecta é referência!',
      steps: [
        { t: 'talk', lines: [
          ['helena', 'Estamos prontos para lançar o Portal Conecta+, onde todos podem agendar serviços. Antes, a equipe precisa testá-lo junta: cada agente testa o que sabe melhor.'],
          ['me', 'Cada posto de teste precisa do agente certo: Márcio, Miguel ou Yuri. Troque de agente com a tecla Tab, com 1, 2 e 3 ou clicando nos retratos.'],
          ['yuri', 'Trabalho em equipe: ninguém consegue fazer sozinho todos os testes.'] ] },
        { t: 'stations', ids: ['t1', 't2', 't3'], coop: true, objective: 'Teste o portal nos 3 postos, cada um com o agente certo',
          remind: 'Os postos ficam em frente à Prefeitura. Use 1 (Márcio), 2 (Miguel) e 3 (Yuri) para trocar de agente: cada posto exige o agente indicado.',
          mini: {
            t1: { who: 'marcio', prompt: 'Posto de leitor de tela: o portal tem imagens sem descrição e a navegação pula de um lado para o outro. O que corrigir?',
              hint: 'O leitor de tela lê na ordem do código e depende de textos.',
              options: [
                { text: 'Deixar para uma próxima versão.', tier: 'bad', fx: { ab: -3 }, why: 'Lançar sem testar acessibilidade já exclui pessoas no primeiro dia. Corrigir depois sai mais caro e deixa gente de fora.' },
                { text: 'Descrever só as imagens principais.', tier: 'ok', fx: { ab: 3 }, why: 'Melhora um pouco, mas se a navegação continua confusa, o leitor de tela se perde.' },
                { text: 'Descrever as imagens, usar títulos e ordenar os campos de forma lógica para navegar só com o teclado.', tier: 'best', fx: { ab: 8 }, why: 'Com textos e ordem lógica, o leitor de tela conduz a pessoa por todo o serviço sem depender de ninguém.' } ] },
            t2: { who: 'miguel', prompt: 'Posto de conexão lenta: o portal pesa muito e perde o que foi digitado quando a internet cai. O que fazer?',
              hint: 'Menos peso, menos exigência de aparelho e salvar o que foi digitado.',
              options: [
                { text: 'Exigir internet rápida e celular novo para usar o portal.', tier: 'bad', fx: { ac: -4 }, why: 'Exigir equipamento caro exclui quem mais precisa do serviço público.' },
                { text: 'Reduzir só o tamanho das imagens.', tier: 'ok', fx: { ac: 3 }, why: 'Ajuda um pouco, mas o portal ainda perde os dados quando a internet cai.' },
                { text: 'Versão leve, que funciona em celulares simples e com internet fraca, e que salva um rascunho automaticamente.', tier: 'best', fx: { ac: 8 }, why: 'Quem tem celular básico e sinal fraco consegue usar e não perde o trabalho se a conexão cair.' } ] },
            t3: { who: 'yuri', prompt: 'Posto de linguagem simples: o portal usa siglas e termos técnicos. Como tornar o uso mais fácil?',
              hint: 'Frases curtas, passo a passo e a opção de falar com uma pessoa.',
              options: [
                { text: 'Manter os termos técnicos: quem não entende que pergunte.', tier: 'bad', fx: { co: -3 }, why: 'Quando o serviço só se explica para quem já sabe, a pessoa com dúvida desiste.' },
                { text: 'Anexar um manual em PDF com todas as regras.', tier: 'ok', fx: { co: 3 }, why: 'Informação completa, mas longa e difícil de achar na hora da dúvida.' },
                { text: 'Passo a passo curto, vídeo tutorial com legenda e botão “Falar com uma pessoa”.', tier: 'best', fx: { co: 8, ab: 2 }, why: 'Linguagem simples e apoio humano deixam o serviço utilizável por todos.' } ] } },
          finish: { fx: { ac: 3, ab: 3, co: 3 }, pts: 5, text: 'Trabalho em equipe! Cada agente cuidou de uma parte e o portal ficou melhor do que qualquer um faria sozinho.' } }
      ],
      outro: [['helena', 'O Portal Conecta+ está no ar e funciona para muita gente! Isso foi trabalho em equipe: cidade, equipe técnica e moradores juntos.']]
    }
  ];

  const byId = {}, byNpc = {};
  list.forEach(function (m) { byId[m.id] = m; byNpc[m.npc] = m; });

  const G = function () { return CPT.Game; };
  const D = function () { return CPT.Dialogue; };
  function ms(m) { return G().state.missions[m.id]; }
  function acc(s, deltas) {
    deltas.forEach(function (d) { s.fx[d.key] = (s.fx[d.key] || 0) + d.delta; });
  }
  function worldDone(m, st) {
    const s = ms(m), ids = st.t === 'collect' ? st.ids : st.ids;
    return ids.every(function (id) { return s.prog[id]; });
  }
  function worldStep(m) {
    const s = ms(m), st = m.steps[s.step];
    return st && (st.t === 'collect' || st.t === 'stations') ? st : null;
  }

  /* Loop de escolha com retorno: erros mostram consequência e permitem tentar de novo.
   * onCommit roda assim que uma opção NÃO ruim é aplicada: a etapa passa a valer nesse instante,
   * então sair (Esc) durante o retorno nunca permite repetir o ganho. */
  async function choiceLoop(m, c, reason, onCommit) {
    const s = ms(m), tried = [];
    for (;;) {
      const i = await D().ask(c.who, c.prompt, c.options.map(function (o) { return o.text; }), { hint: c.hint, tried: tried });
      const o = c.options[i];
      const deltas = G().applyFx(o.fx, reason || m.title); acc(s, deltas);
      if (o.tier !== 'bad') { s.score.push(o.tier === 'best' ? 2 : 1); if (onCommit) onCommit(); }
      await D().feedback({ who: c.who, tier: o.tier, text: o.why, fx: deltas });
      if (o.tier === 'bad') { tried.push(i); continue; }
      return o.tier;
    }
  }

  function commit(s, idx) { s.doneSteps[idx] = true; }

  async function runStep(m, st, idx) {
    const s = ms(m);
    if (st.t === 'talk') { await D().lines(st.lines); }
    else if (st.t === 'choice') { await choiceLoop(m, st, null, function () { commit(s, idx); }); }
    else if (st.t === 'order') {
      D().close();
      const r = await CPT.Activities.order(st);
      const deltas = G().applyFx(st.fx, m.title); acc(s, deltas);
      s.score.push(r.tries <= 2 ? 2 : 1); commit(s, idx);
      await D().feedback({ who: st.who, tier: r.tries <= 2 ? 'best' : 'ok', text: st.done, fx: deltas });
    } else if (st.t === 'match') {
      D().close();
      const r = await CPT.Activities.match(st);
      const deltas = G().applyFx(st.fx, m.title); acc(s, deltas);
      s.score.push(r.tries <= 3 ? 2 : 1); commit(s, idx);
      await D().feedback({ who: st.who, tier: r.tries <= 3 ? 'best' : 'ok', text: st.done, fx: deltas });
    } else if (st.t === 'spot') {
      D().close();
      const r = await CPT.Activities.spot(st);
      const k = r.total ? r.found / r.total : 0, fx = {};
      for (const key in st.fx) fx[key] = Math.round(st.fx[key] * k);
      const deltas = G().applyFx(fx, m.title); acc(s, deltas);
      s.score.push(r.perfect ? 2 : 1); commit(s, idx);
      await D().feedback({ who: st.who, tier: r.perfect ? 'best' : 'ok', text: st.after, fx: deltas });
    } else if (st.t === 'plan') {
      D().close();
      const r = await CPT.Activities.plan(st);
      const deltas = G().applyFx(r.fx, m.title); acc(s, deltas);
      const net = (r.fx.ac || 0) + (r.fx.ab || 0) + (r.fx.co || 0);
      s.score.push(net >= 25 ? 2 : 1); commit(s, idx);
    }
  }

  async function run(m) {
    const s = ms(m);
    while (s.step < m.steps.length) {
      const st = m.steps[s.step];
      if (s.doneSteps[s.step]) { s.step++; continue; }   // etapa já concluída antes de sair
      if (st.t === 'collect' || st.t === 'stations') {
        if (!worldDone(m, st)) {
          if (!s.briefed[s.step]) { if (st.intro) await D().lines(st.intro); s.briefed[s.step] = true; }
          else await D().say(m.npc, st.remind);
          D().close(); G().refresh();
          return;
        }
        s.step++; continue;
      }
      await runStep(m, st, s.step);
      s.step++;
      G().refresh();
    }
    D().close();
    await complete(m);
  }

  async function complete(m) {
    const s = ms(m), g = G();
    await D().lines(m.outro).then(function () { D().close(); });
    if (s.status === 'done') return;
    s.status = 'done';
    const base = 3, bonus = Math.floor(g.state.stats.ac / 25), pts = base + bonus;
    g.addPts(pts);
    const avg = s.score.length ? s.score.reduce(function (a, b) { return a + b; }, 0) / s.score.length : 2;
    const stars = avg >= 1.75 ? 3 : (avg >= 1.0 ? 2 : 1);
    const deltas = ['ac', 'ab', 'co'].map(function (k) { return { key: k, delta: Math.round(s.fx[k] || 0) }; });
    g.celebrate(m.npc);
    CPT.Sound.play('good');
    await CPT.Activities.missionComplete(m, { stars: stars, deltas: deltas, pts: pts, bonus: bonus });
    s.stars = stars;
    g.state.tracked = null;
    g.afterMission(m);
  }

  /* Bônus de equipe ao concluir todos os postos (concedido uma única vez, mesmo que o jogador saia antes de ler) */
  async function finishStations(m, w, silent) {
    const s = ms(m), g = G(), d = D(), npc = CPT.World.NPCS[m.npc], key = 'fin' + s.step;
    if (!worldDone(m, w) || s.briefed[key]) return;
    s.briefed[key] = true;
    if (w.finish) {
      const deltas = g.applyFx(w.finish.fx, m.title); acc(s, deltas);
      if (w.finish.pts) g.addPts(w.finish.pts);
      if (silent) g.toast('<b>' + CPT.UI.esc(w.finish.text) + '</b> ' + CPT.chipsHTML(deltas), 6000);
      else await d.feedback({ who: 'narrator', tier: 'best', text: w.finish.text, fx: deltas });
    }
    g.toast('<b>Objetivo concluído!</b> Volte a falar com ' + CPT.UI.esc(npc.name) + '.', 5200);
  }

  const M = (CPT.Missions = {
    list: list, byId: byId, byNpc: byNpc,
    initState: function () {
      const o = {};
      list.forEach(function (m) { o[m.id] = { status: 'new', step: 0, prog: {}, briefed: {}, doneSteps: {}, score: [], fx: { ac: 0, ab: 0, co: 0 }, stars: 0 }; });
      return o;
    },
    worldStep: worldStep,
    /* Ícone sobre o personagem: new | doing | done | lock | null */
    marker: function (npcId) {
      const m = byNpc[npcId]; if (!m) return null;
      const g = G(), s = ms(m);
      if (s.status === 'done') return 'done';
      if (m.id === 'portal' && !g.portalUnlocked()) return g.state.discovered[m.area] ? 'lock' : null;
      if (s.status === 'active') {
        const w = worldStep(m);
        return w && !worldDone(m, w) ? 'doing' : 'new';
      }
      return g.state.discovered[m.area] ? 'new' : null;
    },
    visibleItems: function () {
      const out = [], g = G();
      list.forEach(function (m) {
        const s = ms(m), w = s.status === 'active' ? worldStep(m) : null;
        if (w && w.t === 'collect') CPT.World.ITEMS.forEach(function (it) { if (it.mission === m.id && w.ids.indexOf(it.id) >= 0 && !s.prog[it.id]) out.push(it); });
      });
      return out;
    },
    /* Texto de objetivo e alvo no mapa para uma missão */
    objective: function (m) {
      const g = G(), s = ms(m), W = CPT.World, npc = W.NPCS[m.npc];
      if (s.status === 'done') return null;
      if (m.id === 'portal' && !g.portalUnlocked()) return { text: 'Conclua mais ' + (g.PORTAL_NEEDS - g.doneCount(true)) + ' missões para liberar o Portal Conecta+ com a Prefeita Helena.', target: { tx: npc.tx, ty: npc.ty } };
      if (s.status === 'new') return { text: 'Fale com ' + npc.name + ' (' + m.place + ').', target: { tx: npc.tx, ty: npc.ty } };
      const w = worldStep(m);
      if (w && !worldDone(m, w)) {
        const left = w.ids.filter(function (id) { return !s.prog[id]; });
        const src = w.t === 'collect' ? W.ITEMS : W.STATIONS;
        const t = src.filter(function (x) { return x.id === left[0]; })[0];
        return { text: w.objective + ' (' + (w.ids.length - left.length) + '/' + w.ids.length + ').', target: t ? { tx: t.tx, ty: t.ty } : null, multi: left.map(function (id) { const q = src.filter(function (x) { return x.id === id; })[0]; return { tx: q.tx, ty: q.ty }; }) };
      }
      return { text: 'Volte a falar com ' + npc.name + '.', target: { tx: npc.tx, ty: npc.ty } };
    },

    async interactNpc(id) {
      const g = G(), d = D(), m = byNpc[id];
      try {
        if (!m) return;
        const s = ms(m);
        if (s.status === 'done') { await d.say(id, m.idle); return; }
        if (m.id === 'portal' && !g.portalUnlocked()) {
          await d.say(id, 'O Portal Conecta+ ainda está em preparação. Ajude mais moradores e volte: preciso de pelo menos ' + g.PORTAL_NEEDS + ' missões concluídas (até agora: ' + g.doneCount(true) + ').');
          return;
        }
        if (s.status === 'new') { s.status = 'active'; s.step = 0; CPT.Sound.play('new'); }
        g.track(m.id);
        await run(m);
      } catch (e) {
        if (e !== CPT.CANCEL) throw e;
        if (m) g.toast('Você saiu da conversa. Fale com <b>' + CPT.UI.esc(CPT.World.NPCS[id].name) + '</b> de novo para continuar de onde parou.', 4200);
      } finally { d.close(); g.refresh(); }
    },

    collect: function (item) {
      const g = G(), m = byId[item.mission], s = ms(m), w = worldStep(m);
      if (!w || s.prog[item.id]) return;
      s.prog[item.id] = true;
      const info = w.itemFx[item.id], deltas = g.applyFx(info.fx, m.title); acc(s, deltas);
      g.sparkle(item.tx * 16 + 8, item.ty * 16 + 8);
      CPT.Sound.play('pick');
      g.toast('<b>' + CPT.UI.esc(info.msg) + '</b> ' + CPT.chipsHTML(deltas));
      if (worldDone(m, w)) { g.toast('<b>Objetivo concluído!</b> Volte a falar com ' + CPT.UI.esc(CPT.World.NPCS[m.npc].name) + '.', 5200); CPT.Sound.play('good'); }
      g.refresh();
    },

    async interactStation(def) {
      const g = G(), d = D(), m = byId[def.mission], s = ms(m);
      const w0 = s.status === 'active' ? worldStep(m) : null;
      try {
        const w = w0;
        const active = w && w.t === 'stations' && w.ids.indexOf(def.id) >= 0;
        const npc = CPT.World.NPCS[m.npc];
        if (!active) {
          await d.say('narrator', s.status === 'done' ? def.label + ': já está pronto ✔' : def.label + '. Fale com ' + npc.name + ' para começar esta missão.');
          return;
        }
        if (s.prog[def.id]) { await d.say('narrator', def.label + ': este posto já foi concluído ✔'); return; }
        if (def.agent && g.leaderId() !== def.agent) {
          const a = CPT.Player.AGENTS.filter(function (x) { return x.id === def.agent; })[0], k = CPT.Player.AGENTS.indexOf(a) + 1;
          const P = CPT.Player, how = P.coop
            ? (P.current === 1 ? 'Troque de agente com Shift direito ou Num ' + k : 'Troque de agente com Q ou a tecla ' + k) + ', ou chame o outro jogador se ele estiver com ' + a.name + ' (os dois podem trocar de lugar clicando no retrato).'
            : 'Troque de agente com a tecla ' + k + ', com Tab ou clicando no retrato de ' + a.name + '.';
          await d.say('narrator', def.label + ' exige ' + a.name + ' (' + a.role + '). ' + how);
          return;
        }
        await choiceLoop(m, Object.assign({}, w.mini[def.id]), m.title, function () {
          s.prog[def.id] = true;
          g.sparkle(def.tx * 16 + 8, def.ty * 16 + 8);
        });
        await finishStations(m, w, false);
      } catch (e) {
        if (e !== CPT.CANCEL) throw e;
        if (w0 && s.prog[def.id]) await finishStations(m, w0, true);   // saiu depois de concluir: o bônus não se perde
        g.toast('Você saiu do posto de trabalho.', 2500);
      } finally { d.close(); g.refresh(); }
    }
  });
})();
