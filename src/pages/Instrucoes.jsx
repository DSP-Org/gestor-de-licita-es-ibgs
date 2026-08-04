import { BookOpen, Search, Bell, FileText, Share2, Users, Clock, RefreshCw, Mail, Filter, Star, ChevronRight } from "lucide-react";

export default function Instrucoes() {
  const secoes = [
    {
      icon: Search,
      titulo: "Explorar Licitações",
      descricao: "Busque licitações em tempo real na API Alerta Licitação.",
      passos: [
        "Acesse a aba Explorar no menu inferior ou lateral.",
        "Use os filtros: Estado (UF), município, palavras-chave, modalidade e período (data inicial e final).",
        "A busca por período consulta cada dia do intervalo (limite de 31 dias) e consolida os resultados.",
        "Clique em uma licitação para ver detalhes ou marque os itens para salvar em sua lista.",
      ],
    },
    {
      icon: FileText,
      titulo: "Minhas Licitações",
      descricao: "Gerencie as licitações que você salvou manualmente.",
      passos: [
        "Licitações salvas aparecem aqui com cards ou tabela.",
        "Use a busca, filtro de status, favoritos e filtro por data de abertura.",
        "Clique em uma licitação para editar status, notas, valor da proposta e favoritar.",
        "Use o botão Compartilhar para gerar um link público do resultado.",
      ],
    },
    {
      icon: RefreshCw,
      titulo: "Atualização (Sincronização)",
      descricao: "Resultados da sincronização automática das buscas ativas.",
      passos: [
        "A sincronização consulta a API pelos últimos 3 dias e traz apenas licitações novas.",
        "Selecione uma ou mais buscas para sincronizar manualmente.",
        "Use ações em lote (Enviar, Salvar, Excluir) selecionando múltiplos itens.",
        "A coluna Busca mostra qual busca originou cada licitação.",
      ],
    },
    {
      icon: BookOpen,
      titulo: "Buscas e Automação",
      descricao: "Crie buscas salvas com sincronização automática e notificações.",
      passos: [
        "Defina nome, UF, município, palavras-chave e modalidade.",
        "Escolha o modo de palavras: qualquer (expansivo) ou todas (restritivo).",
        "Ative a sincronização automática e defina o horário diário.",
        "Selecione destinatários de e-mail (usuários do sistema e/ou e-mails externos).",
        "Licitações novas são enviadas por e-mail em formato HTML com link de compartilhamento.",
      ],
    },
    {
      icon: Bell,
      titulo: "Notificações",
      descricao: "Receba alertas de novas licitações por e-mail ou link público.",
      passos: [
        "O e-mail é enviado aos destinatários configurados em cada busca.",
        "Destinatários externos (não cadastrados) recebem via serviço Resend.",
        "O e-mail inclui um link público para visualizar todas as licitações do lote.",
        "Links públicos são acessíveis sem login —任何人 com o código pode abrir.",
      ],
    },
    {
      icon: Share2,
      titulo: "Compartilhamento Público",
      descricao: "Gere links públicos para compartilhar resultados de licitações.",
      passos: [
        "Na página Minhas Licitações ou Atualização, clique em Compartilhar.",
        "Um código único é gerado e o link pode ser copiado ou enviado.",
        "O destinatário acessa o link sem precisar de login.",
        "A página pública mostra apenas as licitações do lote compartilhado.",
      ],
    },
    {
      icon: Users,
      titulo: "Usuários",
      descricao: "Gestão de usuários do sistema (apenas administradores).",
      passos: [
        "Admins podem convidar novos usuários com perfil admin ou user.",
        "Cada usuário vê apenas suas próprias licitações e buscas.",
        "A RLS (Row-Level Security) isola os dados por usuário automaticamente.",
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-medium uppercase tracking-wide">Guia de uso</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Como usar a plataforma</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conheça as funcionalidades do LicitaAlerta e comece a monitorar oportunidades públicas.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="text-sm space-y-1">
          <p className="font-medium">Comece por aqui:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
            <li>Crie uma busca em <strong>Buscas e Automação</strong> com seus filtros.</li>
            <li>Ative a sincronização automática e configure os destinatários.</li>
            <li>Salve licitações de interesse em <strong>Explorar</strong>.</li>
            <li>Acompanhe tudo em <strong>Minhas Licitações</strong>.</li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        {secoes.map((sec, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <sec.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-semibold text-base">{sec.titulo}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{sec.descricao}</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground pl-1">
              {sec.passos.map((p, j) => (
                <li key={j} className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-500" /> Dicas
        </h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Use o modo <strong>todas as palavras</strong> para buscas mais restritivas.
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            A sincronização automática roda diariamente no horário configurado.
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Licitações duplicadas são automaticamente filtradas na busca por período.
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            O link público de compartilhamento não expõe o restante do sistema.
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">
        LicitaAlerta · Desenvolvido por Data5 Tecnologia
      </p>
    </div>
  );
}