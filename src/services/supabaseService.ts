import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vehicle, OperatorProfile, AircraftType, FlightData, FlightStatus, MeshFlight } from '../types';
import { getLocalTodayDateStr } from '../utils/shiftUtils';

// === CONFIGURAÇÃO E SUPORTE DE ERROS ===
const isTableMissingError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('schema cache') ||
    code === 'pgrst116' ||
    msg.includes('uuid-ossp') ||
    msg.includes('violates row-level security')
  );
};

// === SEMENTE ESTÁTICA DO PROJETO (FALLBACKS DE ALTA FIDELIDADE) ===
const INITIAL_FROTAS = [
  { fleet_number: '2104', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2108', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2111', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2113', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2122', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2123', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2124', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '2125', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: null, max_flow_rate: 1000, has_platform: false },
  { fleet_number: '1405', type: 'CTA', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: 15000, max_flow_rate: 1500, has_platform: true },
  { fleet_number: '1425', type: 'CTA', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: 20000, max_flow_rate: 2000, has_platform: true },
  { fleet_number: '1426', type: 'CTA', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: 20000, max_flow_rate: 2000, has_platform: true },
  { fleet_number: '1517', type: 'CTA', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', capacity: 20000, max_flow_rate: 2000, has_platform: true }
];

const INITIAL_OPERADORES = [
  { id: 'op_1', full_name: 'João Silva', war_name: 'SILVA', vest_number: '001', status: 'DISPONÍVEL', category: 'AERODROMO', shift_cycle: 'MANHÃ', fleet_capability: 'SRV', is_lt: 'NÃO', is_usuario: false, is_administrador: false, is_master: false, patio: '1', tmf_login: '1001', blood_type: 'O+', role: 'Op. Jr.', shift_start: '06:00', shift_end: '14:00' },
  { id: 'op_2', full_name: 'Pedro Santos', war_name: 'SANTOS', vest_number: '002', status: 'DISPONÍVEL', category: 'AERODROMO', shift_cycle: 'MANHÃ', fleet_capability: 'BOTH', is_lt: 'SIM', is_usuario: true, is_administrador: false, is_master: false, patio: '2', tmf_login: '2002', blood_type: 'A+', role: 'Op. LT', shift_start: '06:00', shift_end: '14:00' },
  { id: 'op_3', full_name: 'Lucas Oliveira', war_name: 'OLIVEIRA', vest_number: '003', status: 'DISPONÍVEL', category: 'ILHA', shift_cycle: 'TARDE', fleet_capability: 'CTA', is_lt: 'NÃO', is_usuario: false, is_administrador: false, is_master: false, patio: 'AA', tmf_login: '3003', blood_type: 'AB-', role: 'Op. Pl.', shift_start: '14:00', shift_end: '22:00' },
  { id: 'op_4', full_name: 'Carlos Pereira', war_name: 'PEREIRA', vest_number: '004', status: 'DESCONECTADO', category: 'AERODROMO', shift_cycle: 'NOITE', fleet_capability: 'SRV', is_lt: 'NÃO', is_usuario: false, is_administrador: false, is_master: false, patio: '1', tmf_login: '4004', blood_type: 'O-', role: 'Op. Sr.', shift_start: '22:00', shift_end: '06:00' }
];

const INITIAL_AERONAVES = [
  { id: 'a_1', model: 'B737-7', prefix: 'PR-GEA', airline: 'Gol Linhas Aéreas', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false },
  { id: 'a_2', model: 'B737-7', prefix: 'PR-GEC', airline: 'Gol Linhas Aéreas', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false },
  { id: 'a_3', model: 'B737-8', prefix: 'PR-GGE', airline: 'Gol Linhas Aéreas', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false },
  { id: 'a_4', model: 'A319', prefix: 'PT-TMA', airline: 'LATAM', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false },
  { id: 'a_5', model: 'A320', prefix: 'PR-TYA', airline: 'LATAM', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false },
  { id: 'a_6', model: 'A321', prefix: 'PT-MXA', airline: 'LATAM', missing_cap: false, defective_door: false, defective_panel: false, no_autocut: false }
];

const INITIAL_DESTINOS = [
  { icao: 'SBGR', city: 'Guarulhos', destination: 'SBGR' },
  { icao: 'SBSP', city: 'São Paulo', destination: 'SBSP' },
  { icao: 'SBGL', city: 'Rio de Janeiro', destination: 'SBGL' },
  { icao: 'SBCF', city: 'Belo Horizonte', destination: 'SBCF' },
  { icao: 'SBBR', city: 'Brasília', destination: 'SBBR' }
];

const INITIAL_MALHA_RAIZ = [
  { id: 'mr_1', flight_number: 'G31425', airline_code: 'G3', destination: 'SBSP', eta: '10:00', etd: '11:00', registration: 'PR-GEA', model: 'B737-7', position_id: '101L', actual_arrival_time: '10:05', is_disabled: false },
  { id: 'mr_2', flight_number: 'LA3412', airline_code: 'LA', destination: 'SBGL', eta: '12:30', etd: '13:40', registration: 'PT-TMA', model: 'A319', position_id: '201', actual_arrival_time: '12:28', is_disabled: false },
  { id: 'mr_3', flight_number: 'G32344', airline_code: 'G3', destination: 'SBCF', eta: '15:15', etd: '16:15', registration: 'PR-GGE', model: 'B737-8', position_id: '102', actual_arrival_time: '15:10', is_disabled: false }
];

// === AUXILIARES DE COPIA/PERSISTÊNCIA LOCAL (MODO CONTINGÊNCIA) ===
const getLocalVehicles = (): Vehicle[] => {
  const saved = localStorage.getItem('contingency_frotas');
  if (!saved) {
    const list = INITIAL_FROTAS.map((v, i) => ({
      id: `v-local-${i}`,
      type: v.type as any,
      manufacturer: v.manufacturer,
      status: v.status as any,
      maxFlowRate: v.max_flow_rate,
      hasPlatform: v.has_platform,
      capacity: v.capacity || undefined,
      counterInitial: 0,
      counterFinal: 0,
      isActive: true,
      observations: '',
      operatorId: undefined
    }));
    localStorage.setItem('contingency_frotas', JSON.stringify(list));
    return list;
  }
  return JSON.parse(saved);
};

const saveLocalVehicles = (list: Vehicle[]) => {
  localStorage.setItem('contingency_frotas', JSON.stringify(list));
};

const getLocalOperators = (): OperatorProfile[] => {
  const saved = localStorage.getItem('contingency_operadores');
  if (!saved) {
    const list = INITIAL_OPERADORES.map((o) => ({
      id: o.id,
      fullName: o.full_name,
      warName: o.war_name,
      companyId: '',
      gruId: '',
      vestNumber: o.vest_number,
      photoUrl: '',
      email: '',
      isLT: o.is_lt as any,
      isUsuario: o.is_usuario,
      isAdministrador: o.is_administrador,
      isMaster: o.is_master,
      patio: o.patio,
      tmfLogin: o.tmf_login,
      bloodType: o.blood_type,
      role: o.role,
      status: o.status as any,
      category: o.category,
      lastPosition: '',
      fleetCapability: o.fleet_capability as any,
      shift: {
        cycle: o.shift_cycle,
        start: o.shift_start,
        end: o.shift_end
      },
      airlines: ['G3'],
      ratings: { speed: 4.5, safety: 5.0, airlineSpecific: {} },
      expertise: { servidor: 80, cta: 50 },
      stats: { flightsWeekly: 0, flightsMonthly: 0, volumeWeekly: 0, volumeMonthly: 0 },
      workDays: []
    }));
    localStorage.setItem('contingency_operadores', JSON.stringify(list));
    return list;
  }
  return JSON.parse(saved);
};

const saveLocalOperators = (list: OperatorProfile[]) => {
  localStorage.setItem('contingency_operadores', JSON.stringify(list));
};

const getLocalRootMesh = (): MeshFlight[] => {
  const saved = localStorage.getItem('contingency_malha_raiz');
  if (!saved) {
    const mapped = INITIAL_MALHA_RAIZ.map((f) => ({
      id: f.id,
      airline: f.airline_code === 'G3' ? 'Gol Linhas Aéreas' : 'LATAM',
      airlineCode: f.airline_code,
      departureFlightNumber: (f as any).departure_flight_number || f.flight_number,
      destination: f.destination,
      etd: f.etd,
      registration: f.registration,
      eta: f.eta,
      flightNumber: f.flight_number,
      positionId: f.position_id,
      actualArrivalTime: f.actual_arrival_time,
      model: f.model,
      disabled: f.is_disabled
    }));
    localStorage.setItem('contingency_malha_raiz', JSON.stringify(mapped));
    return mapped;
  }
  return JSON.parse(saved);
};

const saveLocalRootMesh = (list: MeshFlight[]) => {
  localStorage.setItem('contingency_malha_raiz', JSON.stringify(list));
};

const getInitialBaseMeshFlightsForDate = (dateRef: string): MeshFlight[] => {
  const root = getLocalRootMesh();
  return root.map((f, i) => ({
    ...f,
    id: `mesh-local-${dateRef}-${i}`,
    date: dateRef
  }));
};

const getLocalBaseMeshFlights = (dateRef: string): MeshFlight[] => {
  const saved = localStorage.getItem('contingency_malha_dia');
  let list: MeshFlight[] = [];
  if (saved) {
    try {
      list = JSON.parse(saved);
    } catch {
      list = [];
    }
  }
  const filtered = list.filter(f => f.date === dateRef);
  if (filtered.length === 0) {
    const initial = getInitialBaseMeshFlightsForDate(dateRef);
    const updated = [...list, ...initial];
    localStorage.setItem('contingency_malha_dia', JSON.stringify(updated));
    return initial;
  }
  return filtered;
};

const saveLocalBaseMeshFlights = (list: MeshFlight[]) => {
  localStorage.setItem('contingency_malha_dia', JSON.stringify(list));
};

const getInitialOperationalFlightsForDate = (dateRef: string): FlightData[] => {
  const baseMesh = getLocalBaseMeshFlights(dateRef);
  return baseMesh.map((f, i) => ({
    id: `f-local-${dateRef}-${i}`,
    date: dateRef,
    flightNumber: f.flightNumber || f.departureFlightNumber,
    departureFlightNumber: f.departureFlightNumber,
    airline: f.airline,
    airlineCode: f.airlineCode,
    model: f.model,
    registration: f.registration,
    origin: 'SBSP',
    destination: f.destination,
    eta: f.eta,
    etd: f.etd,
    actualArrivalTime: f.actualArrivalTime,
    positionId: f.positionId,
    positionType: 'SRV',
    fuelStatus: 0,
    status: FlightStatus.CHEGADA,
    logs: [],
    volume: 0,
    isOnGround: true,
    isExcludedFromQueue: false,
    report: {}
  }));
};

const getLocalOperationalFlights = (dateRef: string): FlightData[] => {
  const saved = localStorage.getItem('contingency_malha_operacional');
  let list: FlightData[] = [];
  if (saved) {
    try {
      list = JSON.parse(saved);
    } catch {
      list = [];
    }
  }
  const filtered = list.filter(f => f.date === dateRef);
  if (filtered.length === 0) {
    const initial = getInitialOperationalFlightsForDate(dateRef);
    const updated = [...list, ...initial];
    localStorage.setItem('contingency_malha_operacional', JSON.stringify(updated));
    return initial;
  }
  return filtered;
};

const saveLocalOperationalFlights = (list: FlightData[]) => {
  localStorage.setItem('contingency_malha_operacional', JSON.stringify(list));
};

// === MEMORY CACHE ===
let operatorsCache: { id: string; warName: string }[] = [];
let vehiclesCache: { id: string; fleetNumber: string }[] = [];

// === REGRAS DE RETOUR / IMPLEMENTATION ===

export interface AuditLogEntry {
  entity_type: string;
  entity_id?: string;
  action_type: string;
  flight_number?: string;
  flight_date?: string;
  registration?: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  user_name?: string;
  user_role?: string;
  metadata?: any;
}

export const insertAuditLog = async (logData: AuditLogEntry): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    let safeEntityId = null;
    if (logData.entity_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logData.entity_id)) {
      safeEntityId = logData.entity_id;
    }
    
    const metadata = logData.metadata || {};
    if (logData.entity_id && !safeEntityId) {
      metadata.frontend_id = logData.entity_id;
    }

    const payload = { ...logData, entity_id: safeEntityId, metadata };
    const { error } = await supabase.from('caixa_preta').insert([payload]);
    if (error) {
      console.warn('[Audit Log] Failed backend insert, logging locally:', error.message);
    }
  } catch (err) {
    console.warn('[Audit Log] Local fallback logger:', err);
  }
};

export const getAuditLogs = async (limitCount: number = 1000): Promise<AuditLogEntry[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('caixa_preta')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitCount);
      
    if (error) {
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
};

export const getDestinos = async (): Promise<any[]> => {
  if (!isSupabaseConfigured()) return INITIAL_DESTINOS;
  try {
    const { data: destData, error: destError } = await supabase.from('destinos').select('*');
    if (destError) throw destError;
    return destData || INITIAL_DESTINOS;
  } catch (err) {
    console.warn('[Supabase] Usando destinos de contingência local:', err);
    return INITIAL_DESTINOS;
  }
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  if (!isSupabaseConfigured()) return getLocalVehicles();
  try {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    
    const mapped = data.map((v: any) => ({
      id: v.fleet_number?.toString() || v.id?.toString(),
      type: v.type?.toString().toUpperCase() === 'CTA' ? 'CTA' : 'SERVIDOR',
      manufacturer: v.manufacturer,
      status: v.status,
      maxFlowRate: v.max_flow_rate || 1000,
      hasPlatform: v.has_platform,
      capacity: v.capacity,
      counterInitial: v.counter_initial,
      counterFinal: v.counter_final,
      isActive: v.status !== 'INATIVO',
      observations: v.observations,
      operatorId: v.operator_id
    })) as Vehicle[];

    vehiclesCache = data.map((v: any) => ({
      id: v.id,
      fleetNumber: v.fleet_number?.toString()
    }));
    return mapped;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Tabela "vehicles" indisponível no Supabase. Servindo dados do cache local.');
    } else {
      console.warn('[Supabase Error] getVehicles falhou:', err.message);
    }
    const local = getLocalVehicles();
    vehiclesCache = local.map(v => ({ id: v.id, fleetNumber: v.id }));
    return local;
  }
};

export const updateVehicleOperator = async (vehicleFleetNumber: string | null, operatorId: string | null) => {
  if (!isSupabaseConfigured()) return;
  try {
    if (vehicleFleetNumber === null && operatorId) {
      await supabase.from('vehicles').update({ operator_id: null }).eq('operator_id', operatorId);
      return;
    }
    
    if (vehicleFleetNumber && operatorId === null) {
      const cleanVehicleId = vehicleFleetNumber.replace('SRV-', '').replace('CTA-', '');
      const vehicle = vehiclesCache.find(v => v.fleetNumber === cleanVehicleId || v.id === vehicleFleetNumber);
      if (vehicle) {
        await supabase.from('vehicles').update({ operator_id: null }).eq('id', vehicle.id);
      } else {
        await supabase.from('vehicles').update({ operator_id: null }).eq('id', vehicleFleetNumber);
      }
      return;
    }
    
    if (vehicleFleetNumber && operatorId) {
      await supabase.from('vehicles').update({ operator_id: null }).eq('operator_id', operatorId);
      
      const cleanVehicleId = vehicleFleetNumber.replace('SRV-', '').replace('CTA-', '');
      const vehicle = vehiclesCache.find(v => v.fleetNumber === cleanVehicleId || v.id === vehicleFleetNumber);
      
      if (vehicle) {
        await supabase.from('vehicles').update({ operator_id: operatorId }).eq('id', vehicle.id);
      } else {
        await supabase.from('vehicles').update({ operator_id: operatorId }).eq('id', vehicleFleetNumber);
      }
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Salvando associação veículo-operador no cache local.');
      const local = getLocalVehicles();
      if (vehicleFleetNumber === null && operatorId) {
        local.forEach(v => {
          if (v.operatorId === operatorId) v.operatorId = undefined;
        });
      } else if (vehicleFleetNumber && operatorId === null) {
        const entry = local.find(v => v.id === vehicleFleetNumber);
        if (entry) entry.operatorId = undefined;
      } else if (vehicleFleetNumber && operatorId) {
        local.forEach(v => {
          if (v.operatorId === operatorId) v.operatorId = undefined;
        });
        const entry = local.find(v => v.id === vehicleFleetNumber);
        if (entry) entry.operatorId = operatorId;
      }
      saveLocalVehicles(local);
    }
  }
};

export const getOperators = async (): Promise<OperatorProfile[]> => {
  if (!isSupabaseConfigured()) return getLocalOperators();
  try {
    const { data, error } = await supabase.from('operators').select('*, operator_work_days(work_date, day_type)');
    if (error) throw error;
    
    operatorsCache = data.map((o: any) => ({ id: o.id, warName: o.war_name }));

    return data.map((o: any) => ({
      id: o.id,
      fullName: o.full_name,
      warName: o.war_name,
      companyId: o.company_id || '',
      gruId: o.gru_id || '',
      vestNumber: o.vest_number || '',
      photoUrl: o.photo_url || '',
      email: o.email || '',
      isLT: o.is_lt || 'NÃO',
      isUsuario: 'is_usuario' in o ? !!o.is_usuario : (o.is_lt === 'SIM'),
      isAdministrador: !!o.is_administrador,
      isMaster: !!o.is_master,
      patio: o.patio || '',
      tmfLogin: o.tmf_login || '',
      bloodType: o.blood_type || '',
      role: o.role || '',
      status: o.status,
      category: o.category,
      lastPosition: '',
      fleetCapability: o.fleet_capability,
      shift: {
        cycle: o.shift_cycle,
        start: o.shift_start || '',
        end: o.shift_end || ''
      },
      airlines: ['G3'],
      ratings: { speed: 4.5, safety: 5.0, airlineSpecific: {} },
      expertise: { servidor: 80, cta: 50 },
      stats: { flightsWeekly: 0, flightsMonthly: 0, volumeWeekly: 0, volumeMonthly: 0 },
      workDays: o.oper_do_dia?.map((wd: any) => ({
        date: wd.work_date,
        type: wd.day_type || 'TRABALHO'
      })) || []
    })) as OperatorProfile[];
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Tabela "operators" indisponível. Servindo dados do cache local.');
    } else {
      console.warn('[Supabase Error] getOperators falhou:', err.message);
    }
    const local = getLocalOperators();
    operatorsCache = local.map(o => ({ id: o.id, warName: o.warName }));
    return local;
  }
};

export const updateOperatorWorkDays = async (operatorId: string, workDays: Array<{ date: string; type: string }>): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error: deleteError } = await supabase
      .from('operator_work_days')
      .delete()
      .eq('operator_id', operatorId);
      
    if (deleteError) throw deleteError;
    
    if (workDays.length === 0) return;
    
    const insertPayload = workDays.map(wd => ({
      operator_id: operatorId,
      work_date: wd.date,
      day_type: wd.type
    }));

    const { error: insertError } = await supabase.from('operator_work_days').insert(insertPayload);
    if (insertError) throw insertError;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Salvando escala de trabalho localmente.');
      const operators = getLocalOperators();
      const op = operators.find(o => o.id === operatorId);
      if (op) {
        op.workDays = workDays.map(wd => ({ date: wd.date, type: wd.type as any }));
        saveLocalOperators(operators);
      }
    } else {
      throw err;
    }
  }
};

export const getAircrafts = async (): Promise<AircraftType[]> => {
  if (!isSupabaseConfigured()) return INITIAL_AERONAVES;
  try {
    const { data, error } = await supabase
      .from('company_aircraft')
      .select(`
        id,
        prefix,
        company_id,
        companies (
          id,
          name,
          code
        ),
        aircraft_type_id,
        aircraft_types (
          id,
          model,
          manufacturer
        )
      `)
      .order('prefix');
      
    if (error) throw error;
    
    return (data || []).map((da: any) => ({
      id: da.id,
      prefix: da.prefix || '',
      model: da.aircraft_types?.model || 'Desconhecido',
      airline: da.companies?.name || 'Desconhecido',
      companhia_id: da.company_id,
      missing_cap: false,
      defective_door: false,
      defective_panel: false,
      no_autocut: false,
      observations: ''
    }));
  } catch (err: any) {
    console.warn('[Supabase] Erro ao carregar aeronaves, servindo do contingenciamento:', err);
    return INITIAL_AERONAVES;
  }
};

export const insertAircraft = async (aircraft: Omit<AircraftType, 'id'>): Promise<AircraftType> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }

  // 1. Resolve Company
  let companyId = aircraft.companhia_id;
  if (!companyId) {
    const { data: extComp } = await supabase
      .from('companies')
      .select('id')
      .eq('name', aircraft.airline)
      .limit(1);
    if (extComp && extComp.length > 0) {
      companyId = extComp[0].id;
    } else {
      const code = aircraft.airline.substring(0, 3).toUpperCase();
      const { data: newComp, error: insCompErr } = await supabase
        .from('companies')
        .insert({ name: aircraft.airline, code })
        .select('id')
        .single();
      if (!insCompErr && newComp) {
        companyId = newComp.id;
      }
    }
  }

  // 2. Resolve Aircraft Type
  let aircraftTypeId: string | null = null;
  const { data: extType } = await supabase
    .from('aircraft_types')
    .select('id')
    .eq('model', aircraft.model)
    .limit(1);
  if (extType && extType.length > 0) {
    aircraftTypeId = extType[0].id;
  } else {
    const { data: newType, error: insTypeErr } = await supabase
      .from('aircraft_types')
      .insert({ model: aircraft.model, manufacturer: 'Outros' })
      .select('id')
      .single();
    if (!insTypeErr && newType) {
      aircraftTypeId = newType.id;
    }
  }

  // 3. Insert into company_aircraft
  const { data: newAc, error: acErr } = await supabase
    .from('company_aircraft')
    .insert({
      prefix: aircraft.prefix,
      company_id: companyId,
      aircraft_type_id: aircraftTypeId
    })
    .select(`
      id,
      prefix,
      company_id,
      companies (
        id,
        name,
        code
      ),
      aircraft_type_id,
      aircraft_types (
        id,
        model
      )
    `)
    .single();

  if (acErr) throw acErr;

  return {
    id: newAc.id,
    prefix: newAc.prefix || '',
    model: newAc.aircraft_types?.model || aircraft.model,
    airline: newAc.companies?.name || aircraft.airline,
    companhia_id: newAc.company_id,
    missing_cap: false,
    defective_door: false,
    defective_panel: false,
    no_autocut: false,
    observations: ''
  };
};

export const updateAircraftField = async (id: string, field: keyof AircraftType, value: any): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  if (id.startsWith('temp-')) return;

  if (field === 'prefix') {
    const { error } = await supabase.from('company_aircraft').update({ prefix: value }).eq('id', id);
    if (error) throw error;
  } else if (field === 'airline') {
    const { data: extComp } = await supabase.from('companies').select('id').eq('name', value).limit(1);
    let companyId = extComp && extComp.length > 0 ? extComp[0].id : null;
    if (!companyId) {
      const code = value.substring(0, 3).toUpperCase();
      const { data: newComp } = await supabase.from('companies').insert({ name: value, code }).select('id').single();
      if (newComp) companyId = newComp.id;
    }
    if (companyId) {
      const { error } = await supabase.from('company_aircraft').update({ company_id: companyId }).eq('id', id);
      if (error) throw error;
    }
  } else if (field === 'model') {
    const { data: extType } = await supabase.from('aircraft_types').select('id').eq('model', value).limit(1);
    let typeId = extType && extType.length > 0 ? extType[0].id : null;
    if (!typeId) {
      const { data: newType } = await supabase.from('aircraft_types').insert({ model: value, manufacturer: 'Outros' }).select('id').single();
      if (newType) typeId = newType.id;
    }
    if (typeId) {
      const { error } = await supabase.from('company_aircraft').update({ aircraft_type_id: typeId }).eq('id', id);
      if (error) throw error;
    }
  }
};

export const deleteAircraft = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('company_aircraft').delete().eq('id', id);
  if (error) throw error;
};

export const getFlights = async (dateRef: string): Promise<FlightData[]> => {
  if (!isSupabaseConfigured()) return getLocalOperationalFlights(dateRef);
  try {
    const { data, error } = await supabase
      .from('flights')
      .select(`
        *,
        operators (war_name),
        companies (name, code),
        company_aircraft (
          id,
          prefix,
          aircraft_types (id, model)
        )
      `)
      .eq('date', dateRef);
      
    if (error) throw error;
    
    return (data || []).map((f: any) => ({
      id: f.id,
      date: f.date,
      flightNumber: f.flight_number,
      departureFlightNumber: f.departure_flight_number,
      airline: f.companies?.name || f.airline || '',
      airlineCode: f.companies?.code || f.airline_code || '',
      model: f.company_aircraft?.aircraft_types?.model || f.model || '',
      registration: f.company_aircraft?.prefix || f.registration || '',
      origin: f.origin,
      destination: f.destination,
      eta: f.eta || '',
      etd: f.etd || '',
      actualArrivalTime: f.actual_arrival_time,
      positionId: f.position_id,
      positionType: f.position_type as any || 'PONTE_P70',
      pitId: f.pit_id,
      wingSide: f.wing_side as any || 'LEFT',
      fuelStatus: f.fuel_status || 0,
      status: f.status as FlightStatus,
      operator: f.operators?.war_name || f.operator,
      operatorId: f.operator_id || undefined,
      supportOperator: f.support_operator || undefined,
      supportOperatorId: f.support_operator_id || undefined,
      fleet: f.vehicle_id || undefined,
      vehicleId: f.vehicle_id || undefined,
      vehicleType: f.vehicle_type as any,
      volume: f.volume,
      isOnGround: f.is_on_ground,
      delayJustification: f.delay_justification,
      designationTime: f.designation_time ? new Date(f.designation_time) : undefined,
      startTime: f.start_time ? new Date(f.start_time) : undefined,
      endTime: f.end_time ? new Date(f.end_time) : undefined,
      assignmentTime: f.assignment_time ? new Date(f.assignment_time) : undefined,
      assignedByLt: f.assigned_by_lt,
      isExcludedFromQueue: f.is_excluded_from_queue,
      logs: f.logs || [],
      report: f.report || {}
    })) as FlightData[];
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Tabela "flights" ausente. Servindo malha do cache local.');
    } else {
      console.warn('[Supabase Error] getFlights falhou:', err.message);
    }
    return getLocalOperationalFlights(dateRef);
  }
};

export const deleteAllFlightsByDate = async (dateRef: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('flights').delete().eq('date', dateRef);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = localStorage.getItem('contingency_malha_operacional');
      if (saved) {
        const list: FlightData[] = JSON.parse(saved);
        const filtered = list.filter(f => f.date !== dateRef);
        saveLocalOperationalFlights(filtered);
      }
    }
  }
};

export const deleteInactiveFlightsByDate = async (dateRef: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('date', dateRef)
      .is('operator_id', null)
      .in('status', ['CHEGADA', 'FILA']);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = localStorage.getItem('contingency_malha_operacional');
      if (saved) {
        const list: FlightData[] = JSON.parse(saved);
        const kept = list.filter(f => {
          if (f.date === dateRef && !f.operatorId && (f.status === 'CHEGADA' || f.status === 'FILA')) {
            return false;
          }
          return true;
        });
        saveLocalOperationalFlights(kept);
      }
    }
  }
};

const cleanTime = (timeStr: string | null | undefined): string | null => {
  if (!timeStr) return '00:00';
  const t = timeStr.trim().toUpperCase();
  if (t === '?' || t === 'PRÉ' || t === '' || !t.match(/^[0-9]{1,2}:[0-9]{2}/)) {
    return '00:00';
  }
  return t;
};

export const upsertFlight = async (flight: FlightData): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  // Resolve company_id
  let companyId: string | null = null;
  if (flight.airlineCode) {
    const { data: cData } = await supabase.from('companies').select('id').eq('code', flight.airlineCode).limit(1);
    if (cData && cData.length > 0) {
      companyId = cData[0].id;
    }
  }

  // Resolve company_aircraft_id
  let companyAircraftId: string | null = null;
  if (flight.registration) {
    const { data: acData } = await supabase.from('company_aircraft').select('id').eq('prefix', flight.registration).limit(1);
    if (acData && acData.length > 0) {
      companyAircraftId = acData[0].id;
    } else if (flight.registration && companyId) {
      const { data: extType } = await supabase.from('aircraft_types').select('id').eq('model', flight.model || 'Unknown').limit(1);
      let typeId = extType && extType.length > 0 ? extType[0].id : null;
      if (!typeId) {
        const { data: newType } = await supabase.from('aircraft_types').insert({ model: flight.model || 'Unknown', manufacturer: 'Unknown' }).select('id').single();
        if (newType) typeId = newType.id;
      }
      const { data: newAc } = await supabase.from('company_aircraft').insert({ prefix: flight.registration, company_id: companyId, aircraft_type_id: typeId }).select('id').single();
      if (newAc) companyAircraftId = newAc.id;
    }
  }

  const payload: any = {
    date: flight.date || getLocalTodayDateStr(),
    flight_number: flight.flightNumber,
    departure_flight_number: flight.departureFlightNumber,
    origin: flight.origin,
    destination: flight.destination,
    eta: cleanTime(flight.eta),
    etd: cleanTime(flight.etd),
    actual_arrival_time: cleanTime(flight.actualArrivalTime),
    position_id: flight.positionId,
    fuel_status: flight.fuelStatus,
    status: flight.status,
    operator_id: (
      flight.operatorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.operatorId)
        ? flight.operatorId
        : (flight.operator ? operatorsCache.find(o => o.warName === flight.operator)?.id : null)
    ) || null,
    support_operator_id: (
      flight.supportOperatorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.supportOperatorId)
        ? flight.supportOperatorId
        : (flight.supportOperator ? operatorsCache.find(o => o.warName === flight.supportOperator)?.id : null)
    ) || null,
    vehicle_id: flight.vehicleId || null,
    volume: flight.volume || 0,
    is_on_ground: flight.isOnGround || false,
    delay_justification: flight.delayJustification || null,
    designation_time: flight.designationTime?.toISOString() || null,
    start_time: flight.startTime?.toISOString() || null,
    end_time: flight.endTime?.toISOString() || null,
    assignment_time: flight.assignmentTime?.toISOString() || null,
    assigned_by_lt: flight.assignedByLt || null,
    is_excluded_from_queue: flight.isExcludedFromQueue || false,
    report: flight.report || {},
    logs: flight.logs || [],
    company_id: companyId,
    company_aircraft_id: companyAircraftId,
    updated_at: new Date().toISOString()
  };

  if (flight.id) {
    payload.id = flight.id;
  }

  try {
    const { data, error } = await supabase.from('flights').upsert([payload]).select('id');
    if (error) throw error;
    if (data && data.length === 0) {
      throw new Error("Sincronização RLS bloqueada no Supabase.");
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Upsertando voo operacional no cache de contingência.');
      const local = getLocalOperationalFlights(flight.date || getLocalTodayDateStr());
      
      const payloadFlight: FlightData = {
        ...flight,
        id: flight.id || `f-local-${flight.date || getLocalTodayDateStr()}-${Date.now()}`,
        date: flight.date || getLocalTodayDateStr()
      };

      const saved = localStorage.getItem('contingency_malha_operacional');
      let fullList: FlightData[] = saved ? JSON.parse(saved) : [];
      
      const index = fullList.findIndex(f => f.id === payloadFlight.id || (f.flightNumber === payloadFlight.flightNumber && f.date === payloadFlight.date));
      if (index >= 0) {
        fullList[index] = payloadFlight;
      } else {
        fullList.push(payloadFlight);
      }
      saveLocalOperationalFlights(fullList);
    } else {
      console.error('[Supabase Error] Upsert falhou:', err);
    }
  }
};

export const deleteFlight = async (flightId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('flights').delete().eq('id', flightId);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = localStorage.getItem('contingency_malha_operacional');
      if (saved) {
        const list: FlightData[] = JSON.parse(saved);
        const filtered = list.filter(f => f.id !== flightId);
        saveLocalOperationalFlights(filtered);
      }
    }
  }
};

export const getRootMesh = async (): Promise<MeshFlight[]> => {
  if (!isSupabaseConfigured()) return getLocalRootMesh();
  try {
    // 1. Tenta usar a RPC get_root_mesh do V9
    const { data, error } = await supabase.rpc('get_root_mesh');
    if (!error && data) {
      return data.map((f: any) => ({
        id: f.mesh_id,
        airline: f.company_name || 'OUTRA',
        airlineCode: f.company_code || 'OUTRA',
        flightNumber: f.departure_flight_number,
        departureFlightNumber: f.departure_flight_number,
        destination: f.destination,
        etd: f.etd,
        registration: f.prefix || '',
        eta: f.eta || '',
        positionId: f.position_code || '',
        actualArrivalTime: '',
        model: f.aircraft_model || '',
        disabled: f.disabled || false,
        cia: f.company_code
      })) as MeshFlight[];
    }

    // 2. Se a RPC falhar, faz uma query direta fazendo o join das tabelas novas do V9
    const { data: directData, error: directError } = await supabase
      .from('root_mesh_flights')
      .select(`
        id,
        arrival_flight_number,
        departure_flight_number,
        destination,
        etd,
        eta,
        disabled,
        is_new,
        company_id,
        companies (
          name,
          code
        ),
        company_aircraft_id,
        company_aircraft (
          prefix,
          model_display,
          aircraft_types (
            model
          )
        ),
        position_id,
        positions (
          code
        )
      `)
      .order('etd');
      
    if (directError) throw directError;

    return (directData || []).map((f: any) => {
      const model = f.company_aircraft?.model_display || f.company_aircraft?.aircraft_types?.model || '';
      return {
        id: f.id,
        airline: f.companies?.name || 'OUTRA',
        airlineCode: f.companies?.code || 'OUTRA',
        flightNumber: f.departure_flight_number || f.arrival_flight_number,
        departureFlightNumber: f.departure_flight_number || f.arrival_flight_number,
        destination: f.destination,
        etd: f.etd,
        registration: f.company_aircraft?.prefix || '',
        eta: f.eta || '',
        positionId: f.positions?.code || f.position_id || '',
        actualArrivalTime: '',
        model: model,
        disabled: f.disabled || false,
        cia: f.companies?.code
      };
    }) as MeshFlight[];
  } catch (err: any) {
    console.warn('[Supabase] Erro ao carregar getRootMesh, fallback de contingência:', err);
    return getLocalRootMesh();
  }
};

export const upsertRootMesh = async (flights: MeshFlight[]): Promise<void> => {
  if (!isSupabaseConfigured() || !flights.length) return;
  
  try {
    // 1. Carrega dados de apoio para mapeamento relacional do V9
    const [companiesRes, aircraftsRes, positionsRes] = await Promise.all([
      supabase.from('companies').select('id, code'),
      supabase.from('company_aircraft').select('id, prefix'),
      supabase.from('positions').select('id, code')
    ]);

    const compList = companiesRes.data || [];
    const airList = aircraftsRes.data || [];
    const posList = positionsRes.data || [];

    const payload = flights.map(f => {
      const ciaCode = (f.airlineCode || f.airline || '').toUpperCase().trim();
      
      // Encontra ID da companhia
      const matchedCompany = compList.find(c => c.code.toUpperCase() === ciaCode);
      const company_id = matchedCompany ? matchedCompany.id : 'comp-latam'; // fallback genérico

      // Encontra ID da aeronave pelo prefixo
      const cleanReg = (f.registration || '').toUpperCase().trim();
      const matchedAc = airList.find(a => a.prefix.toUpperCase() === cleanReg);
      const company_aircraft_id = matchedAc ? matchedAc.id : null;

      // Encontra ID da posição (ex: "pos-205" ou "205")
      const cleanPos = (f.positionId || f.positionType || '').toUpperCase().trim();
      const matchedPos = posList.find(p => p.code.toUpperCase() === cleanPos || p.id.toUpperCase() === cleanPos);
      const position_id = matchedPos ? matchedPos.id : null;

      const obj: any = {
        id: f.id || `mr-${f.departureFlightNumber.toLowerCase()}`,
        company_id,
        company_aircraft_id,
        arrival_flight_number: f.flightNumber || f.departureFlightNumber,
        departure_flight_number: f.departureFlightNumber || f.flightNumber,
        destination: f.destination || 'SBGR',
        etd: cleanTime(f.etd),
        eta: cleanTime(f.eta),
        position_id,
        disabled: f.disabled || false,
        is_new: f.isNew || false,
        updated_at: new Date().toISOString()
      };
      return obj;
    });

    // Deduplica por departure_flight_number
    const seen = new Set();
    const finalPayload = [];
    for (const item of payload) {
      if (!item.departure_flight_number) continue;
      if (!seen.has(item.departure_flight_number)) {
        seen.add(item.departure_flight_number);
        finalPayload.push(item);
      }
    }

    const { error } = await supabase.from('root_mesh_flights').upsert(finalPayload);
    if (error) throw error;
  } catch (err: any) {
    console.warn('[Supabase] erro no upsertRootMesh, fallback de contingência local:', err);
    saveLocalRootMesh(flights);
  }
};

export const deleteRootMeshFlight = async (flightId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('root_mesh_flights').delete().eq('id', flightId);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = getLocalRootMesh();
      const filtered = saved.filter(f => f.id !== flightId);
      saveLocalRootMesh(filtered);
    }
  }
};

export const clearRootMesh = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('root_mesh_flights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      saveLocalRootMesh([]);
    }
  }
};

export const getBaseMeshFlights = async (dateRef: string): Promise<MeshFlight[]> => {
  if (!isSupabaseConfigured()) return getLocalBaseMeshFlights(dateRef);
  try {
    const { data, error } = await supabase
      .from('mesh_flights')
      .select(`
        id,
        root_mesh_id,
        mesh_date,
        company_aircraft_id,
        company_aircraft (
          prefix,
          model_display,
          aircraft_types (
            model
          )
        ),
        eta,
        position_id,
        actual_arrival_time,
        disabled,
        is_new,
        root_mesh_flights (
          id,
          arrival_flight_number,
          departure_flight_number,
          destination,
          etd,
          company_id,
          companies (
            name,
            code
          )
        )
      `)
      .eq('mesh_date', dateRef);
       
    if (error) throw error;
    
    return (data || []).map(dbFlight => {
      const root = dbFlight.root_mesh_flights as any || {};
      const company = root.companies || {};
      const aircraft = dbFlight.company_aircraft as any || {};
      const model = aircraft.model_display || aircraft.aircraft_types?.model || '';
      
      return {
        id: dbFlight.id,
        date: dbFlight.mesh_date || dateRef,
        root_mesh_id: dbFlight.root_mesh_id,
        airline: company.name || '',
        airlineCode: company.code || '',
        flightNumber: root.arrival_flight_number || root.departure_flight_number || '',
        departureFlightNumber: root.departure_flight_number || root.arrival_flight_number || '',
        destination: root.destination || '',
        etd: root.etd || '00:00',
        registration: aircraft.prefix || '',
        eta: dbFlight.eta || root.eta || '00:00',
        positionId: dbFlight.position_id || '',
        actualArrivalTime: dbFlight.actual_arrival_time || '',
        model: model,
        disabled: dbFlight.disabled || false,
        isNew: dbFlight.is_new || false
      };
    });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao carregar getBaseMeshFlights, fallback local:', err);
    return getLocalBaseMeshFlights(dateRef);
  }
};

export const upsertBaseMeshFlights = async (flightsBase: MeshFlight[]): Promise<void> => {
  if (!isSupabaseConfigured() || !flightsBase.length) return;
  
  try {
    const [roofRes, acRes] = await Promise.all([
      supabase.from('root_mesh_flights').select('id, departure_flight_number'),
      supabase.from('company_aircraft').select('id, prefix')
    ]);
    const rootFlights = roofRes.data || [];
    const aircrafts = acRes.data || [];

    const dateRef = flightsBase[0].date || getLocalTodayDateStr();

    let payload = flightsBase.map(f => {
      const flightNum = (f.departureFlightNumber || f.flightNumber || '').toUpperCase().trim();
      const matchedRoot = rootFlights.find(r => r.departure_flight_number.toUpperCase().trim() === flightNum);
      const root_mesh_id = matchedRoot ? matchedRoot.id : f.id || null;

      const reg = (f.registration || '').toUpperCase().trim();
      const matchedAc = aircrafts.find(a => a.prefix.toUpperCase().trim() === reg);
      const company_aircraft_id = matchedAc ? matchedAc.id : null;

      const obj: any = {
        id: f.id && !f.id.toString().startsWith('mesh-') && !f.id.toString().startsWith('temp-') 
          ? f.id 
          : `mesh-${f.date || dateRef}-${flightNum.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        root_mesh_id,
        mesh_date: f.date || dateRef,
        company_aircraft_id,
        eta: cleanTime(f.eta),
        position_id: f.positionId || null,
        actual_arrival_time: cleanTime(f.actualArrivalTime),
        disabled: f.disabled || false,
        is_new: f.isNew || false,
        updated_at: new Date().toISOString()
      };
      return obj;
    });

    const { error } = await supabase.from('mesh_flights').upsert(payload);
    if (error) throw error;
  } catch (err: any) {
    console.warn('[Supabase] erro no upsertBaseMeshFlights, fallback local:', err);
    saveLocalBaseMeshFlights(flightsBase);
  }
};

export const clearBaseMeshFlights = async (dateRef: string): Promise<void> => {
   if (!isSupabaseConfigured()) return;
   try {
     const { error } = await supabase.from('mesh_flights').delete().eq('mesh_date', dateRef);
     if (error) throw error;
   } catch (err: any) {
     if (isTableMissingError(err)) {
       const saved = localStorage.getItem('contingency_malha_dia');
       if (saved) {
         const list: MeshFlight[] = JSON.parse(saved);
         const filtered = list.filter(f => f.date !== dateRef);
         saveLocalBaseMeshFlights(filtered);
       }
     }
   }
};

export const clearAllBaseMeshFlights = async (): Promise<void> => {
   if (!isSupabaseConfigured()) return;
   try {
     const { error } = await supabase.from('mesh_flights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
     if (error) throw error;
   } catch (err: any) {
     if (isTableMissingError(err)) {
       saveLocalBaseMeshFlights([]);
     }
   }
};

export const bulkInsertFlights = async (flights: FlightData[]): Promise<void> => {
  if (!isSupabaseConfigured() || !flights.length) return;
  
  try {
    const uniqueCodes = Array.from(new Set(flights.map(f => f.airlineCode).filter(Boolean)));
    const companyMap: Record<string, string> = {};
    if (uniqueCodes.length > 0) {
      const { data: cos } = await supabase.from('companies').select('id, code').in('code', uniqueCodes);
      if (cos) {
        cos.forEach((c: any) => { companyMap[c.code] = c.id; });
      }
    }
    
    const uniqueRegs = Array.from(new Set(flights.map(f => f.registration).filter(Boolean)));
    const aircraftMap: Record<string, string> = {};
    if (uniqueRegs.length > 0) {
      const { data: acs } = await supabase.from('company_aircraft').select('id, prefix').in('prefix', uniqueRegs);
      if (acs) {
        acs.forEach((a: any) => { aircraftMap[a.prefix] = a.id; });
      }
    }

    const payload = flights.map(flight => {
      const obj: any = {
        date: flight.date || getLocalTodayDateStr(),
        flight_number: flight.flightNumber,
        departure_flight_number: flight.departureFlightNumber,
        origin: flight.origin,
        destination: flight.destination,
        eta: cleanTime(flight.eta),
        etd: cleanTime(flight.etd),
        actual_arrival_time: cleanTime(flight.actualArrivalTime),
        position_id: flight.positionId,
        fuel_status: flight.fuelStatus,
        status: flight.status,
        operator_id: (
          flight.operatorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.operatorId)
            ? flight.operatorId
            : (flight.operator ? operatorsCache.find(o => o.warName === flight.operator)?.id : null)
        ) || null,
        support_operator_id: (
          flight.supportOperatorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.supportOperatorId)
            ? flight.supportOperatorId
            : (flight.supportOperator ? operatorsCache.find(o => o.warName === flight.supportOperator)?.id : null)
        ) || null,
        vehicle_id: flight.vehicleId || null,
        volume: flight.volume || 0,
        is_on_ground: flight.isOnGround || false,
        delay_justification: flight.delayJustification || null,
        designation_time: flight.designationTime?.toISOString() || null,
        start_time: flight.startTime?.toISOString() || null,
        end_time: flight.endTime?.toISOString() || null,
        assignment_time: flight.assignmentTime?.toISOString() || null,
        assigned_by_lt: flight.assignedByLt || null,
        is_excluded_from_queue: flight.isExcludedFromQueue || false,
        report: flight.report || {},
        logs: flight.logs || [],
        company_id: flight.airlineCode ? companyMap[flight.airlineCode] || null : null,
        company_aircraft_id: flight.registration ? aircraftMap[flight.registration] || null : null,
        updated_at: new Date().toISOString()
      };
      if (flight.id) {
         obj.id = flight.id;
      }
      return obj;
    });

    const { error } = await supabase.from('flights').upsert(payload);
    if (error) throw error;
  } catch (err: any) {
    console.warn('[Supabase] bulkInsertFlights falhou, fallback local:', err.message);
    const saved = localStorage.getItem('contingency_malha_operacional');
    let currentList: FlightData[] = saved ? JSON.parse(saved) : [];
    
    flights.forEach(flight => {
      const index = currentList.findIndex(f => f.id === flight.id || (f.flightNumber === flight.flightNumber && f.date === flight.date));
      if (index >= 0) {
        currentList[index] = flight;
      } else {
        currentList.push(flight);
      }
    });
    saveLocalOperationalFlights(currentList);
  }
};

export const getAerodromoConfig = async (): Promise<any> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('aerodromo_config').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err: any) {
    return null;
  }
};

export const updateAerodromoConfig = async (configPayload: any): Promise<void> => {
   if (!isSupabaseConfigured()) return;
   try {
     const { data } = await supabase.from('aerodromo_config').select('id').limit(1).single();
     if (data) {
        await supabase.from('aerodromo_config').update({ ...configPayload, updated_at: new Date().toISOString() }).eq('id', data.id);
     } else {
        await supabase.from('aerodromo_config').insert([configPayload]);
     }
   } catch (err) {
     // Configurações salvas localmente
   }
};

export const clearFlightPosition = async (flightId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from('malha_operacional')
      .update({ position_id: null, pit_id: null, position_type: null })
      .eq('id', flightId);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = localStorage.getItem('contingency_malha_operacional');
      if (saved) {
        const list: FlightData[] = JSON.parse(saved);
        const flight = list.find(f => f.id === flightId);
        if (flight) {
          flight.positionId = '';
          flight.pitId = undefined;
          flight.positionType = undefined;
        }
        saveLocalOperationalFlights(list);
      }
    }
  }
};

export const clearAllFlightAssignments = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { data: flightsToClear, error: fetchError } = await supabase
      .from('malha_operacional')
      .select('id')
      .not('position_id', 'is', null);

    if (fetchError) throw fetchError;

    if (flightsToClear && flightsToClear.length > 0) {
      const flightIds = flightsToClear.map(f => f.id);
      const { error: updateError } = await supabase
        .from('malha_operacional')
        .update({ position_id: null, pit_id: null, position_type: null })
        .in('id', flightIds);
      if (updateError) throw updateError;
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const saved = localStorage.getItem('contingency_malha_operacional');
      if (saved) {
        const list: FlightData[] = JSON.parse(saved);
        list.forEach(f => {
          f.positionId = '';
          f.pitId = undefined;
          f.positionType = undefined;
        });
        saveLocalOperationalFlights(list);
      }
    }
  }
};

export interface DbUserPreferences {
  user_id: string;
  visible_columns: Record<string, boolean>;
  visible_tabs: Record<string, boolean>;
  locked_columns: Record<string, boolean>;
  locked_tabs: Record<string, boolean>;
}

export const getUserLayoutPreferences = async (userId: string): Promise<DbUserPreferences | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('preferencias_layout_usuario')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as DbUserPreferences;
  } catch (err) {
    return null;
  }
};

export const saveUserLayoutPreferences = async (
  userId: string,
  visibleColumns: Record<string, boolean>,
  visibleTabs: Record<string, boolean>,
  lockedColumns: Record<string, boolean>,
  lockedTabs: Record<string, boolean>
): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const payload = {
      user_id: userId,
      visible_columns: visibleColumns,
      visible_tabs: visibleTabs,
      locked_columns: lockedColumns,
      locked_tabs: lockedTabs,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('preferencias_layout_usuario')
      .upsert([payload]);

    if (error) throw error;
  } catch (err: any) {
    // Layout preferences fallback is already handled in App.tsx via React/LocalStorage
  }
};
