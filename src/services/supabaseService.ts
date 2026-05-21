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
    const { data, error } = await supabase.from('frotas').select('*');
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
      console.info('[Modo Contingência] Tabela "frotas" indisponível no Supabase. Servindo dados do cache local.');
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
      await supabase.from('frotas').update({ operator_id: null }).eq('operator_id', operatorId);
      return;
    }
    
    if (vehicleFleetNumber && operatorId === null) {
      const cleanVehicleId = vehicleFleetNumber.replace('SRV-', '').replace('CTA-', '');
      const vehicle = vehiclesCache.find(v => v.fleetNumber === cleanVehicleId || v.id === vehicleFleetNumber);
      if (vehicle) {
        await supabase.from('frotas').update({ operator_id: null }).eq('id', vehicle.id);
      } else {
        await supabase.from('frotas').update({ operator_id: null }).eq('id', vehicleFleetNumber);
      }
      return;
    }
    
    if (vehicleFleetNumber && operatorId) {
      await supabase.from('frotas').update({ operator_id: null }).eq('operator_id', operatorId);
      
      const cleanVehicleId = vehicleFleetNumber.replace('SRV-', '').replace('CTA-', '');
      const vehicle = vehiclesCache.find(v => v.fleetNumber === cleanVehicleId || v.id === vehicleFleetNumber);
      
      if (vehicle) {
        await supabase.from('frotas').update({ operator_id: operatorId }).eq('id', vehicle.id);
      } else {
        await supabase.from('frotas').update({ operator_id: operatorId }).eq('id', vehicleFleetNumber);
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
    const { data, error } = await supabase.from('operadores_geral').select('*, oper_do_dia(work_date, day_type)');
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
      console.info('[Modo Contingência] Tabela "operadores_geral" indisponível. Servindo dados do cache local.');
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
      .from('oper_do_dia')
      .delete()
      .eq('operator_id', operatorId);
      
    if (deleteError) throw deleteError;
    
    if (workDays.length === 0) return;
    
    const insertPayload = workDays.map(wd => ({
      operator_id: operatorId,
      work_date: wd.date,
      day_type: wd.type
    }));

    const { error: insertError } = await supabase.from('oper_do_dia').insert(insertPayload);
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
    const { data, error } = await supabase.from('aeronaves').select('*');
    if (error) throw error;
    return data as any[];
  } catch (err: any) {
    console.info('[Modo Contingência] Tabela "aeronaves" indisponível. Servindo do contingenciamento.');
    return INITIAL_AERONAVES;
  }
};

export const getFlights = async (dateRef: string): Promise<FlightData[]> => {
  if (!isSupabaseConfigured()) return getLocalOperationalFlights(dateRef);
  try {
    const { data, error } = await supabase
      .from('malha_operacional')
      .select('*, operadores_geral(war_name), frotas(fleet_number)')
      .eq('date_ref', dateRef);
      
    if (error) throw error;
    
    return (data || []).map((f: any) => ({
      id: f.id,
      date: f.date_ref,
      flightNumber: f.flight_number,
      departureFlightNumber: f.departure_flight_number,
      airline: f.airline,
      airlineCode: f.airline_code,
      model: f.model,
      registration: f.registration,
      origin: f.origin,
      destination: f.destination,
      eta: f.eta || '',
      etd: f.etd || '',
      actualArrivalTime: f.actual_arrival_time,
      positionId: f.position_id,
      positionType: f.position_type as any,
      pitId: f.pit_id,
      wingSide: f.wing_side as any,
      fuelStatus: f.fuel_status || 0,
      status: f.status as FlightStatus,
      operator: f.operadores_geral?.war_name || f.operator,
      operatorId: f.operator_id || undefined,
      supportOperator: f.support_operator || undefined,
      supportOperatorId: f.support_operator_id || undefined,
      fleet: f.frotas?.fleet_number || undefined,
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
      console.info('[Modo Contingência] Tabela "malha_operacional" ausente. Servindo malha do cache local.');
    } else {
      console.warn('[Supabase Error] getFlights falhou:', err.message);
    }
    return getLocalOperationalFlights(dateRef);
  }
};

export const deleteAllFlightsByDate = async (dateRef: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('malha_operacional').delete().eq('date_ref', dateRef);
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
      .from('malha_operacional')
      .delete()
      .eq('date_ref', dateRef)
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
  
  const payload: any = {
    date_ref: flight.date || getLocalTodayDateStr(),
    flight_number: flight.flightNumber,
    departure_flight_number: flight.departureFlightNumber,
    airline: flight.airline,
    airline_code: flight.airlineCode,
    model: flight.model,
    registration: flight.registration,
    origin: flight.origin,
    destination: flight.destination,
    eta: cleanTime(flight.eta),
    etd: cleanTime(flight.etd),
    actual_arrival_time: cleanTime(flight.actualArrivalTime),
    position_id: flight.positionId,
    position_type: flight.positionType || null,
    pit_id: flight.pitId || null,
    wing_side: flight.wingSide || null,
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
    support_operator: flight.supportOperator || null,
    vehicle_id: (
      flight.vehicleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.vehicleId)
        ? flight.vehicleId
        : (flight.vehicleId ? vehiclesCache.find(v => v.fleetNumber === String(flight.vehicleId))?.id : null)
    ) || (
      flight.fleet
        ? vehiclesCache.find(v => v.fleetNumber === String(flight.fleet).replace('SRV-', '').replace('CTA-', ''))?.id
        : null
    ) || null,
    vehicle_type: flight.vehicleType || null,
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
    updated_at: new Date().toISOString()
  };

  if (flight.id) {
    payload.id = flight.id;
  }

  try {
    const { data, error } = await supabase.from('malha_operacional').upsert([payload]).select('id');
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
    const { error } = await supabase.from('malha_operacional').delete().eq('id', flightId);
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
    const { data, error } = await supabase.from('malha_raiz').select('*').order('etd');
    if (error) throw error;
    
    return (data || []).map((f: any) => ({
      id: f.id,
      airline: f.airline_code || 'OUTRA',
      airlineCode: f.airline_code || 'OUTRA',
      flightNumber: f.flight_number,
      departureFlightNumber: f.departure_flight_number || f.flight_number,
      destination: f.destination,
      etd: f.etd,
      registration: f.registration || '',
      eta: f.eta,
      positionId: f.position_id || '',
      actualArrivalTime: f.actual_arrival_time || '',
      model: f.model || '',
      disabled: f.is_disabled || false,
      cia: f.airline_code
    })) as MeshFlight[];
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Servindo malha_raiz de contingência.');
    }
    return getLocalRootMesh();
  }
};

export const upsertRootMesh = async (flights: MeshFlight[]): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  let payloadRaw = flights.map(f => {
    const obj: any = {
      flight_number: f.flightNumber || f.departureFlightNumber,
      airline_code: (f as any).cia || f.airline || f.airlineCode || '',
      destination: f.destination,
      etd: cleanTime(f.etd),
      eta: cleanTime(f.eta),
      registration: f.registration,
      model: f.model,
      position_id: f.positionId,
      actual_arrival_time: cleanTime(f.actualArrivalTime),
      is_disabled: f.disabled || false,
      updated_at: new Date().toISOString()
    };
    if (f.id) obj.id = f.id;
    return obj;
  });
  
  // Deduplicate
  const seenFlights = new Set();
  let payload = [];
  for (const p of payloadRaw) {
    if (!p.flight_number) continue;
    if (!seenFlights.has(p.flight_number)) {
      seenFlights.add(p.flight_number);
      payload.push(p);
    }
  }

  try {
    let maxAttempts = 10;
    while (maxAttempts > 0) {
      const { error } = await supabase.from('malha_raiz').upsert(payload, { onConflict: 'flight_number' });
      if (!error) return;

      const notFoundMatch = error.message.match(/Could not find the '([^']+)' column/);
      if (notFoundMatch && notFoundMatch[1]) {
        const missingCol = notFoundMatch[1];
        payload = payload.map(p => {
          const newP = { ...p } as any;
          delete newP[missingCol];
          return newP;
        });
        maxAttempts--;
        continue;
      }
      throw error;
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Salvando malha raiz de contingência localmente.');
      saveLocalRootMesh(flights);
    }
  }
};

export const deleteRootMeshFlight = async (flightId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('malha_raiz').delete().eq('id', flightId);
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
    const { error } = await supabase.from('malha_raiz').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
      .from('malha_dia')
      .select('*')
      .eq('date', dateRef)
      .order('etd');
      
    if (error) throw error;
    
    return (data || []).map(dbFlight => ({
      id: dbFlight.id,
      date: dbFlight.date || dateRef,
      airline: dbFlight.airline || '',
      airlineCode: dbFlight.airline_code || '',
      flightNumber: dbFlight.flight_number || '',
      departureFlightNumber: dbFlight.departure_flight_number || dbFlight.flight_number || '',
      destination: dbFlight.destination || '',
      etd: dbFlight.etd || '00:00',
      registration: dbFlight.registration || '',
      eta: dbFlight.eta || dbFlight.etd || '00:00',
      positionId: dbFlight.position_id || '',
      actualArrivalTime: dbFlight.actual_arrival_time || '',
      model: dbFlight.model || '',
      disabled: dbFlight.is_disabled || false
    }));
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Servindo malha_dia de contingência local.');
    }
    return getLocalBaseMeshFlights(dateRef);
  }
};

export const upsertBaseMeshFlights = async (flightsBase: MeshFlight[]): Promise<void> => {
  if (!isSupabaseConfigured() || !flightsBase.length) return;
  
  let payload = flightsBase.map(f => {
    const obj: any = {
      date: f.date,
      airline: f.airline,
      airline_code: f.airlineCode,
      flight_number: f.flightNumber,
      departure_flight_number: f.departureFlightNumber,
      destination: f.destination,
      etd: f.etd,
      registration: f.registration,
      eta: f.eta,
      position_id: f.positionId,
      actual_arrival_time: f.actualArrivalTime,
      model: f.model,
      updated_at: new Date().toISOString()
    };
    if (f.id && !f.id.toString().startsWith('mesh-')) {
       obj.id = f.id;
    }
    return obj;
  });

  try {
    let maxAttempts = 10;
    while (maxAttempts > 0) {
      const { error } = await supabase.from('malha_dia').upsert(payload);
      if (!error) return;

      const notFoundMatch = error.message.match(/Could not find the '([^']+)' column/);
      if (notFoundMatch && notFoundMatch[1]) {
        const missingCol = notFoundMatch[1];
        payload = payload.map(p => {
          const newP = { ...p } as any;
          delete newP[missingCol];
          return newP;
        });
        maxAttempts--;
        continue;
      }
      throw error;
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Salvando malha base de contingência localmente.');
      saveLocalBaseMeshFlights(flightsBase);
    }
  }
};

export const clearBaseMeshFlights = async (dateRef: string): Promise<void> => {
   if (!isSupabaseConfigured()) return;
   try {
     const { error } = await supabase.from('malha_dia').delete().eq('date', dateRef);
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
     const { error } = await supabase.from('malha_dia').delete().neq('id', '00000000-0000-0000-0000-000000000000');
     if (error) throw error;
   } catch (err: any) {
     if (isTableMissingError(err)) {
       saveLocalBaseMeshFlights([]);
     }
   }
};

export const bulkInsertFlights = async (flights: FlightData[]): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const payload = flights.map(flight => {
    const obj: any = {
      date_ref: flight.date || getLocalTodayDateStr(),
      flight_number: flight.flightNumber,
      departure_flight_number: flight.departureFlightNumber,
      airline: flight.airline,
      airline_code: flight.airlineCode,
      model: flight.model,
      registration: flight.registration,
      origin: flight.origin,
      destination: flight.destination,
      eta: flight.eta,
      etd: flight.etd,
      actual_arrival_time: flight.actualArrivalTime,
      position_id: flight.positionId,
      position_type: flight.positionType || null,
      pit_id: flight.pitId || null,
      wing_side: flight.wingSide || null,
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
      support_operator: flight.supportOperator || null,
      vehicle_id: (
        flight.vehicleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flight.vehicleId)
          ? flight.vehicleId
          : (flight.vehicleId ? vehiclesCache.find(v => v.fleetNumber === String(flight.vehicleId))?.id : null)
      ) || (
        flight.fleet
          ? vehiclesCache.find(v => v.fleetNumber === String(flight.fleet).replace('SRV-', '').replace('CTA-', ''))?.id
          : null
      ) || null,
      vehicle_type: flight.vehicleType || null,
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
      updated_at: new Date().toISOString()
    };
    if (flight.id) {
       obj.id = flight.id;
    }
    return obj;
  });

  try {
    const { error } = await supabase.from('malha_operacional').upsert(payload);
    if (error) throw error;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.info('[Modo Contingência] Salvando inserção em lote de voos localmente.');
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
