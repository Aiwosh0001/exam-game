import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputPath = resolve(projectRoot, "static/js/data/qlearning-policy.js");
const reportPath = resolve(projectRoot, "static/js/data/qlearning-training-report.json");

const stateDimensions = [
  { id: "distance", values: ["close", "mid", "far"] },
  { id: "hp", values: ["low", "high"] },
  { id: "cooldown", values: ["ready", "cooling"] },
  { id: "danger", values: ["safe", "danger"] },
  { id: "weapon", values: ["melee", "ranged"] },
  { id: "sight", values: ["clear", "blocked"] },
  { id: "recentHit", values: ["steady", "hit"] },
  { id: "space", values: ["open", "cornered"] },
  { id: "allies", values: ["alone", "grouped"] },
];
const actions = ["attack", "approach", "retreat", "dodgeLeft", "dodgeRight"];

const config = {
  version: "qlearn-lite-v5-all-enemies",
  seed: 20260613,
  episodesPerProfile: 6200,
  maxSteps: 320,
  alpha: 0.14,
  gamma: 0.9,
  epsilonStart: 0.42,
  epsilonEnd: 0.035,
  evaluationEpisodes: 620,
  arenaW: 960,
  arenaH: 540,
  enemyStep: 34,
  playerStep: 18,
  attackRange: 380,
  closeDistance: 150,
  midDistance: 330,
  lowHpRatio: 0.45,
  idealMeleeMinDistance: 190,
  idealMeleeMaxDistance: 390,
  idealRangedMinDistance: 130,
  idealRangedMaxDistance: 310,
  wallMargin: 70,
  allyRadius: 260,
  obstacleCountMin: 2,
  obstacleCountMax: 5,
};

const enemyProfiles = [
  {
    id: "merchant",
    label: "商人",
    style: "拉扯压迫型",
    seedOffset: 11,
    weights: {
      attack: 1.08,
      approach: 0.95,
      retreat: 1.12,
      dodge: 1.22,
      keepRange: 1.18,
      clearSight: 1.1,
      lowHpRetreat: 1.18,
      meleeAvoid: 1.15,
      groupedAggression: 0.75,
      blockedAttackPenalty: 1.15,
    },
  },
  {
    id: "lagrange",
    label: "拉格朗日投影",
    style: "牵制召唤型",
    seedOffset: 23,
    weights: {
      attack: 1,
      approach: 0.78,
      retreat: 1.28,
      dodge: 1.1,
      keepRange: 1.42,
      clearSight: 0.86,
      lowHpRetreat: 1.25,
      meleeAvoid: 1.22,
      groupedAggression: 0.62,
      blockedAttackPenalty: 0.82,
    },
  },
  {
    id: "descartes",
    label: "笛卡尔投影",
    style: "几何绕位型",
    seedOffset: 37,
    weights: {
      attack: 1.12,
      approach: 0.92,
      retreat: 0.92,
      dodge: 1.42,
      keepRange: 1.05,
      clearSight: 1.22,
      lowHpRetreat: 1.05,
      meleeAvoid: 1,
      groupedAggression: 0.9,
      blockedAttackPenalty: 1.1,
    },
  },
  {
    id: "gauss",
    label: "高斯投影",
    style: "阵地控制型",
    seedOffset: 53,
    weights: {
      attack: 1.06,
      approach: 0.82,
      retreat: 1.18,
      dodge: 0.94,
      keepRange: 1.55,
      clearSight: 1.05,
      lowHpRetreat: 1.18,
      meleeAvoid: 1.38,
      groupedAggression: 0.68,
      blockedAttackPenalty: 0.95,
    },
  },
  {
    id: "jacobi",
    label: "雅可比投影",
    style: "侧翼游击型",
    seedOffset: 71,
    weights: {
      attack: 1.1,
      approach: 1,
      retreat: 0.95,
      dodge: 1.5,
      keepRange: 1.08,
      clearSight: 1.18,
      lowHpRetreat: 1,
      meleeAvoid: 0.96,
      groupedAggression: 0.86,
      blockedAttackPenalty: 1.08,
    },
  },
  {
    id: "lhopital",
    label: "Lhopital projection",
    style: "phase-control",
    seedOffset: 89,
    weights: {
      attack: 1.08,
      approach: 0.96,
      retreat: 1.02,
      dodge: 1.08,
      keepRange: 1.18,
      clearSight: 1.22,
      lowHpRetreat: 0.78,
      meleeAvoid: 0.92,
      groupedAggression: 0.84,
      blockedAttackPenalty: 1.18,
      groupedChance: 0.36,
    },
  },
  {
    id: "taylor",
    label: "Taylor projection",
    style: "combo-chaser",
    seedOffset: 107,
    weights: {
      attack: 1.18,
      approach: 1.38,
      retreat: 0.72,
      dodge: 1.04,
      keepRange: 0.86,
      clearSight: 0.92,
      lowHpRetreat: 0.82,
      meleeAvoid: 0.62,
      groupedAggression: 1.18,
      blockedAttackPenalty: 0.86,
      groupedChance: 0.24,
    },
  },
  {
    id: "archimedes",
    label: "Archimedes projection",
    style: "marked-charge",
    seedOffset: 131,
    weights: {
      attack: 1.2,
      approach: 1.02,
      retreat: 0.98,
      dodge: 0.9,
      keepRange: 1.12,
      clearSight: 1.34,
      lowHpRetreat: 0.96,
      meleeAvoid: 0.88,
      groupedAggression: 0.92,
      blockedAttackPenalty: 1.26,
      groupedChance: 0.34,
    },
  },
  {
    id: "euclid",
    label: "Euclid projection",
    style: "ambush-flanker",
    seedOffset: 149,
    weights: {
      attack: 1.12,
      approach: 1.24,
      retreat: 1.08,
      dodge: 1.42,
      keepRange: 0.96,
      clearSight: 1.02,
      lowHpRetreat: 1.1,
      meleeAvoid: 0.72,
      groupedAggression: 0.82,
      blockedAttackPenalty: 0.94,
      groupedChance: 0.22,
    },
  },
  {
    id: "jordan",
    label: "Jordan projection",
    style: "orbit-berserker",
    seedOffset: 173,
    weights: {
      attack: 1.16,
      approach: 1.2,
      retreat: 0.78,
      dodge: 1.32,
      keepRange: 0.98,
      clearSight: 0.96,
      lowHpRetreat: 0.9,
      meleeAvoid: 0.76,
      groupedAggression: 1.06,
      blockedAttackPenalty: 0.9,
      groupedChance: 0.28,
    },
  },
];

let seed = config.seed;
function setSeed(value) {
  seed = value >>> 0;
}

function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bucketDistance(value) {
  return value < config.closeDistance ? "close" : value < config.midDistance ? "mid" : "far";
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 0.00001) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function expandedRect(rect, padding = 0) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };
}

function segmentIntersectsRect(a, b, rawRect) {
  const rect = expandedRect(rawRect, 6);
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
  return corners.some((corner, index) => segmentsIntersect(a, b, corner, corners[(index + 1) % corners.length]));
}

function circleRectCollision(circle, rect, radius = circle.r || 0) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= radius;
}

function lineBlocked(env, from = env.enemy, to = env.player) {
  return env.obstacles.some((obstacle) => segmentIntersectsRect(from, to, obstacle));
}

function enemyCornered(env, point = env.enemy) {
  if (
    point.x < config.wallMargin ||
    point.x > config.arenaW - config.wallMargin ||
    point.y < config.wallMargin ||
    point.y > config.arenaH - config.wallMargin
  ) {
    return true;
  }
  return env.obstacles.some((obstacle) => circleRectCollision(point, obstacle, 54));
}

function stateKey(env) {
  const d = distance(env.enemy, env.player);
  const distanceKey = bucketDistance(d);
  const hpKey = env.enemy.hpRatio <= config.lowHpRatio ? "low" : "high";
  const cooldownKey = env.enemy.cooldown <= 0 ? "ready" : "cooling";
  const dangerKey = env.dangerTimer > 0 ? "danger" : "safe";
  const weaponKey = env.player.weaponType;
  const sightKey = lineBlocked(env) ? "blocked" : "clear";
  const hitKey = env.enemy.hitTimer > 0 ? "hit" : "steady";
  const spaceKey = enemyCornered(env) ? "cornered" : "open";
  const allyKey = env.allyCount > 0 ? "grouped" : "alone";
  return [distanceKey, hpKey, cooldownKey, dangerKey, weaponKey, sightKey, hitKey, spaceKey, allyKey].join("_");
}

function allStates() {
  const states = [];
  function visit(index, parts) {
    if (index >= stateDimensions.length) {
      states.push(parts.join("_"));
      return;
    }
    for (const value of stateDimensions[index].values) {
      visit(index + 1, [...parts, value]);
    }
  }
  visit(0, []);
  return states;
}

const allStateKeys = allStates();

function createQTable() {
  return Object.fromEntries(
    allStateKeys.map((state) => [state, Object.fromEntries(actions.map((action) => [action, 0]))]),
  );
}

function createObstacle() {
  const horizontal = random() > 0.5;
  const w = horizontal ? 88 + random() * 80 : 26 + random() * 34;
  const h = horizontal ? 26 + random() * 34 : 88 + random() * 80;
  return {
    x: 95 + random() * (config.arenaW - 190 - w),
    y: 90 + random() * (config.arenaH - 180 - h),
    w,
    h,
  };
}

function createObstacles(points) {
  const count = config.obstacleCountMin + Math.floor(random() * (config.obstacleCountMax - config.obstacleCountMin + 1));
  const obstacles = [];
  let guard = 0;
  while (obstacles.length < count && guard < 80) {
    guard += 1;
    const obstacle = createObstacle();
    const tooClose = points.some((point) => circleRectCollision(point, obstacle, 62));
    const overlaps = obstacles.some((other) => (
      obstacle.x < other.x + other.w + 42 &&
      obstacle.x + obstacle.w + 42 > other.x &&
      obstacle.y < other.y + other.h + 42 &&
      obstacle.y + obstacle.h + 42 > other.y
    ));
    if (!tooClose && !overlaps) obstacles.push(obstacle);
  }
  return obstacles;
}

function resetEnv(profile) {
  const player = {
    x: 260 + random() * 440,
    y: 170 + random() * 220,
    angle: random() * Math.PI * 2,
    turnBias: random() > 0.5 ? 1 : -1,
    weaponType: random() < 0.46 ? "melee" : "ranged",
    attackTimer: 10 + Math.floor(random() * 24),
  };
  const groupedChance = Number(profile.weights?.groupedChance ?? (profile.id === "lagrange" ? 0.58 : profile.id === "gauss" ? 0.32 : 0.42));
  const enemy = {
    x: 180 + random() * 600,
    y: 120 + random() * 260,
    hpRatio: 0.58 + random() * 0.42,
    cooldown: random() < 0.48 ? 0 : 0.5 + random() * 1.4,
    hitTimer: random() < 0.12 ? 2 + Math.floor(random() * 3) : 0,
    wallBumpCount: 0,
  };
  return {
    profile,
    player,
    enemy,
    obstacles: createObstacles([player, enemy]),
    allyCount: random() < groupedChance ? 1 + Math.floor(random() * 2) : 0,
    dangerTimer: random() < 0.16 ? 2 : 0,
    steps: 0,
  };
}

function valuesFor(qTable, state) {
  return qTable[state] || Object.fromEntries(actions.map((action) => [action, 0]));
}

function bestAction(qTable, state) {
  const values = valuesFor(qTable, state);
  const bestValue = Math.max(...actions.map((action) => values[action]));
  const tied = actions.filter((action) => values[action] === bestValue);
  return tied[Math.floor(random() * tied.length)];
}

function chooseAction(qTable, state, epsilon) {
  if (random() < epsilon) {
    return actions[Math.floor(random() * actions.length)];
  }
  return bestAction(qTable, state);
}

function obstacleFree(point) {
  return (
    point.x >= 56 &&
    point.x <= config.arenaW - 56 &&
    point.y >= 64 &&
    point.y <= config.arenaH - 88
  );
}

function tryMovePoint(env, angle, amount) {
  const candidate = {
    x: clamp(env.enemy.x + Math.cos(angle) * amount, 56, config.arenaW - 56),
    y: clamp(env.enemy.y + Math.sin(angle) * amount, 64, config.arenaH - 88),
    r: 24,
  };
  if (!obstacleFree(candidate)) return null;
  if (env.obstacles.some((obstacle) => circleRectCollision(candidate, obstacle, 30))) return null;
  return candidate;
}

function moveEnemy(env, angle, amount) {
  const before = { x: env.enemy.x, y: env.enemy.y };
  const candidates = [
    tryMovePoint(env, angle, amount),
    tryMovePoint(env, angle + Math.PI / 2, amount * 0.58),
    tryMovePoint(env, angle - Math.PI / 2, amount * 0.58),
  ].filter(Boolean);
  const target = candidates[0];
  if (target) {
    env.enemy.x = target.x;
    env.enemy.y = target.y;
  } else {
    env.enemy.wallBumpCount += 1;
  }
  const moved = Math.hypot(env.enemy.x - before.x, env.enemy.y - before.y);
  if (moved < amount * 0.22) env.enemy.wallBumpCount += 1;
  return moved;
}

function movePlayer(env, angle, amount) {
  const before = { x: env.player.x, y: env.player.y };
  const candidate = {
    x: clamp(env.player.x + Math.cos(angle) * amount, 52, config.arenaW - 52),
    y: clamp(env.player.y + Math.sin(angle) * amount, 74, config.arenaH - 92),
    r: 20,
  };
  if (!env.obstacles.some((obstacle) => circleRectCollision(candidate, obstacle, 26))) {
    env.player.x = candidate.x;
    env.player.y = candidate.y;
  } else {
    env.player.angle += (random() > 0.5 ? 1 : -1) * (0.55 + random() * 0.6);
  }
  return Math.hypot(env.player.x - before.x, env.player.y - before.y);
}

function updatePlayer(env) {
  if (random() < 0.2) {
    env.player.angle += env.player.turnBias * (0.14 + random() * 0.55);
    if (random() < 0.18) env.player.turnBias *= -1;
  }
  if (random() < 0.012) {
    env.player.weaponType = env.player.weaponType === "melee" ? "ranged" : "melee";
  }
  movePlayer(env, env.player.angle, config.playerStep);
  env.player.attackTimer -= 1;
  if (env.player.attackTimer <= 0) {
    env.player.attackTimer = env.player.weaponType === "melee"
      ? 9 + Math.floor(random() * 18)
      : 14 + Math.floor(random() * 28);
    env.dangerTimer = env.player.weaponType === "melee" ? 2 : 3;
  } else {
    env.dangerTimer = Math.max(0, env.dangerTimer - 1);
  }
}

function idealRange(env) {
  return env.player.weaponType === "melee"
    ? { min: config.idealMeleeMinDistance, max: config.idealMeleeMaxDistance }
    : { min: config.idealRangedMinDistance, max: config.idealRangedMaxDistance };
}

function weighted(env, key, fallback = 1) {
  return Number(env.profile.weights?.[key] ?? fallback);
}

function rewardForDistance(env, beforeDistance, afterDistance, beforeBlocked, afterBlocked, beforeCorner, afterCorner, action) {
  const range = idealRange(env);
  let reward = 0;
  if (afterDistance >= range.min && afterDistance <= range.max) reward += 1.2 * weighted(env, "keepRange");
  if (env.player.weaponType === "melee" && afterDistance < config.closeDistance) {
    reward -= (env.enemy.hpRatio <= config.lowHpRatio ? 4.6 : 1.8) * weighted(env, "meleeAvoid");
  }
  if (env.player.weaponType === "ranged" && afterDistance > config.midDistance && !afterBlocked) reward -= 1.25;
  if (env.enemy.hpRatio <= config.lowHpRatio && afterDistance > beforeDistance) {
    reward += (env.allyCount > 0 ? 0.9 : 1.65) * weighted(env, "lowHpRetreat");
  }
  if (env.enemy.hpRatio > config.lowHpRatio && beforeDistance > config.midDistance && afterDistance < beforeDistance) {
    reward += (env.player.weaponType === "ranged" ? 1.5 : 0.75) * weighted(env, "approach");
  }
  if (beforeBlocked && !afterBlocked) reward += (action === "approach" ? 2.0 : 1.05) * weighted(env, "clearSight");
  if (!beforeCorner && afterCorner) reward -= 1.25;
  if (beforeCorner && !afterCorner) reward += (action === "retreat" || action.startsWith("dodge") ? 1.2 : 0.55) * weighted(env, "retreat");
  return reward;
}

function playerHitChance(env, action, afterDistance, afterBlocked) {
  const dodged = action === "dodgeLeft" || action === "dodgeRight";
  const retreated = action === "retreat";
  if (env.player.weaponType === "melee") {
    if (afterDistance > 118) return 0.04;
    if (dodged) return 0.08;
    if (retreated) return 0.18;
    return 0.64;
  }
  if (afterBlocked) return dodged ? 0.06 : 0.12;
  if (dodged) return 0.1;
  if (retreated && afterDistance > config.midDistance) return 0.24;
  return afterDistance < config.closeDistance ? 0.58 : 0.36;
}

function profileActionReward(env, action, beforeDistance) {
  let reward = 0;
  if (action === "attack") reward += (weighted(env, "attack") - 1) * 1.8;
  if (action === "approach") reward += (weighted(env, "approach") - 1) * (beforeDistance > config.midDistance ? 2.1 : 1.0);
  if (action === "retreat") reward += (weighted(env, "retreat") - 1) * (env.enemy.hpRatio <= config.lowHpRatio ? 2.2 : 1.0);
  if (action === "dodgeLeft" || action === "dodgeRight") reward += (weighted(env, "dodge") - 1) * (env.dangerTimer > 0 ? 2.4 : 1.0);
  if (env.allyCount > 0 && (action === "attack" || action === "approach")) {
    reward += (weighted(env, "groupedAggression") - 1) * -1.2;
  }
  return reward;
}

function stepEnv(env, action) {
  const beforeDistance = distance(env.enemy, env.player);
  const beforeBlocked = lineBlocked(env);
  const beforeCorner = enemyCornered(env);
  const angleToPlayer = Math.atan2(env.player.y - env.enemy.y, env.player.x - env.enemy.x);
  let reward = -0.05 + profileActionReward(env, action, beforeDistance);

  if (action === "attack") {
    if (env.enemy.cooldown <= 0) {
      env.enemy.cooldown = 6;
      const blocked = beforeBlocked;
      const rangeFactor = beforeDistance < config.attackRange ? 1 : 0.18;
      const blockedFactor = blocked ? 0.24 : 1;
      const hitChance = beforeDistance < config.closeDistance ? 0.64 : beforeDistance < config.midDistance ? 0.84 : 0.38;
      const didHit = random() < hitChance * rangeFactor * blockedFactor;
      reward += (didHit ? 12.8 : -1.45) * weighted(env, "attack");
      if (blocked) reward -= 2.1 * weighted(env, "blockedAttackPenalty");
      if (env.allyCount > 0 && beforeDistance < config.midDistance) reward += 0.65 * weighted(env, "groupedAggression");
    } else {
      reward -= 2.2;
    }
  } else if (action === "approach") {
    const moved = moveEnemy(env, angleToPlayer, config.enemyStep);
    reward += (moved < 8 ? -1.2 : beforeDistance > config.midDistance ? 1.95 : 0.35) * weighted(env, "approach");
    if (env.player.weaponType === "ranged") reward += 0.7 * weighted(env, "approach");
    if (env.player.weaponType === "melee" && distance(env.enemy, env.player) < config.closeDistance) reward -= 2.0 * weighted(env, "meleeAvoid");
    if (env.allyCount > 0 && env.enemy.hpRatio > config.lowHpRatio) reward += 0.55 * weighted(env, "groupedAggression");
  } else if (action === "retreat") {
    const moved = moveEnemy(env, angleToPlayer + Math.PI, config.enemyStep);
    reward += (moved < 8 ? -1.2 : env.enemy.hpRatio <= config.lowHpRatio ? 3.2 : beforeDistance < config.closeDistance ? 1.0 : -2.05) * weighted(env, "retreat");
    if (env.enemy.hitTimer > 0) reward += 1.25 * weighted(env, "lowHpRetreat");
    if (env.player.weaponType === "melee" && beforeDistance < config.midDistance) reward += 1.55 * weighted(env, "meleeAvoid");
    if (env.allyCount > 0 && env.enemy.hpRatio > config.lowHpRatio) reward -= 0.75 * weighted(env, "groupedAggression");
  } else if (action === "dodgeLeft" || action === "dodgeRight") {
    const side = action === "dodgeLeft" ? -1 : 1;
    const moved = moveEnemy(env, angleToPlayer + side * Math.PI / 2, config.enemyStep * 1.08);
    reward += (moved < 8 ? -1.15 : env.dangerTimer > 0 ? 5.4 : -0.35) * weighted(env, "dodge");
    if (env.enemy.hitTimer > 0) reward += 1.35 * weighted(env, "dodge");
    if (env.player.weaponType === "ranged" && !beforeBlocked) reward += 0.85 * weighted(env, "dodge");
    if (beforeCorner) reward -= 0.75;
  }

  const afterDistance = distance(env.enemy, env.player);
  const afterBlocked = lineBlocked(env);
  const afterCorner = enemyCornered(env);
  reward += rewardForDistance(env, beforeDistance, afterDistance, beforeBlocked, afterBlocked, beforeCorner, afterCorner, action);

  if (env.dangerTimer > 0 && random() < playerHitChance(env, action, afterDistance, afterBlocked)) {
    env.enemy.hpRatio = Math.max(0, env.enemy.hpRatio - (0.075 + random() * 0.105));
    env.enemy.hitTimer = 4;
    reward -= 10.8;
  }

  if (env.enemy.wallBumpCount > 2) {
    reward -= 0.42 * env.enemy.wallBumpCount;
    env.enemy.wallBumpCount = 0;
  }

  env.enemy.cooldown = Math.max(0, env.enemy.cooldown - 1);
  env.enemy.hitTimer = Math.max(0, env.enemy.hitTimer - 1);
  updatePlayer(env);
  env.steps += 1;
  return reward;
}

function epsilonForEpisode(episode) {
  const t = episode / Math.max(1, config.episodesPerProfile - 1);
  const curved = Math.pow(t, 0.72);
  return config.epsilonStart + (config.epsilonEnd - config.epsilonStart) * curved;
}

function trainProfile(profile) {
  setSeed(config.seed + profile.seedOffset);
  const qTable = createQTable();
  const rewards = [];
  const visitedStates = new Set();

  for (let episode = 0; episode < config.episodesPerProfile; episode += 1) {
    const env = resetEnv(profile);
    const epsilon = epsilonForEpisode(episode);
    let episodeReward = 0;

    for (let step = 0; step < config.maxSteps && env.enemy.hpRatio > 0; step += 1) {
      const state = stateKey(env);
      visitedStates.add(state);
      const action = chooseAction(qTable, state, epsilon);
      const reward = stepEnv(env, action);
      const nextState = stateKey(env);
      visitedStates.add(nextState);
      const current = qTable[state][action];
      const nextBest = Math.max(...actions.map((candidate) => valuesFor(qTable, nextState)[candidate]));
      qTable[state][action] = current + config.alpha * (reward + config.gamma * nextBest - current);
      episodeReward += reward;
    }

    rewards.push(episodeReward);
  }

  const policy = Object.fromEntries(allStateKeys.map((state) => [state, bestAction(qTable, state)]));
  return { qTable, policy, rewards, visitedStates };
}

function evaluatePolicy(profile, qTable, mode = "trained") {
  setSeed(config.seed + profile.seedOffset + (mode === "random" ? 90000 : 45000));
  const actionCounts = Object.fromEntries(actions.map((action) => [action, 0]));
  const episodeRewards = [];
  const visitedStates = new Set();
  let survived = 0;
  let totalSteps = 0;

  for (let episode = 0; episode < config.evaluationEpisodes; episode += 1) {
    const env = resetEnv(profile);
    let episodeReward = 0;
    let steps = 0;
    for (; steps < config.maxSteps && env.enemy.hpRatio > 0; steps += 1) {
      const state = stateKey(env);
      visitedStates.add(state);
      const action = mode === "random"
        ? actions[Math.floor(random() * actions.length)]
        : bestAction(qTable, state);
      actionCounts[action] += 1;
      episodeReward += stepEnv(env, action);
    }
    episodeRewards.push(episodeReward);
    totalSteps += steps;
    if (env.enemy.hpRatio > 0) survived += 1;
  }

  return {
    mode,
    episodes: config.evaluationEpisodes,
    averageReward: Number(average(episodeRewards).toFixed(3)),
    survivalRate: Number((survived / config.evaluationEpisodes).toFixed(3)),
    averageSteps: Number((totalSteps / config.evaluationEpisodes).toFixed(1)),
    visitedStates: visitedStates.size,
    coverage: Number((visitedStates.size / allStateKeys.length).toFixed(3)),
    actionCounts,
  };
}

function actionCountsForPolicy(policy) {
  const counts = Object.fromEntries(actions.map((action) => [action, 0]));
  Object.values(policy).forEach((action) => {
    if (counts[action] != null) counts[action] += 1;
  });
  return counts;
}

function rewardCheckpoints(rewards, bucketSize = 1000) {
  const checkpoints = [];
  for (let start = 0; start < rewards.length; start += bucketSize) {
    const end = Math.min(rewards.length, start + bucketSize);
    checkpoints.push({
      episodes: `${start + 1}-${end}`,
      averageReward: Number(average(rewards.slice(start, end)).toFixed(3)),
    });
  }
  return checkpoints;
}

function policyConfidence(qTable) {
  return Object.fromEntries(allStateKeys.map((state) => {
    const values = valuesFor(qTable, state);
    const sorted = actions.map((action) => values[action]).sort((a, b) => b - a);
    return [state, Number((sorted[0] - sorted[1]).toFixed(3))];
  }));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const keyStates = [
  "far_high_ready_safe_ranged_clear_steady_open_alone",
  "far_high_cooling_safe_ranged_blocked_steady_open_alone",
  "mid_high_ready_safe_ranged_clear_steady_open_grouped",
  "mid_low_ready_danger_ranged_clear_hit_open_alone",
  "close_low_cooling_danger_melee_clear_hit_cornered_alone",
  "close_high_ready_safe_melee_clear_steady_open_grouped",
];

const policies = {};
const qTables = {};
const profileSummaries = {};

for (const profile of enemyProfiles) {
  const { qTable, policy, rewards, visitedStates } = trainProfile(profile);
  const evaluation = evaluatePolicy(profile, qTable, "trained");
  const randomBaseline = evaluatePolicy(profile, createQTable(), "random");
  policies[profile.id] = policy;
  qTables[profile.id] = qTable;
  profileSummaries[profile.id] = {
    id: profile.id,
    label: profile.label,
    style: profile.style,
    weights: profile.weights,
    averageRewardFirst500: Number(average(rewards.slice(0, 500)).toFixed(3)),
    averageRewardLast500: Number(average(rewards.slice(-500)).toFixed(3)),
    rewardImprovement: Number((average(rewards.slice(-500)) - average(rewards.slice(0, 500))).toFixed(3)),
    visitedStates: visitedStates.size,
    coverage: Number((visitedStates.size / allStateKeys.length).toFixed(3)),
    rewardCheckpoints: rewardCheckpoints(rewards),
    policyActionCounts: actionCountsForPolicy(policy),
    policyConfidence: policyConfidence(qTable),
    evaluation,
    randomBaseline,
    keyPolicy: Object.fromEntries(keyStates.map((state) => [state, policy[state]])),
  };
}

const defaultProfile = "merchant";
const summary = {
  generatedAt: new Date().toISOString(),
  algorithm: "tabular-q-learning",
  formula: "Q(s,a) = Q(s,a) + alpha * (reward + gamma * max(Q(s',a')) - Q(s,a))",
  config,
  stateDimensions,
  states: allStateKeys.length,
  actions,
  defaultProfile,
  profiles: Object.fromEntries(Object.entries(profileSummaries).map(([id, item]) => [id, {
    id: item.id,
    label: item.label,
    style: item.style,
    weights: item.weights,
    averageRewardFirst500: item.averageRewardFirst500,
    averageRewardLast500: item.averageRewardLast500,
    rewardImprovement: item.rewardImprovement,
    visitedStates: item.visitedStates,
    coverage: item.coverage,
    policyActionCounts: item.policyActionCounts,
    evaluation: item.evaluation,
    randomBaseline: item.randomBaseline,
    keyPolicy: item.keyPolicy,
  }])),
};

const output = `// Generated by scripts/train_q_learning.mjs. Do not edit by hand.
(function (global) {
  const data = global.ExamGameData ||= {};
  data.qLearningDefaultProfile = ${JSON.stringify(defaultProfile)};
  data.qLearningPolicies = ${JSON.stringify(policies, null, 2)};
  data.qLearningPolicy = data.qLearningPolicies[data.qLearningDefaultProfile];
  data.qLearningTrainingSummary = ${JSON.stringify(summary, null, 2)};
  data.qLearningRuntimeConfig = ${JSON.stringify({
    version: config.version,
    closeDistance: config.closeDistance,
    midDistance: config.midDistance,
    lowHpRatio: config.lowHpRatio,
    readyWindow: 0.18,
    hitMemorySeconds: 0.85,
    wallMargin: config.wallMargin,
    allyRadius: config.allyRadius,
    decisionMin: 0.38,
    decisionMax: 0.72,
    moveSpeed: 126,
    stateDimensions,
  }, null, 2)};
})(window);
`;

const report = {
  ...summary,
  profileDetails: profileSummaries,
  policies,
  qTables,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output, "utf8");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("Training finished.");
console.log(`Version: ${config.version}`);
console.log(`Profiles: ${enemyProfiles.map((item) => item.id).join(", ")}`);
console.log(`Episodes per profile: ${config.episodesPerProfile}`);
console.log(`States: ${allStateKeys.length}`);
console.log(`Actions: ${actions.length}`);
for (const [id, item] of Object.entries(profileSummaries)) {
  console.log(`${id}: reward ${item.averageRewardFirst500} -> ${item.averageRewardLast500}, eval ${item.evaluation.averageReward}, random ${item.randomBaseline.averageReward}, coverage ${item.coverage}`);
  Object.entries(item.keyPolicy).forEach(([state, action]) => {
    console.log(`  ${state} -> ${action}`);
  });
}
console.log(`Policy saved to ${outputPath}`);
console.log(`Report saved to ${reportPath}`);
