// =============================================================
//  CONFIGURAÇÃO DA BARBEARIA — edite aqui e gere o app de novo
// =============================================================
window.APP_CONFIG = {
  nome: "Heritage Barber",

  // Supabase (só a versão completa usa). Pegue em:
  // supabase.com → seu projeto → Project Settings → API
  supabaseUrl: "COLE_AQUI_A_PROJECT_URL",        // ex.: https://abcdxyz.supabase.co
  supabaseKey: "COLE_AQUI_A_CHAVE_ANON_PUBLIC",  // chave "anon" / "public" (nunca a service_role)

  barbeiros: ["João", "Marco", "Rafael", "Carlos"],

  servicos: [
    { nome: "Corte",               v: 50 },
    { nome: "Corte + Barba",       v: 80 },
    { nome: "Corte + Pigmentação", v: 110 },
    { nome: "Barba",               v: 35 },
    { nome: "Sobrancelha",         v: 30 }
  ],

  horarios: ["09:00","09:30","10:00","10:30","11:00","11:30",
             "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"],

  fechaAs: "18:00",
  duracaoMin: 30,        // duração de cada horário (usada para saber quem está "na cadeira")
  comissao: 0.30,        // comissão dos barbeiros no Caixa
  mesesAFrente: 12       // até quantos meses o cliente pode agendar
};
