// SERVICO DE IA - Copiloto Operacional Malha V9
// Usa Google Gemini API com Function Calling
//
// NOTA DE SEGURANÇA: Este serviço realiza chamadas à API do Gemini diretamente no lado do cliente
// (browser) a pedido explícito do usuário, utilizando import.meta.env.VITE_GEMINI_API_KEY.
// Em ambientes produtivos/Enterprise reais, chaves de API nunca devem ser expostas no lado do cliente.
// O ideal é configurar rotas de backend (proxy) para ocultar as credenciais.

import { supabase } from '../lib/supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AIMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// === TOOLS ===

async function listar_voos_ativos(): Promise<string> {
  const hoje = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('flights')
    .select('*, company_aircraft(prefix, model_display), companies(name, code)')
    .eq('date', hoje)
    .not('status', 'in', '("FINALIZADO","CANCELADO")');
  if (error) return `Erro: ${error.message}`;
  if (!data?.length) return 'Nenhum voo ativo.';
  return data.map((f: any) => {
    const cia = f.companies?.code || '??';
    const prefixo = f.company_aircraft?.prefix || '??';
    return `${cia} ${f.flight_number || f.departure_flight_number || '??'} (${prefixo}) - ${f.destination || 'SBGR'} - Status: ${f.status} - ETA: ${f.eta || '??'} - Pos: ${f.position_id || '??'}`;
  }).join('\n');
}

async function listar_operadores_disponiveis(): Promise<string> {
  const { data, error } = await supabase
    .from('operators')
    .select('*')
    .eq('status', 'DISPONIVEL')
    .order('war_name');
  if (error) return `Erro: ${error.message}`;
  if (!data?.length) return 'Nenhum operador disponível.';
  return data.map((o: any) => `${o.war_name} (${o.full_name}) - Colete: ${o.vest_number || '??'} - Habilidade: ${o.fleet_capability || '??'}`).join('\n');
}

async function listar_veiculos_disponiveis(): Promise<string> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'DISPONIVEL')
    .order('type');
  if (error) return `Erro: ${error.message}`;
  if (!data?.length) return 'Nenhum veículo disponível.';
  return data.map((v: any) => `${v.id} - ${v.type} ${v.manufacturer || ''} - Vazão: ${v.max_flow_rate || '??'}L/min - Plataforma: ${v.has_platform ? 'SIM' : 'NÃO'}`).join('\n');
}

async function consultar_voo(args: { numero_voo: string }): Promise<string> {
  const { numero_voo } = args;
  const hoje = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('flights')
    .select('*, company_aircraft(prefix, model_display), companies(name, code)')
    .eq('date', hoje)
    .or(`flight_number.ilike.%${numero_voo}%,departure_flight_number.ilike.%${numero_voo}%`)
    .limit(1);
  if (error || !data?.length) return `Voo ${numero_voo} não encontrado.`;
  const f = data[0];
  return `Voo: ${f.companies?.code || ''} ${f.flight_number || f.departure_flight_number || ''}\nPrefixo: ${f.company_aircraft?.prefix || '??'}\nDestino: ${f.destination || '??'}\nStatus: ${f.status}\nETA: ${f.eta || '??'} | ETD: ${f.etd || '??'}\nPosição: ${f.position_id || '??'}\nOperador: ${f.operator_id || 'SEM OPERADOR'}\nVeículo: ${f.vehicle_id || 'SEM VEÍCULO'}`;
}

async function analisar_operacao(): Promise<string> {
  const hoje = new Date().toISOString().split('T')[0];
  const [voosRes, opsRes] = await Promise.all([
    supabase.from('flights').select('status, operator_id').eq('date', hoje),
    supabase.from('operators').select('status')
  ]);
  const voos = voosRes.data || [];
  const ops = opsRes.data || [];
  const porStatus: Record<string, number> = {};
  voos.forEach((v: any) => { porStatus[v.status] = (porStatus[v.status] || 0) + 1; });
  const semOp = voos.filter((v: any) => !v.operator_id && v.status !== 'FINALIZADO' && v.status !== 'CANCELADO').length;
  const opsDisp = ops.filter((o: any) => o.status === 'DISPONIVEL').length;
  return `ANÁLISE OPERACIONAL (${hoje})\nTotal voos: ${voos.length}\nPor status: ${Object.entries(porStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}\nVoos sem operador: ${semOp}\nOperadores disponíveis: ${opsDisp} de ${ops.length}`;
}

async function sugerir_designacao(args: { numero_voo: string }): Promise<string> {
  const { numero_voo } = args;
  const hoje = new Date().toISOString().split('T')[0];
  const { data: voosData } = await supabase
    .from('flights')
    .select('*, company_aircraft(prefix, model_display), companies(name, code)')
    .eq('date', hoje)
    .or(`flight_number.ilike.%${numero_voo}%,departure_flight_number.ilike.%${numero_voo}%`)
    .limit(1);
  if (!voosData?.length) return `Voo ${numero_voo} não encontrado.`;
  const voo = voosData[0];
  const { data: opsData } = await supabase
    .from('operators')
    .select('*')
    .eq('status', 'DISPONIVEL')
    .order('war_name');
  if (!opsData?.length) return 'Nenhum operador disponível.';
  const op = opsData[0];
  return `SUGESTÃO PARA ${voo.companies?.code || ''} ${voo.flight_number || voo.departure_flight_number || ''} (${voo.company_aircraft?.prefix || '??'})\nOperador: ${op.war_name} (${op.full_name}) - Colete: ${op.vest_number || '??'}\nHabilidade: ${op.fleet_capability || 'N/A'}\nMotivo: Operador disponível com habilidade ${op.fleet_capability || 'geral'}`;
}

const TOOLS: Record<string, (args: any) => Promise<string>> = {
  listar_voos_ativos, 
  listar_operadores_disponiveis, 
  listar_veiculos_disponiveis,
  consultar_voo, 
  analisar_operacao, 
  sugerir_designacao
};

const TOOLS_DECLARATION = [
  { name: 'listar_voos_ativos', description: 'Lista voos ativos do dia', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'listar_operadores_disponiveis', description: 'Lista operadores DISPONIVEL', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'listar_veiculos_disponiveis', description: 'Lista veiculos disponiveis', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'consultar_voo', description: 'Consulta voo pelo numero', parameters: { type: 'OBJECT', properties: { numero_voo: { type: 'STRING' } }, required: ['numero_voo'] } },
  { name: 'analisar_operacao', description: 'Analise geral da operacao', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'sugerir_designacao', description: 'Sugere operador e veiculo para um voo', parameters: { type: 'OBJECT', properties: { numero_voo: { type: 'STRING' } }, required: ['numero_voo'] } }
];

export async function sendMessageToAI(messages: AIMessage[], onToolCall?: (name: string) => void): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'Copiloto não configurado.\n\n1. Acesse aistudio.google.com/app/apikey\n2. Gere uma API Key\n3. Adicione no .env: VITE_GEMINI_API_KEY=sua_chave';
  }
  
  const contents = messages.map(m => ({ 
    role: m.role, 
    parts: [{ text: m.text }] 
  }));

  const body = { 
    contents, 
    tools: [{ functionDeclarations: TOOLS_DECLARATION }], 
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } }, 
    generationConfig: { 
      temperature: 0.3, 
      maxOutputTokens: 2048 
    }, 
    systemInstruction: { 
      parts: [{ text: 'Você é o Copiloto Operacional do Malha V9, sistema de abastecimento de aeronaves em SBGR. Responda em português brasileiro de forma direta, técnica e profissional. Sempre utilize as ferramentas disponíveis para obter dados em tempo real no banco do Supabase e responder com total exatidão sobre os voos, veículos e operadores. Não invente nenhuma informação.' }] 
    } 
  };
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    const candidate = result.candidates?.[0];
    if (!candidate) return 'Sem resposta.';
    
    const functionCalls = candidate.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall) || [];
    
    if (functionCalls.length > 0) {
      const toolResults: any[] = [];
      for (const fc of functionCalls) {
        onToolCall?.(fc.name);
        const toolFn = TOOLS[fc.name];
        if (toolFn) {
          const resultText = await toolFn(fc.args || {});
          toolResults.push({ 
            functionResponse: { 
              name: fc.name, 
              response: { result: resultText } 
            } 
          });
        }
      }
      
      const followUpBody = { 
        contents: [
          ...contents, 
          { 
            role: 'model', 
            parts: functionCalls.map((fc: any) => ({ functionCall: fc })) 
          }, 
          { 
            role: 'user', 
            parts: toolResults 
          }
        ], 
        tools: [{ functionDeclarations: TOOLS_DECLARATION }], 
        generationConfig: { 
          temperature: 0.3, 
          maxOutputTokens: 2048 
        }, 
        systemInstruction: body.systemInstruction 
      };
      
      const followUpResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(followUpBody) 
      });
      const followUpResult = await followUpResponse.json();
      if (followUpResult.error) {
        throw new Error(followUpResult.error.message || JSON.stringify(followUpResult.error));
      }
      return followUpResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    }
    return candidate.content?.parts?.[0]?.text || 'Sem resposta.';
  } catch (err: any) {
    return `Erro ao processar com IA: ${err.message}`;
  }
}

export function isAIConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10;
}
