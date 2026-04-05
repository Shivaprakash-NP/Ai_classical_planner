"""
Intelligent Multi-Device Energy Management System
Classical Planning (Forward BFS) + Decision Networks
"""
import itertools
from collections import deque

DEVICES = [
    {"name": "Ventilator",     "priority": "High",   "battery": 70.0, "consumption": 8.0, "charge_rate": 15.0, "safe_threshold": 40.0, "color": "#EF4444"},
    {"name": "Heart Monitor",  "priority": "High",   "battery": 55.0, "consumption": 6.0, "charge_rate": 12.0, "safe_threshold": 35.0, "color": "#F97316"},
    {"name": "Infusion Pump",  "priority": "Medium", "battery": 80.0, "consumption": 4.0, "charge_rate": 10.0, "safe_threshold": 25.0, "color": "#EAB308"},
    {"name": "Smart Lighting", "priority": "Low",    "battery": 90.0, "consumption": 2.0, "charge_rate":  8.0, "safe_threshold": 15.0, "color": "#22C55E"},
    {"name": "HVAC Sensor",    "priority": "Low",    "battery": 65.0, "consumption": 3.0, "charge_rate":  9.0, "safe_threshold": 15.0, "color": "#3B82F6"},
]

N_DEVICES        = len(DEVICES)
MAX_CHARGE_SLOTS = 2
HORIZON          = 4
P_SUCCESS        = 0.90
SWITCHING_COST   = 5.0

PRIORITY_REWARD   = {"High": 60, "Medium": 35, "Low": 15}
PRIORITY_PENALTY  = {"High": 80, "Medium": 45, "Low": 20}
DEPLETION_PENALTY = 200

def initial_state() -> tuple:
    return tuple(d["battery"] for d in DEVICES)

def valid_actions() -> list:
    actions = []
    for r in range(MAX_CHARGE_SLOTS + 1):
        for combo in itertools.combinations(range(N_DEVICES), r):
            actions.append(frozenset(combo))
    return actions

def transition(state: tuple, action: frozenset) -> tuple:
    new_state = []
    for i, b in enumerate(state):
        if i in action:
            new_b = min(100.0, b + DEVICES[i]["charge_rate"])
        else:
            new_b = max(0.0, b - DEVICES[i]["consumption"])
        new_state.append(round(new_b, 2))
    return tuple(new_state)

def is_terminal_bad(state: tuple) -> bool:
    for i, b in enumerate(state):
        if b <= 0 and DEVICES[i]["priority"] == "High":
            return True
    return False

def bfs_plans(horizon: int, start_state: tuple = None) -> list:
    actions = valid_actions()
    queue   = deque()
    s0      = start_state if start_state else initial_state()
    queue.append((s0, [], [s0]))
    completed = []

    while queue:
        state, plan, traj = queue.popleft()
        if len(plan) == horizon:
            completed.append((plan, traj))
            continue
        if is_terminal_bad(state):
            padded_traj = traj + [traj[-1]] * (horizon - len(plan))
            completed.append((plan, padded_traj))
            continue
        for action in actions:
            next_state = transition(state, action)
            queue.append((next_state, plan + [action], traj + [next_state]))
    return completed

def battery_deficiency_cost(trajectory: list) -> float:
    return sum(sum(100.0 - b for b in state) for state in trajectory[1:])

def switching_cost(plan: list) -> float:
    return sum(1 for i in range(1, len(plan)) if plan[i] != plan[i - 1]) * SWITCHING_COST

def total_cost(plan: list, trajectory: list) -> float:
    return battery_deficiency_cost(trajectory) + switching_cost(plan)

def utility_reward(trajectory: list) -> float:
    reward = 0.0
    for state in trajectory[1:]:
        for i, b in enumerate(state):
            dev = DEVICES[i]
            if b <= 0:
                reward -= DEPLETION_PENALTY
            elif b < dev["safe_threshold"]:
                reward -= PRIORITY_PENALTY[dev["priority"]]
            else:
                reward += PRIORITY_REWARD[dev["priority"]]
    return reward

def utility_penalty(trajectory: list) -> float:
    penalty = 0.0
    for state in trajectory[1:]:
        for i, b in enumerate(state):
            dev = DEVICES[i]
            if b <= 0:
                penalty += DEPLETION_PENALTY
            elif b < dev["safe_threshold"]:
                penalty += PRIORITY_PENALTY[dev["priority"]]
    return penalty

def expected_utility(plan: list, trajectory: list, horizon: int) -> float:
    p_succ  = P_SUCCESS ** horizon
    p_fail  = 1.0 - p_succ
    return (p_succ * utility_reward(trajectory)) - (p_fail * utility_penalty(trajectory)) - total_cost(plan, trajectory)

def evaluate_plans(plans: list, horizon: int) -> list:
    scored = [(expected_utility(plan, traj, horizon), plan, traj) for plan, traj in plans]
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored

def action_label(action: frozenset) -> str:
    if not action: return "None"
    return "+".join(DEVICES[i]["name"][:4] for i in sorted(action))

def generate_tree_json(s0):
    MAX_L1, MAX_L2 = 4, 3
    root_state = s0 if s0 else initial_state()
    all_acts = valid_actions()

    def fmt(st):
        vals = [int(x) for x in st]
        return f"{vals[0]}, {vals[1]}, {vals[2]}\n{vals[3]}, {vals[4]}"

    result = {
        "root": {"label": "Start", "state": fmt(root_state), "metrics": {"cost": 0, "eu": round(expected_utility([], [root_state]*(HORIZON+1), HORIZON), 2)}},
        "l1_nodes": [],
        "l2_nodes": []
    }

    for idx, act in enumerate(all_acts[:MAX_L1]):
        ns = transition(root_state, act)
        l1_id = f"L1_{idx}"
        traj1 = [root_state, ns]
        cost1 = total_cost([act], traj1)
        eu1 = expected_utility([act], traj1 + [ns]*(HORIZON-1), HORIZON)
        result["l1_nodes"].append({
            "id": l1_id, "label": action_label(act),
            "state": fmt(ns), "edge": action_label(act),
            "metrics": {"cost": round(cost1, 2), "eu": round(eu1, 2)}
        })
        for jdx, act2 in enumerate(all_acts[:MAX_L2]):
            ns2 = transition(ns, act2)
            traj2 = [root_state, ns, ns2]
            cost2 = total_cost([act, act2], traj2)
            eu2 = expected_utility([act, act2], traj2 + [ns2]*(HORIZON-2), HORIZON)
            result["l2_nodes"].append({
                "id": f"{l1_id}_{jdx}", "parent": l1_id,
                "label": action_label(act2), "state": fmt(ns2), "edge": action_label(act2),
                "metrics": {"cost": round(cost2, 2), "eu": round(eu2, 2)}
            })
    return result

def run_planner(custom_s0=None):
    s0 = custom_s0 if custom_s0 else initial_state()
    plans = bfs_plans(HORIZON, start_state=s0)
    ranked = evaluate_plans(plans, HORIZON)
    best_eu, best_plan, best_traj = ranked[0]
    
    p_succ_actual = P_SUCCESS ** HORIZON
    
    steps = list(range(HORIZON + 1))
    bat_d = []
    for i, dev in enumerate(DEVICES):
        levels = [best_traj[t][i] for t in steps]
        bat_d.append({"name": dev["name"], "color": dev["color"], "data": levels})
        
    actions_labels = ["Init"] + [f"Step {t}: {action_label(best_plan[t-1])}" for t in range(1, HORIZON + 1)]
    
    top5 = ranked[:5]
    top5_labels = [f"#{r} " + "->".join(action_label(a)[:5] for a in p[:3]) for r, (_, p, _) in enumerate(top5, 1)]
    top5_eus = [eu for eu, _, _ in top5]
    
    stab_data = [[state[i] for state in best_traj] for i in range(N_DEVICES)]
    p_vals = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]
    risk_eus = []
    r, pen, c = utility_reward(best_traj), utility_penalty(best_traj), total_cost(best_plan, best_traj)
    for p in p_vals:
        p_s = p ** HORIZON
        risk_eus.append((p_s * r) - ((1 - p_s) * pen) - c)

    res = {
        "status": "success", "best_eu": round(best_eu, 2),
        "metrics": {"p_success": round(p_succ_actual, 4), "total_cost": round(total_cost(best_plan, best_traj), 2), "total_reward": round(utility_reward(best_traj), 2)},
        "optimal_schedule": [],
        "chart_data": {
            "battery_levels": {"actions": actions_labels, "devices": bat_d},
            "top5": {"labels": top5_labels, "eus": top5_eus},
            "stability": {"names": [d["name"] for d in DEVICES], "colors": [d["color"] for d in DEVICES], "data": stab_data},
            "failure_risk": {"p_values": p_vals, "eus": risk_eus},
            "tree_json": generate_tree_json(s0)
        }
    }
    for step, action in enumerate(best_plan, 1):
        devs = [{"name": DEVICES[i]["name"], "before": best_traj[step-1][i], "after": best_traj[step][i]} for i in range(N_DEVICES)]
        res["optimal_schedule"].append({"step": step, "charge": action_label(action), "details": devs})
    return res

if __name__ == "__main__":
    print(run_planner())
