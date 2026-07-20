import { getSupabaseBrowserClient } from "./supabase";
import type { ShootRouteKind } from "./saved-route-planner";

const ROUTE_PLANS_TABLE = "route_plans";
const ROUTE_STOPS_TABLE = "route_plan_stops";

export type RoutePlanStopDraft = {
  placeId: string;
  position: number;
  arrivalLabel?: string;
  customNote?: string;
};

export type RoutePlanDraft = {
  // Required and must be the caller's real, resolved auth uid -- route_plans
  // is RLS-scoped to `auth.uid()` with no legacy fallback policy (see
  // 20260710000100_rls_lockdown_add_owner_policies.sql), so there is no safe
  // default to fall back to here. Callers must resolve a real identity (or
  // decline to save) before calling this -- see components/saved-panel.tsx.
  userId: string;
  kind: ShootRouteKind | "custom";
  name: string;
  stops: RoutePlanStopDraft[];
};

export type RemoteRoutePlanStop = {
  id: string;
  route_plan_id: string;
  place_id: string;
  position: number;
  arrival_label: string | null;
  custom_note: string | null;
};

export type RemoteRoutePlan = {
  id: string;
  user_id: string;
  kind: ShootRouteKind | "custom";
  name: string;
  created_at: string;
  updated_at: string;
  stops: RemoteRoutePlanStop[];
};

type RoutePlanRow = Omit<RemoteRoutePlan, "stops">;

function normalizeStop(stop: RoutePlanStopDraft) {
  return {
    place_id: stop.placeId,
    position: stop.position,
    arrival_label: stop.arrivalLabel ?? null,
    custom_note: stop.customNote ?? null,
  };
}

export async function fetchRemoteRoutePlans(userId: string): Promise<RemoteRoutePlan[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data: plans, error: planError } = await supabase
    .from(ROUTE_PLANS_TABLE)
    .select("id,user_id,kind,name,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (planError) throw planError;
  if (!plans?.length) return [];

  const planIds = plans.map((plan) => plan.id);
  const { data: stops, error: stopError } = await supabase
    .from(ROUTE_STOPS_TABLE)
    .select("id,route_plan_id,place_id,position,arrival_label,custom_note")
    .in("route_plan_id", planIds)
    .order("position", { ascending: true });

  if (stopError) throw stopError;

  const stopsByPlan = (stops ?? []).reduce<Record<string, RemoteRoutePlanStop[]>>((groups, stop) => {
    groups[stop.route_plan_id] = [...(groups[stop.route_plan_id] ?? []), stop as RemoteRoutePlanStop];
    return groups;
  }, {});

  return (plans as RoutePlanRow[]).map((plan) => ({
    ...plan,
    stops: stopsByPlan[plan.id] ?? [],
  }));
}

export async function saveRemoteRoutePlan(input: RoutePlanDraft): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: plan, error: planError } = await supabase
    .from(ROUTE_PLANS_TABLE)
    .insert({
      user_id: input.userId,
      kind: input.kind,
      name: input.name,
    })
    .select("id")
    .single();

  if (planError) throw planError;

  const routePlanId = plan.id as string;
  const stopRows = input.stops.map((stop) => ({
    ...normalizeStop(stop),
    route_plan_id: routePlanId,
  }));

  if (stopRows.length) {
    const { error: stopError } = await supabase.from(ROUTE_STOPS_TABLE).insert(stopRows);
    if (stopError) throw stopError;
  }

  return routePlanId;
}

export async function deleteRemoteRoutePlan(routePlanId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(ROUTE_PLANS_TABLE).delete().eq("id", routePlanId);
  if (error) throw error;
}
