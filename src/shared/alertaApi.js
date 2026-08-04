// Constantes e configurações da integração com Alerta Licitação.
// O token da API agora fica no backend (segredo) — o frontend apenas
// invoca a função de backend que consulta a API com segurança.

import { base44 } from "@/api/base44Client";

export const MODALIDADES = [
  { id: "1", nome: "Convite" },
  { id: "2", nome: "Concorrência" },
  { id: "3", nome: "Leilão" },
  { id: "4", nome: "Tomada de preços" },
  { id: "5", nome: "Pregão eletrônico" },
  { id: "6", nome: "Dispensas e dispensas eletrônicas" },
  { id: "8", nome: "Pregão presencial" },
  { id: "11", nome: "Chamamento público" },
];

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export const STATUS_OPTIONS = [
  { value: "interessado", label: "Interessado", color: "bg-blue-100 text-blue-700" },
  { value: "acompanhando", label: "Acompanhando", color: "bg-amber-100 text-amber-700" },
  { value: "participando", label: "Participando", color: "bg-purple-100 text-purple-700" },
  { value: "vencida", label: "Vencida", color: "bg-orange-100 text-orange-700" },
  { value: "ganha", label: "Ganha", color: "bg-green-100 text-green-700" },
  { value: "perdida", label: "Perdida", color: "bg-red-100 text-red-700" },
  { value: "descartada", label: "Descartada", color: "bg-gray-200 text-gray-600" },
];

export async function buscarLicitacoes(filtros = {}) {
  const response = await base44.functions.invoke("buscarLicitacoesApi", filtros);
  return response.data;
}